import { query, transaction } from '../database/connection';
import {
  InventoryTransaction,
  CreateTransactionDto,
  TransactionType,
  BulkTransferDto,
} from '../types/models';
import batchService from './batchService';
import { PoolClient } from 'pg';

export class TransactionService {
  /**
   * Create a new inventory transaction
   */
  async create(dto: CreateTransactionDto): Promise<InventoryTransaction> {
    const sql = `
      INSERT INTO inventory_transactions (
        transaction_type, item_id, batch_id, warehouse_id, quantity,
        unit_cost, reference_number, notes, created_by,
        transfer_from_warehouse_id, transfer_to_warehouse_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      dto.transaction_type,
      dto.item_id,
      dto.batch_id || null,
      dto.warehouse_id,
      dto.quantity,
      dto.unit_cost || null,
      dto.reference_number || null,
      dto.notes || null,
      dto.created_by || null,
      dto.transfer_from_warehouse_id || null,
      dto.transfer_to_warehouse_id || null,
      dto.metadata ? JSON.stringify(dto.metadata) : null,
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * Get transaction by ID
   */
  async getById(id: string): Promise<InventoryTransaction | null> {
    const sql = 'SELECT * FROM inventory_transactions WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all transactions with filtering
   */
  async getAll(options: {
    itemId?: string;
    warehouseId?: string;
    transactionType?: TransactionType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<InventoryTransaction[]> {
    let whereClauses: string[] = [];
    let values: any[] = [];
    let paramIndex = 1;

    if (options.itemId) {
      whereClauses.push(`item_id = $${paramIndex++}`);
      values.push(options.itemId);
    }

    if (options.warehouseId) {
      whereClauses.push(`warehouse_id = $${paramIndex++}`);
      values.push(options.warehouseId);
    }

    if (options.transactionType) {
      whereClauses.push(`transaction_type = $${paramIndex++}`);
      values.push(options.transactionType);
    }

    if (options.startDate) {
      whereClauses.push(`created_at >= $${paramIndex++}`);
      values.push(options.startDate);
    }

    if (options.endDate) {
      whereClauses.push(`created_at <= $${paramIndex++}`);
      values.push(options.endDate);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let sql = `
      SELECT * FROM inventory_transactions
      ${whereClause}
      ORDER BY created_at DESC
    `;

    if (options.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      values.push(options.limit);
    }

    if (options.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      values.push(options.offset);
    }

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * Record inbound transaction (receiving stock)
   */
  async recordInbound(
    itemId: string,
    batchId: string,
    warehouseId: string,
    quantity: number,
    unitCost?: number,
    referenceNumber?: string,
    createdBy?: string,
    notes?: string
  ): Promise<InventoryTransaction> {
    return transaction(async (client: PoolClient) => {
      // Get batch info to update quantity
      const batchSql = 'SELECT version FROM batches WHERE id = $1';
      const batchResult = await client.query(batchSql, [batchId]);

      if (batchResult.rows.length === 0) {
        throw new Error('Batch not found');
      }

      const version = batchResult.rows[0].version;

      // Update batch quantity
      await batchService.adjustQuantity(batchId, quantity, version);

      // Create transaction record
      const dto: CreateTransactionDto = {
        transaction_type: TransactionType.INBOUND,
        item_id: itemId,
        batch_id: batchId,
        warehouse_id: warehouseId,
        quantity,
        unit_cost: unitCost,
        reference_number: referenceNumber,
        created_by: createdBy,
        notes,
      };

      return this.create(dto);
    });
  }

  /**
   * Record outbound transaction (shipping/selling stock)
   */
  async recordOutbound(
    itemId: string,
    batchId: string,
    warehouseId: string,
    quantity: number,
    referenceNumber?: string,
    createdBy?: string,
    notes?: string
  ): Promise<InventoryTransaction> {
    return transaction(async (client: PoolClient) => {
      // Get batch info
      const batchSql = 'SELECT version, quantity FROM batches WHERE id = $1';
      const batchResult = await client.query(batchSql, [batchId]);

      if (batchResult.rows.length === 0) {
        throw new Error('Batch not found');
      }

      const version = batchResult.rows[0].version;
      const currentQuantity = batchResult.rows[0].quantity;

      if (currentQuantity < quantity) {
        throw new Error('Insufficient quantity in batch');
      }

      // Decrease batch quantity
      await batchService.adjustQuantity(batchId, -quantity, version);

      // Create transaction record
      const dto: CreateTransactionDto = {
        transaction_type: TransactionType.OUTBOUND,
        item_id: itemId,
        batch_id: batchId,
        warehouse_id: warehouseId,
        quantity: -quantity, // Negative for outbound
        reference_number: referenceNumber,
        created_by: createdBy,
        notes,
      };

      return this.create(dto);
    });
  }

  /**
   * Record transfer between warehouses
   */
  async recordTransfer(dto: BulkTransferDto): Promise<{
    outboundTransaction: InventoryTransaction;
    inboundTransaction: InventoryTransaction;
  }> {
    return transaction(async (client: PoolClient) => {
      // Get batch info
      const batchSql = 'SELECT version, quantity, warehouse_id FROM batches WHERE id = $1';
      const batchResult = await client.query(batchSql, [dto.batch_id]);

      if (batchResult.rows.length === 0) {
        throw new Error('Batch not found');
      }

      const version = batchResult.rows[0].version;
      const currentQuantity = batchResult.rows[0].quantity;
      const batchWarehouseId = batchResult.rows[0].warehouse_id;

      // Verify batch is in the source warehouse
      if (batchWarehouseId !== dto.from_warehouse_id) {
        throw new Error('Batch is not in the source warehouse');
      }

      if (currentQuantity < dto.quantity) {
        throw new Error('Insufficient quantity in batch');
      }

      // Decrease quantity in source batch
      await batchService.adjustQuantity(dto.batch_id, -dto.quantity, version);

      // Record outbound transaction from source warehouse
      const outboundDto: CreateTransactionDto = {
        transaction_type: TransactionType.TRANSFER,
        item_id: dto.item_id,
        batch_id: dto.batch_id,
        warehouse_id: dto.from_warehouse_id,
        quantity: -dto.quantity,
        created_by: dto.created_by,
        notes: dto.notes,
        transfer_from_warehouse_id: dto.from_warehouse_id,
        transfer_to_warehouse_id: dto.to_warehouse_id,
      };

      const outboundTransaction = await this.create(outboundDto);

      // Create or update batch in destination warehouse
      // For simplicity, we'll create a new batch in the destination
      const sourceBatch = await batchService.getById(dto.batch_id);
      if (!sourceBatch) {
        throw new Error('Source batch not found');
      }

      const destBatch = await batchService.create({
        item_id: dto.item_id,
        warehouse_id: dto.to_warehouse_id,
        batch_number: sourceBatch.batch_number + '-TRANSFER',
        quantity: dto.quantity,
        manufacturing_date: sourceBatch.manufacturing_date,
        expiry_date: sourceBatch.expiry_date,
        supplier: sourceBatch.supplier,
        cost_per_unit: sourceBatch.cost_per_unit,
      });

      // Record inbound transaction to destination warehouse
      const inboundDto: CreateTransactionDto = {
        transaction_type: TransactionType.TRANSFER,
        item_id: dto.item_id,
        batch_id: destBatch.id,
        warehouse_id: dto.to_warehouse_id,
        quantity: dto.quantity,
        created_by: dto.created_by,
        notes: dto.notes,
        transfer_from_warehouse_id: dto.from_warehouse_id,
        transfer_to_warehouse_id: dto.to_warehouse_id,
      };

      const inboundTransaction = await this.create(inboundDto);

      return { outboundTransaction, inboundTransaction };
    });
  }

  /**
   * Record adjustment (damage, loss, found, etc.)
   */
  async recordAdjustment(
    itemId: string,
    batchId: string,
    warehouseId: string,
    quantityChange: number,
    reason: string,
    createdBy?: string
  ): Promise<InventoryTransaction> {
    return transaction(async (client: PoolClient) => {
      // Get batch info
      const batchSql = 'SELECT version, quantity FROM batches WHERE id = $1';
      const batchResult = await client.query(batchSql, [batchId]);

      if (batchResult.rows.length === 0) {
        throw new Error('Batch not found');
      }

      const version = batchResult.rows[0].version;
      const currentQuantity = batchResult.rows[0].quantity;

      // Check if adjustment would result in negative quantity
      if (currentQuantity + quantityChange < 0) {
        throw new Error('Adjustment would result in negative quantity');
      }

      // Update batch quantity
      await batchService.adjustQuantity(batchId, quantityChange, version);

      // Create transaction record
      const dto: CreateTransactionDto = {
        transaction_type: TransactionType.ADJUSTMENT,
        item_id: itemId,
        batch_id: batchId,
        warehouse_id: warehouseId,
        quantity: quantityChange,
        created_by: createdBy,
        notes: reason,
      };

      return this.create(dto);
    });
  }

  /**
   * Get transaction history for an item
   */
  async getItemHistory(itemId: string, limit: number = 100): Promise<any[]> {
    const sql = `
      SELECT
        t.*,
        i.name as item_name,
        i.sku,
        w.name as warehouse_name,
        b.batch_number
      FROM inventory_transactions t
      INNER JOIN items i ON t.item_id = i.id
      INNER JOIN warehouses w ON t.warehouse_id = w.id
      LEFT JOIN batches b ON t.batch_id = b.id
      WHERE t.item_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2
    `;
    const result = await query(sql, [itemId, limit]);
    return result.rows;
  }

  /**
   * Get transaction summary by type
   */
  async getTransactionSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ transaction_type: string; total_transactions: number; total_quantity: number }>> {
    let whereClauses: string[] = [];
    let values: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereClauses.push(`created_at >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      whereClauses.push(`created_at <= $${paramIndex++}`);
      values.push(endDate);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT
        transaction_type,
        COUNT(*) as total_transactions,
        SUM(ABS(quantity)) as total_quantity
      FROM inventory_transactions
      ${whereClause}
      GROUP BY transaction_type
      ORDER BY total_transactions DESC
    `;

    const result = await query(sql, values);
    return result.rows;
  }
}

export default new TransactionService();
