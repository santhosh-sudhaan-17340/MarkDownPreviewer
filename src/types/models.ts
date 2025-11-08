// ========================================
// ENUMS
// ========================================
export enum TransactionType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

// ========================================
// INTERFACES
// ========================================

// Base interface for entities with optimistic locking
export interface OptimisticLockEntity {
  version: number;
}

// Warehouse
export interface Warehouse extends OptimisticLockEntity {
  id: string;
  name: string;
  location: string;
  capacity: number;
  manager_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWarehouseDto {
  name: string;
  location: string;
  capacity: number;
  manager_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface UpdateWarehouseDto extends Partial<CreateWarehouseDto> {
  is_active?: boolean;
  version: number; // Required for optimistic locking
}

// Item
export interface Item extends OptimisticLockEntity {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit_price: number;
  reorder_level: number;
  reorder_quantity: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateItemDto {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit_price: number;
  reorder_level?: number;
  reorder_quantity?: number;
}

export interface UpdateItemDto extends Partial<CreateItemDto> {
  is_active?: boolean;
  version: number; // Required for optimistic locking
}

// Batch
export interface Batch extends OptimisticLockEntity {
  id: string;
  item_id: string;
  warehouse_id: string;
  batch_number: string;
  quantity: number;
  manufacturing_date?: Date;
  expiry_date?: Date;
  supplier?: string;
  cost_per_unit?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBatchDto {
  item_id: string;
  warehouse_id: string;
  batch_number: string;
  quantity: number;
  manufacturing_date?: Date;
  expiry_date?: Date;
  supplier?: string;
  cost_per_unit?: number;
}

export interface UpdateBatchDto extends Partial<Omit<CreateBatchDto, 'item_id' | 'warehouse_id' | 'batch_number'>> {
  version: number; // Required for optimistic locking
}

// Inventory Transaction
export interface InventoryTransaction {
  id: string;
  transaction_type: TransactionType;
  item_id: string;
  batch_id?: string;
  warehouse_id: string;
  quantity: number;
  unit_cost?: number;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: Date;
  transfer_from_warehouse_id?: string;
  transfer_to_warehouse_id?: string;
  metadata?: Record<string, any>;
}

export interface CreateTransactionDto {
  transaction_type: TransactionType;
  item_id: string;
  batch_id?: string;
  warehouse_id: string;
  quantity: number;
  unit_cost?: number;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  transfer_from_warehouse_id?: string;
  transfer_to_warehouse_id?: string;
  metadata?: Record<string, any>;
}

// Low Stock Alert
export interface LowStockAlert {
  id: string;
  item_id: string;
  warehouse_id: string;
  current_quantity: number;
  reorder_level: number;
  alert_status: AlertStatus;
  created_at: Date;
  acknowledged_at?: Date;
  acknowledged_by?: string;
  resolved_at?: Date;
}

export interface AcknowledgeAlertDto {
  acknowledged_by: string;
}

// Inventory Summary (from view)
export interface InventorySummary {
  item_id: string;
  sku: string;
  item_name: string;
  warehouse_id: string;
  warehouse_name: string;
  total_quantity: number;
  reorder_level: number;
  unit_price: number;
  is_low_stock: boolean;
}

// Bulk Operation DTOs
export interface BulkCreateItemsDto {
  items: CreateItemDto[];
}

export interface BulkUpdateBatchesDto {
  updates: Array<{
    id: string;
    quantity: number;
    version: number;
  }>;
}

export interface BulkTransferDto {
  item_id: string;
  batch_id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  quantity: number;
  created_by?: string;
  notes?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Optimistic Lock Error
export class OptimisticLockError extends Error {
  constructor(message: string = 'Resource was modified by another process') {
    super(message);
    this.name = 'OptimisticLockError';
  }
}
