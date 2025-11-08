import { query } from '../database/connection';
import { LowStockAlert, AlertStatus, AcknowledgeAlertDto } from '../types/models';

export class AlertService {
  /**
   * Get all active low-stock alerts
   */
  async getActiveAlerts(): Promise<any[]> {
    const sql = `
      SELECT
        a.*,
        i.sku,
        i.name as item_name,
        i.category,
        w.name as warehouse_name,
        w.location as warehouse_location
      FROM low_stock_alerts a
      INNER JOIN items i ON a.item_id = i.id
      INNER JOIN warehouses w ON a.warehouse_id = w.id
      WHERE a.alert_status = 'ACTIVE'
      ORDER BY a.created_at DESC
    `;
    const result = await query(sql);
    return result.rows;
  }

  /**
   * Get all alerts (with optional filtering)
   */
  async getAll(options: {
    itemId?: string;
    warehouseId?: string;
    status?: AlertStatus;
  }): Promise<any[]> {
    let whereClauses: string[] = [];
    let values: any[] = [];
    let paramIndex = 1;

    if (options.itemId) {
      whereClauses.push(`a.item_id = $${paramIndex++}`);
      values.push(options.itemId);
    }

    if (options.warehouseId) {
      whereClauses.push(`a.warehouse_id = $${paramIndex++}`);
      values.push(options.warehouseId);
    }

    if (options.status) {
      whereClauses.push(`a.alert_status = $${paramIndex++}`);
      values.push(options.status);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT
        a.*,
        i.sku,
        i.name as item_name,
        i.category,
        w.name as warehouse_name,
        w.location as warehouse_location
      FROM low_stock_alerts a
      INNER JOIN items i ON a.item_id = i.id
      INNER JOIN warehouses w ON a.warehouse_id = w.id
      ${whereClause}
      ORDER BY a.created_at DESC
    `;

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * Get alert by ID
   */
  async getById(id: string): Promise<LowStockAlert | null> {
    const sql = 'SELECT * FROM low_stock_alerts WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledge(id: string, dto: AcknowledgeAlertDto): Promise<LowStockAlert> {
    const sql = `
      UPDATE low_stock_alerts
      SET alert_status = 'ACKNOWLEDGED',
          acknowledged_at = CURRENT_TIMESTAMP,
          acknowledged_by = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [dto.acknowledged_by, id]);

    if (result.rows.length === 0) {
      throw new Error('Alert not found');
    }

    return result.rows[0];
  }

  /**
   * Resolve an alert (mark as resolved when stock is replenished)
   */
  async resolve(id: string): Promise<LowStockAlert> {
    const sql = `
      UPDATE low_stock_alerts
      SET alert_status = 'RESOLVED',
          resolved_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      throw new Error('Alert not found');
    }

    return result.rows[0];
  }

  /**
   * Manually trigger low-stock check for all items
   */
  async checkAllLowStock(): Promise<void> {
    const sql = `
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
    await query(sql);
  }

  /**
   * Auto-resolve alerts where stock has been replenished
   */
  async autoResolveReplenishedAlerts(): Promise<number> {
    const sql = `
      UPDATE low_stock_alerts a
      SET alert_status = 'RESOLVED',
          resolved_at = CURRENT_TIMESTAMP
      FROM inventory_summary inv
      WHERE a.item_id = inv.item_id
        AND a.warehouse_id = inv.warehouse_id
        AND a.alert_status = 'ACTIVE'
        AND inv.is_low_stock = false
      RETURNING a.id
    `;
    const result = await query(sql);
    return result.rowCount ?? 0;
  }

  /**
   * Get alert statistics
   */
  async getStatistics(): Promise<{
    total_active: number;
    total_acknowledged: number;
    total_resolved: number;
    total: number;
  }> {
    const sql = `
      SELECT
        COUNT(*) FILTER (WHERE alert_status = 'ACTIVE') as total_active,
        COUNT(*) FILTER (WHERE alert_status = 'ACKNOWLEDGED') as total_acknowledged,
        COUNT(*) FILTER (WHERE alert_status = 'RESOLVED') as total_resolved,
        COUNT(*) as total
      FROM low_stock_alerts
    `;
    const result = await query(sql);
    return result.rows[0];
  }

  /**
   * Get critical alerts (items with 0 stock)
   */
  async getCriticalAlerts(): Promise<any[]> {
    const sql = `
      SELECT
        a.*,
        i.sku,
        i.name as item_name,
        i.category,
        w.name as warehouse_name,
        w.location as warehouse_location
      FROM low_stock_alerts a
      INNER JOIN items i ON a.item_id = i.id
      INNER JOIN warehouses w ON a.warehouse_id = w.id
      WHERE a.alert_status = 'ACTIVE' AND a.current_quantity = 0
      ORDER BY a.created_at DESC
    `;
    const result = await query(sql);
    return result.rows;
  }

  /**
   * Delete old resolved alerts (cleanup)
   */
  async deleteOldResolvedAlerts(daysOld: number = 90): Promise<number> {
    const sql = `
      DELETE FROM low_stock_alerts
      WHERE alert_status = 'RESOLVED'
        AND resolved_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
    `;
    const result = await query(sql, [daysOld]);
    return result.rowCount ?? 0;
  }
}

export default new AlertService();
