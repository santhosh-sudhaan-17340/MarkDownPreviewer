# Subscription & Billing Management Platform

A comprehensive backend system for managing subscription plans, billing cycles, payments, and revenue analytics. Built with Node.js, TypeScript, Express, and PostgreSQL.

## Features

### Core Functionality
- **Subscription Plans**: Monthly and yearly billing periods with customizable features
- **Trial Periods**: Automatic trial management with configurable duration
- **Upgrades/Downgrades**: Seamless plan changes with automatic proration calculation
- **Optimistic Locking**: Prevents race conditions during concurrent subscription updates
- **Invoice Generation**: Automated invoice creation with line items and proration support
- **Payment Processing**: Simulated payment gateway with retry logic for failed payments
- **Coupon System**: Percentage and fixed discount coupons with validation
- **Tax Engine**: Location-based tax calculation (country and state/province level)
- **Revenue Analytics**: Real-time metrics with efficient SQL aggregation

### Technical Highlights
- **Optimistic Locking**: Row-level versioning prevents concurrent update conflicts
- **Proration Logic**: Time-based billing adjustments using `Decimal.js` for precision
- **Payment Retry**: Automatic retry mechanism with exponential backoff
- **Transaction Safety**: Database transactions for atomic operations
- **Audit Trail**: Complete subscription history tracking

## Architecture

```
src/
├── database/
│   ├── connection.ts       # Database connection pool
│   ├── migrate.ts          # Migration runner
│   ├── schema.sql          # Database schema
│   └── seed.sql            # Sample data
├── services/
│   ├── SubscriptionPlanService.ts
│   ├── SubscriptionService.ts
│   ├── ProrationService.ts
│   ├── InvoiceService.ts
│   ├── PaymentService.ts
│   ├── CouponService.ts
│   ├── TaxService.ts
│   └── AnalyticsService.ts
├── routes/
│   ├── subscriptionPlans.ts
│   ├── subscriptions.ts
│   ├── invoices.ts
│   ├── payments.ts
│   ├── coupons.ts
│   ├── taxRules.ts
│   └── analytics.ts
├── types/
│   └── index.ts            # TypeScript interfaces
└── index.ts                # Express app
```

## Database Schema

### Key Tables
- **subscription_plans**: Plan definitions with pricing and features
- **subscriptions**: User subscriptions with optimistic locking (`version` column)
- **invoices**: Generated invoices with tax and discount calculations
- **payments**: Payment records with retry tracking
- **coupons**: Discount code management
- **tax_rules**: Location-based tax rates
- **subscription_history**: Audit trail for all subscription changes

### Optimistic Locking Implementation
```sql
UPDATE subscriptions
SET plan_id = $1, version = version + 1
WHERE id = $2 AND version = $3
RETURNING *
```
If the version doesn't match, the update fails, preventing race conditions.

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Set up database**:
```bash
# Create PostgreSQL database
createdb subscription_billing

# Run migrations
npm run build
npm run migrate
```

4. **Start the server**:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

5. **Run tests**:
```bash
npm test
```

## API Endpoints

### Subscription Plans
- `GET /api/plans` - List all active plans
- `GET /api/plans/:id` - Get plan details
- `POST /api/plans` - Create new plan
- `PATCH /api/plans/:id` - Update plan
- `DELETE /api/plans/:id` - Deactivate plan

