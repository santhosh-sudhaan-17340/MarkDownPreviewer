import { query, transaction } from '../database/connection';
import { PoolClient } from 'pg';
import { CreateItemDto, CreateBatchDto, Item, Batch } from '../types/models';

export class BulkOperationsService {
  /**
   * Bulk create items using a single SQL statement for better performance
   */
  async bulkCreateItems(items: CreateItemDto[]): Promise<Item[]> {
    if (items.length === 0) {
      return [];
    }

    // Build bulk INSERT statement
    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    let paramIndex = 1;

    items.forEach((item) => {
      valuePlaceholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`
      );
      values.push(
        item.sku,
        item.name,
        item.description || null,
        item.category || null,
        item.unit_price,
        item.reorder_level || 10,
        item.reorder_quantity || 50
      );
      paramIndex += 7;
    });

    const sql = `
      INSERT INTO items (
        sku, name, description, category, unit_price, reorder_level, reorder_quantity
      ) VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT (sku) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        unit_price = EXCLUDED.unit_price,
        reorder_level = EXCLUDED.reorder_level,
        reorder_quantity = EXCLUDED.reorder_quantity
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * Bulk create batches
   */
  async bulkCreateBatches(batches: CreateBatchDto[]): Promise<Batch[]> {
    if (batches.length === 0) {
      return [];
    }

    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    let paramIndex = 1;

    batches.forEach((batch) => {
      valuePlaceholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`
      );
      values.push(
        batch.item_id,
        batch.warehouse_id,
        batch.batch_number,
        batch.quantity,
        batch.manufacturing_date || null,
        batch.expiry_date || null,
        batch.supplier || null,
        batch.cost_per_unit || null
      );
      paramIndex += 8;
    });

    const sql = `
      INSERT INTO batches (
        item_id, warehouse_id, batch_number, quantity,
        manufacturing_date, expiry_date, supplier, cost_per_unit
      ) VALUES ${valuePlaceholders.join(', ')}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * Bulk update item prices (common operation for price changes)
   */
  async bulkUpdateItemPrices(
    updates: Array<{ sku: string; unit_price: number }>
  ): Promise<number> {
    return transaction(async (client: PoolClient) => {
      let totalUpdated = 0;

      // Use CASE statement for efficient bulk update
      if (updates.length === 0) {
        return 0;
      }

      const skus = updates.map((u) => u.sku);
      const values: any[] = [skus];
      let paramIndex = 2;

      // Build CASE statement for unit_price
      let caseStatement = 'CASE sku ';
      updates.forEach((update) => {
        caseStatement += `WHEN $${paramIndex} THEN $${paramIndex + 1} `;
        values.push(update.sku, update.unit_price);
        paramIndex += 2;
      });
      caseStatement += 'END';

      const sql = `
        UPDATE items
        SET unit_price = ${caseStatement},
            version = version + 1
        WHERE sku = ANY($1)
      `;

      const result = await client.query(sql, values);
      totalUpdated = result.rowCount ?? 0;

      return totalUpdated;
    });
  }

  /**
   * Bulk update batch quantities (optimized for large operations)
   */
  async bulkUpdateBatchQuantities(
    updates: Array<{ id: string; quantity_change: number }>
  ): Promise<number> {
    return transaction(async (client: PoolClient) => {
      if (updates.length === 0) {
        return 0;
      }

      const ids = updates.map((u) => u.id);
      const values: any[] = [ids];
      let paramIndex = 2;

      // Build CASE statement for quantity change
      let caseStatement = 'CASE id ';
      updates.forEach((update) => {
        caseStatement += `WHEN $${paramIndex}::uuid THEN quantity + $${paramIndex + 1} `;
        values.push(update.id, update.quantity_change);
        paramIndex += 2;
      });
      caseStatement += 'END';

      const sql = `
        UPDATE batches
        SET quantity = ${caseStatement},
            version = version + 1
        WHERE id = ANY($1)
          AND (${caseStatement}) >= 0
      `;

      const result = await client.query(sql, values);
      return result.rowCount ?? 0;
    });
  }

  /**
   * Bulk delete expired batches
   */
  async bulkDeleteExpiredBatches(): Promise<number> {
    const sql = `
      DELETE FROM batches
      WHERE expiry_date IS NOT NULL
        AND expiry_date <= CURRENT_DATE
        AND quantity = 0
    `;
    const result = await query(sql);
    return result.rowCount ?? 0;
  }

  /**
   * Bulk export inventory data (optimized query)
   */
  async exportInventoryData(): Promise<any[]> {
    const sql = `
      SELECT
        i.id as item_id,
        i.sku,
        i.name as item_name,
        i.category,
        i.unit_price,
        w.id as warehouse_id,
        w.name as warehouse_name,
        w.location as warehouse_location,
        b.id as batch_id,
        b.batch_number,
        b.quantity,
        b.manufacturing_date,
        b.expiry_date,
        b.supplier,
        b.cost_per_unit,
        b.created_at as batch_created_at
      FROM items i
      CROSS JOIN warehouses w
      LEFT JOIN batches b ON b.item_id = i.id AND b.warehouse_id = w.id
      WHERE i.is_active = true AND w.is_active = true
      ORDER BY i.name, w.name, b.created_at
    `;
    const result = await query(sql);
    return result.rows;
  }

  /**
   * Bulk import items from CSV data
   */
  async bulkImportFromCSV(csvData: Array<{
    sku: string;
    name: string;
    description?: string;
    category?: string;
    unit_price: number;
    reorder_level?: number;
    reorder_quantity?: number;
  }>): Promise<{ created: number; updated: number; errors: any[] }> {
    const errors: any[] = [];
    let created = 0;
    let updated = 0;

    return transaction(async (client: PoolClient) => {
      for (const row of csvData) {
        try {
          const checkSql = 'SELECT id FROM items WHERE sku = $1';
          const checkResult = await client.query(checkSql, [row.sku]);

          if (checkResult.rows.length > 0) {
            // Update existing
            const updateSql = `
              UPDATE items
              SET name = $1, description = $2, category = $3,
                  unit_price = $4, reorder_level = $5, reorder_quantity = $6,
                  version = version + 1
              WHERE sku = $7
            `;
            await client.query(updateSql, [
              row.name,
              row.description || null,
              row.category || null,
              row.unit_price,
              row.reorder_level || 10,
              row.reorder_quantity || 50,
              row.sku,
            ]);
            updated++;
          } else {
            // Insert new
            const insertSql = `
              INSERT INTO items (sku, name, description, category, unit_price, reorder_level, reorder_quantity)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            await client.query(insertSql, [
              row.sku,
              row.name,
              row.description || null,
              row.category || null,
              row.unit_price,
              row.reorder_level || 10,
              row.reorder_quantity || 50,
            ]);
            created++;
          }
        } catch (error: any) {
          errors.push({ row, error: error.message });
        }
      }

      return { created, updated, errors };
    });
  }

  /**
   * Optimize database (VACUUM and ANALYZE)
   * Useful for maintaining query performance
   */
  async optimizeDatabase(): Promise<void> {
    // Note: VACUUM cannot run inside a transaction
    await query('VACUUM ANALYZE items');
    await query('VACUUM ANALYZE batches');
    await query('VACUUM ANALYZE inventory_transactions');
    await query('VACUUM ANALYZE warehouses');
    await query('VACUUM ANALYZE low_stock_alerts');
  }

  /**
   * Get database statistics
   */
  async getDatabaseStatistics(): Promise<{
    total_items: number;
    total_batches: number;
    total_transactions: number;
    total_warehouses: number;
    total_alerts: number;
    total_inventory_value: number;
  }> {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM items WHERE is_active = true) as total_items,
        (SELECT COUNT(*) FROM batches) as total_batches,
        (SELECT COUNT(*) FROM inventory_transactions) as total_transactions,
        (SELECT COUNT(*) FROM warehouses WHERE is_active = true) as total_warehouses,
        (SELECT COUNT(*) FROM low_stock_alerts WHERE alert_status = 'ACTIVE') as total_alerts,
        (SELECT COALESCE(SUM(b.quantity * i.unit_price), 0)
         FROM batches b
         INNER JOIN items i ON b.item_id = i.id) as total_inventory_value
    `;
    const result = await query(sql);
    return result.rows[0];
  }

  /**
   * Bulk recalculate low stock alerts
   */
  async recalculateLowStockAlerts(): Promise<number> {
    return transaction(async (client: PoolClient) => {
      // First, resolve alerts that are no longer low stock
      await client.query(`
        UPDATE low_stock_alerts a
        SET alert_status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP
        FROM inventory_summary inv
        WHERE a.item_id = inv.item_id
          AND a.warehouse_id = inv.warehouse_id
          AND a.alert_status = 'ACTIVE'
          AND inv.is_low_stock = false
      `);

      // Then, create new alerts for low stock items
      const insertSql = `
        INSERT INTO low_stock_alerts (item_id, warehouse_id, current_quantity, reorder_level)
        SELECT
          inv.item_id,
          inv.warehouse_id,
          inv.total_quantity,
          inv.reorder_level
        FROM inventory_summary inv
        WHERE inv.is_low_stock = true
        ON CONFLICT DO NOTHING
      `;
      const result = await client.query(insertSql);
      return result.rowCount ?? 0;
    });
  }
}

export default new BulkOperationsService();
