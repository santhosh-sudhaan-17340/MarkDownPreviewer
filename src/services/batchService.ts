import { query, transaction } from '../database/connection';
import {
  Batch,
  CreateBatchDto,
  UpdateBatchDto,
  OptimisticLockError,
  BulkUpdateBatchesDto,
} from '../types/models';
import { PoolClient } from 'pg';

export class BatchService {
  /**
   * Create a new batch
   */
  async create(dto: CreateBatchDto): Promise<Batch> {
    const sql = `
      INSERT INTO batches (
        item_id, warehouse_id, batch_number, quantity,
        manufacturing_date, expiry_date, supplier, cost_per_unit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      dto.item_id,
      dto.warehouse_id,
      dto.batch_number,
      dto.quantity,
      dto.manufacturing_date || null,
      dto.expiry_date || null,
      dto.supplier || null,
      dto.cost_per_unit || null,
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * Get batch by ID
   */
  async getById(id: string): Promise<Batch | null> {
    const sql = 'SELECT * FROM batches WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get batch by batch number
   */
  async getByBatchNumber(
    batchNumber: string,
    itemId?: string,
    warehouseId?: string
  ): Promise<Batch[]> {
    let sql = 'SELECT * FROM batches WHERE batch_number = $1';
    const values: any[] = [batchNumber];

    if (itemId) {
      sql += ' AND item_id = $2';
      values.push(itemId);
    }

    if (warehouseId) {
      const paramIndex = values.length + 1;
      sql += ` AND warehouse_id = $${paramIndex}`;
      values.push(warehouseId);
    }

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * Get all batches for an item
   */
  async getByItemId(itemId: string): Promise<Batch[]> {
    const sql = `
      SELECT * FROM batches
      WHERE item_id = $1
      ORDER BY expiry_date ASC NULLS LAST, created_at ASC
    `;
    const result = await query(sql, [itemId]);
    return result.rows;
  }

  /**
   * Get all batches in a warehouse
   */
  async getByWarehouseId(warehouseId: string): Promise<Batch[]> {
    const sql = `
      SELECT b.*, i.name as item_name, i.sku
      FROM batches b
      INNER JOIN items i ON b.item_id = i.id
      WHERE b.warehouse_id = $1
      ORDER BY b.created_at DESC
    `;
    const result = await query(sql, [warehouseId]);
    return result.rows;
  }

  /**
   * Get batches expiring soon
   */
  async getExpiringBatches(daysUntilExpiry: number = 30): Promise<Batch[]> {
    const sql = `
      SELECT b.*, i.name as item_name, i.sku, w.name as warehouse_name
      FROM batches b
      INNER JOIN items i ON b.item_id = i.id
      INNER JOIN warehouses w ON b.warehouse_id = w.id
      WHERE b.expiry_date IS NOT NULL
        AND b.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $1
        AND b.expiry_date > CURRENT_DATE
        AND b.quantity > 0
      ORDER BY b.expiry_date ASC
    `;
    const result = await query(sql, [daysUntilExpiry]);
    return result.rows;
  }

  /**
   * Get expired batches
   */
  async getExpiredBatches(): Promise<Batch[]> {
    const sql = `
      SELECT b.*, i.name as item_name, i.sku, w.name as warehouse_name
      FROM batches b
      INNER JOIN items i ON b.item_id = i.id
      INNER JOIN warehouses w ON b.warehouse_id = w.id
      WHERE b.expiry_date IS NOT NULL
        AND b.expiry_date <= CURRENT_DATE
        AND b.quantity > 0
      ORDER BY b.expiry_date DESC
    `;
    const result = await query(sql);
    return result.rows;
  }

  /**
   * Update batch with optimistic locking
   */
  async update(id: string, dto: UpdateBatchDto): Promise<Batch> {
    return transaction(async (client: PoolClient) => {
      // Check current version
      const checkSql = 'SELECT version FROM batches WHERE id = $1 FOR UPDATE';
      const checkResult = await client.query(checkSql, [id]);

      if (checkResult.rows.length === 0) {
        throw new Error('Batch not found');
      }

      const currentVersion = checkResult.rows[0].version;

      // Verify version matches (optimistic locking)
      if (currentVersion !== dto.version) {
        throw new OptimisticLockError(
          `Batch was modified by another process. Expected version ${dto.version}, but current version is ${currentVersion}`
        );
      }

      // Build dynamic UPDATE query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (dto.quantity !== undefined) {
        updateFields.push(`quantity = $${paramIndex++}`);
        values.push(dto.quantity);
      }
      if (dto.manufacturing_date !== undefined) {
        updateFields.push(`manufacturing_date = $${paramIndex++}`);
        values.push(dto.manufacturing_date);
      }
      if (dto.expiry_date !== undefined) {
        updateFields.push(`expiry_date = $${paramIndex++}`);
        values.push(dto.expiry_date);
      }
      if (dto.supplier !== undefined) {
        updateFields.push(`supplier = $${paramIndex++}`);
        values.push(dto.supplier);
      }
      if (dto.cost_per_unit !== undefined) {
        updateFields.push(`cost_per_unit = $${paramIndex++}`);
        values.push(dto.cost_per_unit);
      }

      // Increment version
      updateFields.push(`version = version + 1`);

      const updateSql = `
        UPDATE batches
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      values.push(id);

      const result = await client.query(updateSql, values);
      return result.rows[0];
    });
  }

  /**
   * Delete batch
   */
  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM batches WHERE id = $1';
    const result = await query(sql, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Adjust batch quantity (with optimistic locking)
   */
  async adjustQuantity(
    id: string,
    quantityChange: number,
    version: number
  ): Promise<Batch> {
    return transaction(async (client: PoolClient) => {
      // Check current version and quantity
      const checkSql = 'SELECT version, quantity FROM batches WHERE id = $1 FOR UPDATE';
      const checkResult = await client.query(checkSql, [id]);

      if (checkResult.rows.length === 0) {
        throw new Error('Batch not found');
      }

      const currentVersion = checkResult.rows[0].version;
      const currentQuantity = checkResult.rows[0].quantity;

      // Verify version matches (optimistic locking)
      if (currentVersion !== version) {
        throw new OptimisticLockError(
          `Batch was modified by another process. Expected version ${version}, but current version is ${currentVersion}`
        );
      }

      const newQuantity = currentQuantity + quantityChange;

      if (newQuantity < 0) {
        throw new Error('Insufficient quantity in batch');
      }

      const updateSql = `
        UPDATE batches
        SET quantity = $1, version = version + 1
        WHERE id = $2
        RETURNING *
      `;

      const result = await client.query(updateSql, [newQuantity, id]);
      return result.rows[0];
    });
  }

  /**
   * Bulk update batch quantities (high performance)
   */
  async bulkUpdateQuantities(dto: BulkUpdateBatchesDto): Promise<Batch[]> {
    return transaction(async (client: PoolClient) => {
      const updatedBatches: Batch[] = [];

      // Process in batches for better performance
      for (const update of dto.updates) {
        const batch = await this.adjustQuantity(update.id, update.quantity, update.version);
        updatedBatches.push(batch);
      }

      return updatedBatches;
    });
  }

  /**
   * Get total quantity for an item across all batches
   */
  async getTotalQuantity(itemId: string, warehouseId?: string): Promise<number> {
    let sql = `
      SELECT COALESCE(SUM(quantity), 0) as total
      FROM batches
      WHERE item_id = $1
    `;
    const values: any[] = [itemId];

    if (warehouseId) {
      sql += ' AND warehouse_id = $2';
      values.push(warehouseId);
    }

    const result = await query(sql, values);
    return parseInt(result.rows[0].total);
  }

  /**
   * Get batch details with item and warehouse info
   */
  async getBatchWithDetails(id: string): Promise<any> {
    const sql = `
      SELECT
        b.*,
        i.sku, i.name as item_name, i.category,
        w.name as warehouse_name, w.location as warehouse_location
      FROM batches b
      INNER JOIN items i ON b.item_id = i.id
      INNER JOIN warehouses w ON b.warehouse_id = w.id
      WHERE b.id = $1
    `;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get batches with FIFO order (First In, First Out)
   * Useful for picking batches for shipment
   */
  async getBatchesFIFO(itemId: string, warehouseId: string): Promise<Batch[]> {
    const sql = `
      SELECT * FROM batches
      WHERE item_id = $1 AND warehouse_id = $2 AND quantity > 0
      ORDER BY
        CASE WHEN expiry_date IS NOT NULL THEN expiry_date END ASC NULLS LAST,
        created_at ASC
    `;
    const result = await query(sql, [itemId, warehouseId]);
    return result.rows;
  }

  /**
   * Get batches with FEFO order (First Expired, First Out)
   * Prioritizes batches by expiration date
   */
  async getBatchesFEFO(itemId: string, warehouseId: string): Promise<Batch[]> {
    const sql = `
      SELECT * FROM batches
      WHERE item_id = $1 AND warehouse_id = $2 AND quantity > 0
      ORDER BY expiry_date ASC NULLS LAST, created_at ASC
    `;
    const result = await query(sql, [itemId, warehouseId]);
    return result.rows;
  }
}

export default new BatchService();