### Subscriptions
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions/:id` - Get subscription
- `GET /api/subscriptions/user/:userId/active` - Get user's active subscription
- `POST /api/subscriptions/:id/change-plan` - Upgrade/downgrade with proration
- `POST /api/subscriptions/:id/cancel` - Cancel subscription
- `POST /api/subscriptions/:id/reactivate` - Reactivate subscription
- `GET /api/subscriptions/:id/history` - View change history

### Invoices
- `POST /api/invoices` - Generate invoice
- `GET /api/invoices/:id` - Get invoice
- `GET /api/invoices/:id/line-items` - Get invoice line items
- `GET /api/invoices/user/:userId` - Get user's invoices
- `POST /api/invoices/:id/pay` - Mark as paid
- `POST /api/invoices/:id/void` - Void invoice

### Payments
- `POST /api/payments` - Create and process payment
- `GET /api/payments/:id` - Get payment details
- `GET /api/payments/:id/retry-logs` - View retry attempts
- `POST /api/payments/:id/retry` - Manual retry
- `POST /api/payments/:id/refund` - Refund payment
- `POST /api/payments/retry-failed/batch` - Retry all failed payments

### Coupons
- `POST /api/coupons` - Create coupon
- `GET /api/coupons` - List active coupons
- `POST /api/coupons/validate` - Validate coupon code
- `POST /api/coupons/calculate-discount` - Calculate discount amount

### Tax Rules
- `POST /api/tax-rules` - Create/update tax rule
- `GET /api/tax-rules` - List all tax rules
- `POST /api/tax-rules/calculate` - Calculate tax for amount

### Analytics
- `GET /api/analytics/revenue` - Revenue metrics (MRR, ARR, total)
- `GET /api/analytics/revenue-by-plan` - Revenue breakdown by plan
- `GET /api/analytics/subscription-growth` - Growth metrics over time
- `GET /api/analytics/churn-rate` - Customer churn rate
- `GET /api/analytics/payment-success-rate` - Payment success metrics
- `GET /api/analytics/coupon-usage` - Coupon usage statistics
- `GET /api/analytics/tax-collection` - Tax collection summary
- `GET /api/analytics/lifetime-value` - Customer LTV estimate

## Usage Examples

### Create Subscription with Trial
```bash
curl -X POST http://localhost:3000/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "plan_id": "11111111-1111-1111-1111-111111111111"
  }'
```

### Upgrade Plan with Immediate Proration
```bash
curl -X POST http://localhost:3000/api/subscriptions/{subscription_id}/change-plan \
  -H "Content-Type: application/json" \
  -d '{
    "new_plan_id": "33333333-3333-3333-3333-333333333333",
    "immediate": true
  }'
```

### Create Invoice with Coupon and Tax
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "subscription_id": "{subscription_id}",
    "coupon_code": "WELCOME20",
    "country_code": "US",
    "state_code": "CA"
  }'
```

### Get Revenue Analytics
```bash
curl "http://localhost:3000/api/analytics/revenue?start_date=2024-01-01&end_date=2024-12-31"
```

## Key Implementation Details

### Proration Calculation
Uses time-based proration for fair billing:
```typescript
const unusedRatio = remainingSeconds / totalSeconds;
const creditAmount = oldPlanPrice * unusedRatio;
const chargeAmount = newPlanPrice * unusedRatio;
const netAmount = chargeAmount - creditAmount;
```

### Payment Retry Logic
- Automatic retry with configurable attempts (default: 3)
- Exponential backoff (default: 24 hours between retries)
- Detailed retry logs for debugging
- Batch retry endpoint for scheduled jobs

### Revenue Analytics Queries
Efficient SQL aggregation for real-time metrics:
```sql
-- Monthly Recurring Revenue (MRR)
SELECT SUM(
  CASE
    WHEN billing_period = 'monthly' THEN price
    WHEN billing_period = 'yearly' THEN price / 12
  END
) as mrr
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status IN ('active', 'trial')
```

### Optimistic Locking Error Handling
```typescript
try {
  await SubscriptionService.changePlan(id, newPlanId);
} catch (error) {
  if (error instanceof OptimisticLockError) {
    // Retry the operation
  }
}
```

## Configuration

### Environment Variables
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=subscription_billing
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=3000
NODE_ENV=development

# Payment Retry
MAX_PAYMENT_RETRIES=3
RETRY_DELAY_HOURS=24
```

## Testing

Run the test suite:
```bash
npm test
```

Run with coverage:
```bash
npm test -- --coverage
```

## Future Enhancements

- **Payment Gateway Integration**: Stripe, PayPal, Braintree
- **Webhooks**: Event notifications for subscription changes
- **Dunning Management**: Automated retry campaigns for failed payments
- **Usage-Based Billing**: Metered billing support
- **Multi-Currency**: Support for international pricing
- **Proration Options**: Configurable proration strategies
- **Advanced Analytics**: Cohort analysis, retention curves
- **Email Notifications**: Invoice and payment receipts

## License

MIT

## Support

For issues and questions, please open an issue on the repository.