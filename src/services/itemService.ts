import { query, transaction } from '../database/connection';
import {
  Item,
  CreateItemDto,
  UpdateItemDto,
  OptimisticLockError,
  PaginatedResponse,
  BulkCreateItemsDto,
} from '../types/models';
import { PoolClient } from 'pg';

export class ItemService {
  /**
   * Create a new item
   */
  async create(dto: CreateItemDto): Promise<Item> {
    const sql = `
      INSERT INTO items (
        sku, name, description, category, unit_price, reorder_level, reorder_quantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      dto.sku,
      dto.name,
      dto.description || null,
      dto.category || null,
      dto.unit_price,
      dto.reorder_level || 10,
      dto.reorder_quantity || 50,
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * Get item by ID
   */
  async getById(id: string): Promise<Item | null> {
    const sql = 'SELECT * FROM items WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get item by SKU
   */
  async getBySku(sku: string): Promise<Item | null> {
    const sql = 'SELECT * FROM items WHERE sku = $1';
    const result = await query(sql, [sku]);
    return result.rows[0] || null;
  }

  /**
   * Get all items with pagination and filtering
   */
  async getAll(options: {
    page?: number;
    limit?: number;
    category?: string;
    isActive?: boolean;
    searchTerm?: string;
  }): Promise<PaginatedResponse<Item>> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    let whereClauses: string[] = [];
    let values: any[] = [];
    let paramIndex = 1;

    if (options.category) {
      whereClauses.push(`category = $${paramIndex++}`);
      values.push(options.category);
    }

    if (options.isActive !== undefined) {
      whereClauses.push(`is_active = $${paramIndex++}`);
      values.push(options.isActive);
    }

    if (options.searchTerm) {
      whereClauses.push(`(name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${options.searchTerm}%`);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) FROM items ${whereClause}`;
    const countResult = await query(countSql, values);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const dataSql = `
      SELECT * FROM items
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await query(dataSql, [...values, limit, offset]);

    return {
      data: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update item with optimistic locking
   */
  async update(id: string, dto: UpdateItemDto): Promise<Item> {
    return transaction(async (client: PoolClient) => {
      // First, check the current version
      const checkSql = 'SELECT version FROM items WHERE id = $1 FOR UPDATE';
      const checkResult = await client.query(checkSql, [id]);

      if (checkResult.rows.length === 0) {
        throw new Error('Item not found');
      }

      const currentVersion = checkResult.rows[0].version;

      // Verify version matches (optimistic locking)
      if (currentVersion !== dto.version) {
        throw new OptimisticLockError(
          `Item was modified by another process. Expected version ${dto.version}, but current version is ${currentVersion}`
        );
      }

      // Build dynamic UPDATE query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (dto.sku !== undefined) {
        updateFields.push(`sku = $${paramIndex++}`);
        values.push(dto.sku);
      }
      if (dto.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(dto.name);
      }
      if (dto.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(dto.description);
      }
      if (dto.category !== undefined) {
        updateFields.push(`category = $${paramIndex++}`);
        values.push(dto.category);
      }
      if (dto.unit_price !== undefined) {
        updateFields.push(`unit_price = $${paramIndex++}`);
        values.push(dto.unit_price);
      }
      if (dto.reorder_level !== undefined) {
        updateFields.push(`reorder_level = $${paramIndex++}`);
        values.push(dto.reorder_level);
      }
      if (dto.reorder_quantity !== undefined) {
        updateFields.push(`reorder_quantity = $${paramIndex++}`);
        values.push(dto.reorder_quantity);
      }
      if (dto.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(dto.is_active);
      }

      // Increment version
      updateFields.push(`version = version + 1`);

      const updateSql = `
        UPDATE items
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
   * Soft delete item (set is_active to false)
   */
  async delete(id: string): Promise<boolean> {
    const sql = 'UPDATE items SET is_active = false WHERE id = $1';
    const result = await query(sql, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Hard delete item
   */
  async hardDelete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM items WHERE id = $1';
    const result = await query(sql, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get items with low stock
   */
  async getLowStockItems(): Promise<Item[]> {
    const sql = `
      SELECT DISTINCT i.*
      FROM items i
      INNER JOIN inventory_summary inv ON i.id = inv.item_id
      WHERE inv.is_low_stock = true AND i.is_active = true
      ORDER BY i.name
    `;
    const result = await query(sql);
    return result.rows;
  }

  /**
   * Bulk create items (high performance)
   */
  async bulkCreate(dto: BulkCreateItemsDto): Promise<Item[]> {
    if (dto.items.length === 0) {
      return [];
    }

    // Use a single INSERT with multiple VALUES for better performance
    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    let paramIndex = 1;

    dto.items.forEach((item) => {
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
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * Get items by category
   */
  async getByCategory(category: string): Promise<Item[]> {
    const sql = 'SELECT * FROM items WHERE category = $1 AND is_active = true ORDER BY name';
    const result = await query(sql, [category]);
    return result.rows;
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    const sql = 'SELECT DISTINCT category FROM items WHERE category IS NOT NULL ORDER BY category';
    const result = await query(sql);
    return result.rows.map((row) => row.category);
  }
}

export default new ItemService();
