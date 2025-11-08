# Inventory & Warehouse Tracking System - API Documentation

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Setup](#setup)
- [API Endpoints](#api-endpoints)
  - [Items](#items)
  - [Batches](#batches)
  - [Transactions](#transactions)
  - [Warehouses](#warehouses)
  - [Alerts](#alerts)
  - [Bulk Operations](#bulk-operations)
- [Optimistic Locking](#optimistic-locking)
- [Error Handling](#error-handling)

---

## Overview

The Inventory & Warehouse Tracking System is a comprehensive solution for managing inventory across multiple warehouses with advanced features including:
- CRUD operations with optimistic locking
- Batch tracking (FIFO/FEFO)
- Transaction logging
- Low-stock alerts
- Bulk SQL operations
- Performance optimizations

**Base URL:** `http://localhost:3000/api`

---

## Features

✅ **CRUD Operations** - Create, Read, Update, Delete for Items, Batches, Warehouses
✅ **Optimistic Locking** - Prevent concurrent update conflicts
✅ **Batch Tracking** - Track inventory by batch with expiry dates
✅ **Transaction Logging** - Complete audit trail of all inventory movements
✅ **Low Stock Alerts** - Automatic alerts when inventory falls below reorder level
✅ **Bulk Operations** - High-performance bulk create/update operations
✅ **FIFO/FEFO Support** - First In First Out / First Expired First Out
✅ **Warehouse Management** - Capacity tracking and utilization

---

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 13+

### Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=inventory_db
# DB_USER=postgres
# DB_PASSWORD=your_password

# Run migrations
npm run migrate

# Start development server
npm run dev

# Or build and start production server
npm run build
npm start
```

---

## API Endpoints

### Items

#### Create Item
```http
POST /api/items
Content-Type: application/json

{
  "sku": "LAPTOP-001",
  "name": "Dell Laptop XPS 13",
  "description": "13-inch ultrabook",
  "category": "Electronics",
  "unit_price": 1299.99,
  "reorder_level": 10,
  "reorder_quantity": 25
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sku": "LAPTOP-001",
    "name": "Dell Laptop XPS 13",
    "unit_price": 1299.99,
    "version": 1,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Get All Items (with pagination)
```http
GET /api/items?page=1&limit=50&category=Electronics&searchTerm=laptop
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `category` (optional): Filter by category
- `isActive` (optional): Filter by active status
- `searchTerm` (optional): Search in name, SKU, description

#### Get Item by ID
```http
GET /api/items/:id
```

#### Update Item (with Optimistic Locking)
```http
PUT /api/items/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "unit_price": 1399.99,
  "version": 1
}
```

**Note:** The `version` field is required for optimistic locking. If the version doesn't match, you'll receive a 409 Conflict error.

#### Delete Item (Soft Delete)
```http
DELETE /api/items/:id
```

#### Get Low Stock Items
```http
GET /api/items/low-stock
```

#### Get All Categories
```http
GET /api/items/categories
```

#### Bulk Create Items
```http
POST /api/items/bulk
Content-Type: application/json

{
  "items": [
    {
      "sku": "ITEM-001",
      "name": "Item 1",
      "unit_price": 10.99
    },
    {
      "sku": "ITEM-002",
      "name": "Item 2",
      "unit_price": 20.99
    }
  ]
}
```

---

### Batches

#### Create Batch
```http
POST /api/batches
Content-Type: application/json

{
  "item_id": "uuid",
  "warehouse_id": "uuid",
  "batch_number": "BATCH-2024-001",
  "quantity": 100,
  "manufacturing_date": "2024-01-01",
  "expiry_date": "2025-01-01",
  "supplier": "Acme Corp",
  "cost_per_unit": 8.50
}
```

#### Get Batch by ID
```http
GET /api/batches/:id
```

#### Get Batches by Item
```http
GET /api/batches/item/:itemId
```

#### Get Batches by Warehouse
```http
GET /api/batches/warehouse/:warehouseId
```

#### Get Expiring Batches
```http
GET /api/batches/expiring/soon?days=30
```

Returns batches expiring within the next 30 days (default).

#### Get Expired Batches
```http
GET /api/batches/expired/list
```

#### Update Batch
```http
PUT /api/batches/:id
Content-Type: application/json

{
  "quantity": 150,
  "version": 1
}
```

#### Delete Batch
```http
DELETE /api/batches/:id
```

#### Get Total Quantity for Item
```http
GET /api/batches/quantity/:itemId?warehouseId=uuid
```

---

### Transactions

All inventory movements are logged as transactions for complete audit trail.

#### Get All Transactions
```http
GET /api/transactions?itemId=uuid&warehouseId=uuid&transactionType=INBOUND&limit=100
```

**Query Parameters:**
- `itemId` (optional): Filter by item
- `warehouseId` (optional): Filter by warehouse
- `transactionType` (optional): INBOUND, OUTBOUND, TRANSFER, ADJUSTMENT, RETURN
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date
- `limit` (optional): Max results (default: 100)

#### Record Inbound Transaction
```http
POST /api/transactions/inbound
Content-Type: application/json

{
  "itemId": "uuid",
  "batchId": "uuid",
  "warehouseId": "uuid",
  "quantity": 50,
  "unitCost": 8.50,
  "referenceNumber": "PO-2024-001",
  "createdBy": "john@example.com",
  "notes": "Received from supplier"
}
```

#### Record Outbound Transaction
```http
POST /api/transactions/outbound
Content-Type: application/json

{
  "itemId": "uuid",
  "batchId": "uuid",
  "warehouseId": "uuid",
  "quantity": 25,
  "referenceNumber": "SO-2024-001",
  "createdBy": "jane@example.com",
  "notes": "Shipped to customer"
}
```

#### Record Transfer Between Warehouses
```http
POST /api/transactions/transfer
Content-Type: application/json

{
  "item_id": "uuid",
  "batch_id": "uuid",
  "from_warehouse_id": "uuid",
  "to_warehouse_id": "uuid",
  "quantity": 30,
  "created_by": "admin@example.com",
  "notes": "Transfer to secondary warehouse"
}
```

#### Record Adjustment
```http
POST /api/transactions/adjustment
Content-Type: application/json

{
  "itemId": "uuid",
  "batchId": "uuid",
  "warehouseId": "uuid",
  "quantityChange": -5,
  "reason": "Damaged goods",
  "createdBy": "manager@example.com"
}
```

#### Get Item Transaction History
```http
GET /api/transactions/item/:itemId/history?limit=100
```

#### Get Transaction Summary
```http
GET /api/transactions/summary?startDate=2024-01-01&endDate=2024-12-31
```

---

### Warehouses

#### Create Warehouse
```http
POST /api/warehouses
Content-Type: application/json

{
  "name": "Main Warehouse",
  "location": "123 Industrial Blvd, City, State 12345",
  "capacity": 10000,
  "manager_name": "John Doe",
  "contact_email": "john@example.com",
  "contact_phone": "+1-555-0123"
}
```

#### Get All Warehouses
```http
GET /api/warehouses?activeOnly=true
```

#### Get All Warehouses with Utilization
```http
GET /api/warehouses/utilization
```

Returns warehouses with capacity utilization percentage.

#### Get Warehouses Near Capacity
```http
GET /api/warehouses/near-capacity?threshold=80
```

Returns warehouses above 80% capacity.

#### Get Warehouse by ID
```http
GET /api/warehouses/:id
```

#### Update Warehouse
```http
PUT /api/warehouses/:id
Content-Type: application/json

{
  "capacity": 15000,
  "manager_name": "Jane Smith",
  "version": 1
}
```

#### Delete Warehouse
```http
DELETE /api/warehouses/:id
```

#### Get Warehouse Inventory Summary
```http
GET /api/warehouses/:id/inventory
```

Returns complete inventory breakdown for the warehouse.

#### Get Warehouse Capacity Utilization
```http
GET /api/warehouses/:id/utilization
```

---

### Alerts

#### Get All Alerts
```http
GET /api/alerts?itemId=uuid&warehouseId=uuid&status=ACTIVE
```

**Query Parameters:**
- `itemId` (optional): Filter by item
- `warehouseId` (optional): Filter by warehouse
- `status` (optional): ACTIVE, ACKNOWLEDGED, RESOLVED

#### Get Active Alerts
```http
GET /api/alerts/active
```

#### Get Critical Alerts (0 stock)
```http
GET /api/alerts/critical
```

#### Get Alert Statistics
```http
GET /api/alerts/statistics
```

Returns counts by status.

#### Acknowledge Alert
```http
PUT /api/alerts/:id/acknowledge
Content-Type: application/json

{
  "acknowledged_by": "manager@example.com"
}
```

#### Resolve Alert
```http
PUT /api/alerts/:id/resolve
```

#### Manually Check All Low Stock
```http
POST /api/alerts/check
```

Triggers a manual check for low stock items.

---

### Bulk Operations

High-performance bulk operations using optimized SQL.

#### Bulk Create Items
```http
POST /api/bulk/items/create
Content-Type: application/json

{
  "items": [
    { "sku": "SKU-001", "name": "Item 1", "unit_price": 10 },
    { "sku": "SKU-002", "name": "Item 2", "unit_price": 20 }
  ]
}
```

#### Bulk Create Batches
```http
POST /api/bulk/batches/create
Content-Type: application/json

{
  "batches": [
    {
      "item_id": "uuid",
      "warehouse_id": "uuid",
      "batch_number": "BATCH-001",
      "quantity": 100
    }
  ]
}
```

#### Bulk Update Item Prices
```http
PUT /api/bulk/items/prices
Content-Type: application/json

{
  "updates": [
    { "sku": "ITEM-001", "unit_price": 12.99 },
    { "sku": "ITEM-002", "unit_price": 24.99 }
  ]
}
```

#### Bulk Update Batch Quantities
```http
PUT /api/bulk/batches/quantities
Content-Type: application/json

{
  "updates": [
    { "id": "uuid", "quantity_change": 50 },
    { "id": "uuid", "quantity_change": -20 }
  ]
}
```

#### Export Inventory Data
```http
GET /api/bulk/export/inventory
```

Returns complete inventory dataset for export.

#### Import from CSV
```http
POST /api/bulk/import/csv
Content-Type: application/json

{
  "data": [
    {
      "sku": "IMPORT-001",
      "name": "Imported Item",
      "unit_price": 15.99,
      "category": "Electronics"
    }
  ]
}
```

#### Get Database Statistics
```http
GET /api/bulk/statistics
```

Returns counts and totals across all entities.

---

## Optimistic Locking

All entities (Items, Batches, Warehouses) support optimistic locking to prevent concurrent update conflicts.

### How it Works

1. Each entity has a `version` field that starts at 1
2. When updating, you must include the current version number
3. The version is incremented on each update
4. If the version doesn't match, a 409 Conflict error is returned

### Example

```javascript
// Get current item
GET /api/items/123
// Returns: { id: "123", name: "Item", version: 1 }

// Update item
PUT /api/items/123
{
  "name": "Updated Item",
  "version": 1  // Must match current version
}
// Returns: { id: "123", name: "Updated Item", version: 2 }

// If another process updated the item first:
PUT /api/items/123
{
  "name": "Another Update",
  "version": 1  // Stale version
}
// Returns: 409 Conflict
// {
//   "success": false,
//   "error": "Item was modified by another process. Expected version 1, but current version is 2"
// }
```

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (optimistic locking failure)
- `500` - Internal Server Error

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `OPTIMISTIC_LOCK_ERROR` - Version mismatch
- `VALIDATION_ERROR` - Invalid input data
- `NOT_FOUND` - Resource not found

---

## Performance Optimizations

### Indexes
The system uses strategic indexes on:
- SKU, category, active status (items)
- Item ID, warehouse ID, expiry date (batches)
- Item ID, warehouse ID, transaction type, created_at (transactions)
- Item + warehouse composite (alerts)

### Bulk Operations
All bulk operations use:
- Single SQL statements with multiple VALUES
- CASE statements for conditional updates
- Optimized WHERE clauses

### Views
- `inventory_summary` - Pre-aggregated inventory data
- Used for low-stock detection and reporting

### Database Optimization
- Connection pooling (max 20 connections)
- Prepared statement support
- Transaction support for atomic operations

---

## Database Schema

See `database/schema.sql` for complete schema including:
- Tables: items, batches, warehouses, inventory_transactions, low_stock_alerts
- Indexes for performance
- Triggers for auto-updates and low-stock detection
- Views for reporting

---

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

---

## License

MIT
