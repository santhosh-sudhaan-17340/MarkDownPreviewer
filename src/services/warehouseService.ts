import { query, transaction } from '../database/connection';
import {
  Warehouse,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  OptimisticLockError,
  InventorySummary,
} from '../types/models';
import { PoolClient } from 'pg';

export class WarehouseService {
  /**
   * Create a new warehouse
   */
  async create(dto: CreateWarehouseDto): Promise<Warehouse> {
    const sql = `
      INSERT INTO warehouses (
        name, location, capacity, manager_name, contact_email, contact_phone
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      dto.name,
      dto.location,
      dto.capacity,
      dto.manager_name || null,
      dto.contact_email || null,
      dto.contact_phone || null,
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * Get warehouse by ID
   */
  async getById(id: string): Promise<Warehouse | null> {
    const sql = 'SELECT * FROM warehouses WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all warehouses
   */
  async getAll(activeOnly: boolean = false): Promise<Warehouse[]> {
    let sql = 'SELECT * FROM warehouses';

    if (activeOnly) {
      sql += ' WHERE is_active = true';
    }

    sql += ' ORDER BY name';

    const result = await query(sql);
    return result.rows;
  }

  /**
   * Update warehouse with optimistic locking
   */
  async update(id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    return transaction(async (client: PoolClient) => {
      // Check current version
      const checkSql = 'SELECT version FROM warehouses WHERE id = $1 FOR UPDATE';
      const checkResult = await client.query(checkSql, [id]);

      if (checkResult.rows.length === 0) {
        throw new Error('Warehouse not found');
      }

      const currentVersion = checkResult.rows[0].version;

      // Verify version matches (optimistic locking)
      if (currentVersion !== dto.version) {
        throw new OptimisticLockError(
          `Warehouse was modified by another process. Expected version ${dto.version}, but current version is ${currentVersion}`
        );
      }

      // Build dynamic UPDATE query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (dto.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(dto.name);
      }
      if (dto.location !== undefined) {
        updateFields.push(`location = $${paramIndex++}`);
        values.push(dto.location);
      }
      if (dto.capacity !== undefined) {
        updateFields.push(`capacity = $${paramIndex++}`);
        values.push(dto.capacity);
      }
      if (dto.manager_name !== undefined) {
        updateFields.push(`manager_name = $${paramIndex++}`);
        values.push(dto.manager_name);
      }
      if (dto.contact_email !== undefined) {
        updateFields.push(`contact_email = $${paramIndex++}`);
        values.push(dto.contact_email);
      }
      if (dto.contact_phone !== undefined) {
        updateFields.push(`contact_phone = $${paramIndex++}`);
        values.push(dto.contact_phone);
      }
      if (dto.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(dto.is_active);
      }

      // Increment version
      updateFields.push(`version = version + 1`);

      const updateSql = `
        UPDATE warehouses
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
   * Soft delete warehouse
   */
  async delete(id: string): Promise<boolean> {
    const sql = 'UPDATE warehouses SET is_active = false WHERE id = $1';
    const result = await query(sql, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Hard delete warehouse
   */
  async hardDelete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM warehouses WHERE id = $1';
    const result = await query(sql, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get warehouse inventory summary
   */
  async getInventorySummary(warehouseId: string): Promise<InventorySummary[]> {
    const sql = `
      SELECT * FROM inventory_summary
      WHERE warehouse_id = $1
      ORDER BY item_name
    `;
    const result = await query(sql, [warehouseId]);
    return result.rows;
  }

  /**
   * Get warehouse capacity utilization
   */
  async getCapacityUtilization(warehouseId: string): Promise<{
    warehouse_id: string;
    warehouse_name: string;
    capacity: number;
    total_items: number;
    utilization_percentage: number;
  }> {
    const sql = `
      SELECT
        w.id as warehouse_id,
        w.name as warehouse_name,
        w.capacity,
        COALESCE(SUM(b.quantity), 0) as total_items,
        CASE
          WHEN w.capacity > 0 THEN (COALESCE(SUM(b.quantity), 0)::DECIMAL / w.capacity * 100)
          ELSE 0
        END as utilization_percentage
      FROM warehouses w
      LEFT JOIN batches b ON w.id = b.warehouse_id
      WHERE w.id = $1
      GROUP BY w.id, w.name, w.capacity
    `;
    const result = await query(sql, [warehouseId]);
    return result.rows[0];
  }

  /**
   * Get all warehouses with capacity utilization
   */
  async getAllWithUtilization(): Promise<any[]> {
    const sql = `
      SELECT
        w.*,
        COALESCE(SUM(b.quantity), 0) as total_items,
        CASE
          WHEN w.capacity > 0 THEN (COALESCE(SUM(b.quantity), 0)::DECIMAL / w.capacity * 100)
          ELSE 0
        END as utilization_percentage
      FROM warehouses w
      LEFT JOIN batches b ON w.id = b.warehouse_id
      WHERE w.is_active = true
      GROUP BY w.id
      ORDER BY w.name
    `;
    const result = await query(sql);
    return result.rows;
  }

  /**
   * Get warehouses near capacity (> 80% utilized)
   */
  async getWarehousesNearCapacity(threshold: number = 80): Promise<any[]> {
    const sql = `
      SELECT
        w.*,
        COALESCE(SUM(b.quantity), 0) as total_items,
        (COALESCE(SUM(b.quantity), 0)::DECIMAL / w.capacity * 100) as utilization_percentage
      FROM warehouses w
      LEFT JOIN batches b ON w.id = b.warehouse_id
      WHERE w.is_active = true
      GROUP BY w.id
      HAVING (COALESCE(SUM(b.quantity), 0)::DECIMAL / w.capacity * 100) >= $1
      ORDER BY utilization_percentage DESC
    `;
    const result = await query(sql, [threshold]);
    return result.rows;
  }
}

export default new WarehouseService();
