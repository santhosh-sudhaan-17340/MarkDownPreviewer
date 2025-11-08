# Inventory & Warehouse Tracking System

A comprehensive, production-ready inventory and warehouse management system built with Node.js, TypeScript, and PostgreSQL.

## Features

🎯 **Complete CRUD Operations**
- Items, Batches, Warehouses, and Transactions
- RESTful API design
- Full TypeScript support

🔒 **Optimistic Locking**
- Prevents concurrent update conflicts
- Version-based conflict detection
- Automatic version management

📦 **Batch Tracking**
- FIFO (First In, First Out) support
- FEFO (First Expired, First Out) support
- Expiry date tracking
- Batch-level inventory control

📊 **Transaction Logging**
- Complete audit trail
- Support for: INBOUND, OUTBOUND, TRANSFER, ADJUSTMENT, RETURN
- Historical reporting
- Transaction summaries

🔔 **Low Stock Alerts**
- Automatic alert generation
- Customizable reorder levels
- Alert acknowledgment workflow
- Critical stock (0 quantity) detection

⚡ **High Performance**
- Bulk SQL operations
- Connection pooling
- Strategic database indexes
- Materialized views for reporting
- Optimized queries

🏢 **Warehouse Management**
- Multi-warehouse support
- Capacity tracking and utilization
- Warehouse-to-warehouse transfers
- Location-based inventory

## Technology Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL 13+
- **Testing:** Jest
- **Validation:** express-validator

## Quick Start

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 13 or higher
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd MarkDownPreviewer
```

2. Install dependencies
```bash
npm install
```

3. Configure environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run database migrations
```bash
npm run migrate
```

5. Start the server
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The API will be available at `http://localhost:3000/api`

## Project Structure

```
├── database/
│   └── schema.sql              # Database schema and migrations
├── src/
│   ├── controllers/            # Request handlers
│   │   ├── itemController.ts
│   │   ├── batchController.ts
│   │   ├── transactionController.ts
│   │   ├── warehouseController.ts
│   │   └── alertController.ts
│   ├── services/               # Business logic
│   │   ├── itemService.ts
│   │   ├── batchService.ts
│   │   ├── transactionService.ts
│   │   ├── warehouseService.ts
│   │   ├── alertService.ts
│   │   └── bulkOperationsService.ts
│   ├── database/               # Database connection
│   │   ├── connection.ts
│   │   └── migrate.ts
│   ├── middleware/             # Express middleware
│   │   ├── errorHandler.ts
│   │   └── validator.ts
│   ├── routes/                 # API routes
│   │   └── index.ts
│   ├── types/                  # TypeScript types
│   │   └── models.ts
│   ├── __tests__/             # Unit tests
│   └── server.ts              # Application entry point
├── .env.example               # Environment template
├── package.json
├── tsconfig.json
└── API_DOCUMENTATION.md       # Complete API docs
```

## API Overview

### Items
- `POST /api/items` - Create item
- `GET /api/items` - Get all items (paginated)
- `GET /api/items/:id` - Get item by ID
- `PUT /api/items/:id` - Update item (with optimistic locking)
- `DELETE /api/items/:id` - Delete item
- `GET /api/items/low-stock` - Get low stock items
- `POST /api/items/bulk` - Bulk create items

### Batches
- `POST /api/batches` - Create batch
- `GET /api/batches/:id` - Get batch by ID
- `GET /api/batches/item/:itemId` - Get batches by item
- `GET /api/batches/expiring/soon` - Get expiring batches
- `GET /api/batches/expired/list` - Get expired batches
- `PUT /api/batches/:id` - Update batch

### Transactions
- `POST /api/transactions/inbound` - Record inbound
- `POST /api/transactions/outbound` - Record outbound
- `POST /api/transactions/transfer` - Record transfer
- `POST /api/transactions/adjustment` - Record adjustment
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/summary` - Get summary

### Warehouses
- `POST /api/warehouses` - Create warehouse
- `GET /api/warehouses` - Get all warehouses
- `GET /api/warehouses/utilization` - Get with utilization
- `GET /api/warehouses/:id/inventory` - Get inventory summary

### Alerts
- `GET /api/alerts/active` - Get active alerts
- `GET /api/alerts/critical` - Get critical alerts
- `PUT /api/alerts/:id/acknowledge` - Acknowledge alert
- `PUT /api/alerts/:id/resolve` - Resolve alert

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

## Key Features Explained

### Optimistic Locking

Every update operation requires the current version number. This prevents conflicts when multiple users try to update the same record:

```typescript
// Get item with version 1
GET /api/items/123
{ "id": "123", "name": "Item", "version": 1 }

// Update requires version
PUT /api/items/123
{ "name": "Updated", "version": 1 }
// Success: { "id": "123", "name": "Updated", "version": 2 }

// Stale version fails
PUT /api/items/123
{ "name": "Another Update", "version": 1 }
// Error: 409 Conflict
```

### Batch Tracking

Track inventory at the batch level with support for FIFO/FEFO:

- Manufacturing dates
- Expiry dates
- Supplier information
- Cost per unit
- Automatic expiry warnings

### Transaction Logging

Every inventory movement is logged:

- **INBOUND** - Receiving stock
- **OUTBOUND** - Shipping/selling
- **TRANSFER** - Moving between warehouses
- **ADJUSTMENT** - Manual adjustments (damage, loss)
- **RETURN** - Customer returns

Complete audit trail for compliance and reporting.

### Low Stock Alerts

Automatically generated when inventory falls below reorder level:

- Configurable per item
- Warehouse-specific alerts
- Acknowledgment workflow
- Auto-resolution when restocked

### Bulk Operations

High-performance operations for:

- Bulk item creation
- Bulk price updates
- Bulk quantity adjustments
- CSV import
- Full inventory export

## Database Schema

The system uses PostgreSQL with:

- **Tables:** items, batches, warehouses, inventory_transactions, low_stock_alerts
- **Views:** inventory_summary (for reporting)
- **Triggers:** Auto-update timestamps, low-stock detection
- **Indexes:** Strategic indexes for performance

See `database/schema.sql` for complete schema.

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test itemService.test.ts
```

## Performance Optimizations

1. **Connection Pooling** - Maximum 20 concurrent connections
2. **Bulk Operations** - Single SQL statements for multiple records
3. **Strategic Indexes** - On frequently queried columns
4. **Materialized Views** - For complex reporting queries
5. **Optimistic Locking** - Reduces database lock contention

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_db
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=3000
NODE_ENV=development

# Alerts
LOW_STOCK_THRESHOLD=10
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## Production Deployment

1. Set `NODE_ENV=production` in .env
2. Update database credentials
3. Run `npm run build`
4. Run `npm start`
5. Use a process manager (PM2, systemd)
6. Set up reverse proxy (nginx, Apache)
7. Enable SSL/TLS

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions, please open a GitHub issue.
