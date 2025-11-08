# Subscription & Billing Management Platform

A comprehensive backend system for managing subscription plans, billing, payments, and revenue analytics with support for trials, upgrades/downgrades, proration calculation, invoice generation, payment retry logic, coupon codes, and tax rules.

## Features

### Core Subscription Management
- ✅ **Multiple Billing Cycles**: Monthly, Yearly, and Quarterly plans
- ✅ **Trial Periods**: Configurable trial days per plan
- ✅ **Upgrades & Downgrades**: Seamless plan changes with intelligent proration
- ✅ **Cancellations**: Immediate or end-of-period cancellation options
- ✅ **Optimistic Locking**: Prevent race conditions during subscription updates using version control

### Billing & Invoicing
- ✅ **Automated Invoice Generation**: Create invoices for subscriptions, upgrades, and renewals
- ✅ **Proration Calculation**: Accurate prorated billing for mid-cycle plan changes
- ✅ **Line Item Details**: Detailed invoice items with tax and proration tracking
- ✅ **Multiple Invoice Statuses**: Draft, Open, Paid, Void, Uncollectible

### Payment Processing
- ✅ **Payment Gateway Integration**: Stripe-ready architecture (easily extensible)
- ✅ **Payment Retry Logic**: Exponential backoff retry strategy (Days 2, 4, 7)
- ✅ **Payment Logs**: Comprehensive audit trail for all payment events
- ✅ **Failed Payment Handling**: Automatic retry scheduling and status management
- ✅ **Refund Support**: Full and partial refund capabilities

### Coupon System
- ✅ **Discount Types**: Percentage-based and fixed amount discounts
- ✅ **Validation Rules**: Expiration dates, usage limits, minimum amounts
- ✅ **Redemption Tracking**: Per-user redemption limits and usage analytics
- ✅ **First-Time User Promotions**: Special coupons for new customers

### Tax Management
- ✅ **Geographic Tax Rules**: Country and state/region-level tax configuration
- ✅ **Tax Rate Calculation**: Automatic tax calculation based on user location
- ✅ **VAT Support**: EU VAT validation (placeholder for VIES integration)
- ✅ **Tax-Inclusive Pricing**: Support for both tax-inclusive and tax-exclusive models

### Revenue Analytics
- ✅ **MRR (Monthly Recurring Revenue)**: Real-time and historical MRR tracking
- ✅ **Churn Analytics**: Subscription cancellation rates and trends
- ✅ **LTV (Lifetime Value)**: Customer lifetime value metrics
- ✅ **Trial Conversion Rates**: Track conversion from trial to paid
- ✅ **Cohort Analysis**: Track retention by signup cohort
- ✅ **Revenue by Plan**: Breakdown of revenue by subscription plan
- ✅ **Materialized Views**: Optimized SQL aggregation queries for fast analytics

### Automation
- ✅ **Subscription Renewals**: Automated renewal processing via cron jobs
- ✅ **Payment Retries**: Scheduled retry attempts for failed payments
- ✅ **Analytics Refresh**: Nightly refresh of materialized views
- ✅ **Data Cleanup**: Automated cleanup of old logs and uncollectible invoices

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with advanced features (JSONB, Materialized Views, Triggers)
- **Authentication**: JWT (JSON Web Tokens)
- **Scheduling**: node-cron
- **Logging**: Winston
- **Validation**: Joi
- **Date Handling**: date-fns

## Project Structure

```
backend/
├── database/
│   ├── schema.sql          # Complete database schema with all tables
│   └── seed.sql            # Sample data for testing
├── src/
│   ├── config/
│   │   └── database.js     # Database connection pool and utilities
│   ├── services/
│   │   ├── subscriptionService.js  # Subscription lifecycle management
│   │   ├── prorationService.js     # Proration calculation logic
│   │   ├── invoiceService.js       # Invoice generation and management
│   │   ├── paymentService.js       # Payment processing and retries
│   │   ├── couponService.js        # Coupon validation and redemption
│   │   ├── taxService.js           # Tax calculation
│   │   └── analyticsService.js     # Revenue analytics
│   ├── routes/
│   │   ├── subscriptions.js        # Subscription API endpoints
│   │   ├── invoices.js             # Invoice API endpoints
│   │   ├── payments.js             # Payment API endpoints
│   │   ├── coupons.js              # Coupon API endpoints
│   │   ├── taxes.js                # Tax API endpoints
│   │   ├── analytics.js            # Analytics API endpoints
│   │   └── admin.js                # Admin management endpoints
│   ├── middleware/
│   │   ├── auth.js                 # JWT authentication
│   │   ├── validation.js           # Request validation
│   │   └── errorHandler.js         # Error handling
│   ├── jobs/
│   │   └── scheduler.js            # Cron job scheduler
│   ├── utils/
│   │   └── logger.js               # Winston logger configuration
│   └── server.js                   # Main application entry point
├── tests/                          # Test files (to be added)
├── .env.example                    # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**:
```bash
cd backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Create PostgreSQL database**:
```bash
createdb subscription_billing
```

5. **Run database migrations**:
```bash
psql -d subscription_billing -f database/schema.sql
```

6. **Seed the database** (optional):
```bash
psql -d subscription_billing -f database/seed.sql
```

### Running the Application

**Development mode**:
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The API will be available at `http://localhost:3000`

## API Documentation

### Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Subscription Endpoints

#### Get Available Plans
```http
GET /api/subscriptions/plans
```

Response:
```json
{
  "plans": [
    {
      "id": "uuid",
      "name": "Pro",
      "billing_cycle": "monthly",
      "price": 29.99,
      "currency": "USD",
      "trial_days": 14,
      "features": {}
    }
  ]
}
```

#### Create Subscription
```http
POST /api/subscriptions
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": "plan-uuid",
  "metadata": {}
}
```

#### Upgrade Subscription
```http
POST /api/subscriptions/:id/upgrade
Authorization: Bearer <token>

{
  "newPlanId": "new-plan-uuid"
}
```

Response includes proration amount:
```json
{
  "message": "Subscription upgraded successfully",
  "subscription": {},
  "prorationAmount": 13.33
}
```

#### Downgrade Subscription
```http
POST /api/subscriptions/:id/downgrade
Authorization: Bearer <token>

{
  "newPlanId": "new-plan-uuid"
}
```

#### Cancel Subscription
```http
POST /api/subscriptions/:id/cancel
Authorization: Bearer <token>

{
  "immediate": false
}
```

### Invoice Endpoints

#### Get User Invoices
```http
GET /api/invoices?limit=50&offset=0
Authorization: Bearer <token>
```

#### Get Invoice Details
```http
GET /api/invoices/:id
Authorization: Bearer <token>
```

#### Apply Coupon to Invoice
```http
POST /api/invoices/:id/apply-coupon
Authorization: Bearer <token>

{
  "couponCode": "WELCOME20"
}
```

### Payment Endpoints

#### Process Payment
```http
POST /api/payments/process
Authorization: Bearer <token>

{
  "invoiceId": "invoice-uuid",
  "paymentMethod": {
    "type": "credit_card",
    "details": {}
  }
}
```

#### Get Payment History
```http
GET /api/payments
Authorization: Bearer <token>
```

#### Get Payment Logs
```http
GET /api/payments/:id/logs
Authorization: Bearer <token>
```

### Analytics Endpoints

#### Dashboard Metrics
```http
GET /api/analytics/dashboard
Authorization: Bearer <token>
```

Returns:
- Active subscribers count
- Current MRR
- Revenue trends
- Payment success rates
- LTV metrics

#### Revenue Analytics
```http
GET /api/analytics/revenue?months=12
Authorization: Bearer <token>
```

#### MRR Analytics
```http
GET /api/analytics/mrr?months=12
Authorization: Bearer <token>
```

#### Churn Analytics
```http
GET /api/analytics/churn?months=12
Authorization: Bearer <token>
```

### Admin Endpoints

#### Create Coupon
```http
POST /api/admin/coupons
Authorization: Bearer <token>

{
  "code": "SUMMER25",
  "discountType": "percentage",
  "discountValue": 25,
  "validFrom": "2024-06-01",
  "validUntil": "2024-08-31",
  "maxRedemptions": 1000
}
```

#### Create Tax Rule
```http
POST /api/admin/tax-rules
Authorization: Bearer <token>

{
  "countryCode": "US",
  "stateCode": "CA",
  "taxName": "California Sales Tax",
  "taxRate": 9.0
}
```

#### Run Scheduled Job Manually
```http
POST /api/admin/jobs/:jobName/run
Authorization: Bearer <token>
```

Available jobs: `renewals`, `retries`, `analytics`, `cleanup`

## Database Schema Highlights

### Optimistic Locking

The `subscriptions` table uses a `version` column for optimistic locking:

```sql
UPDATE subscriptions
SET plan_id = $1, version = version + 1
WHERE id = $2 AND version = $3
```

This prevents race conditions when multiple processes try to update the same subscription simultaneously.

### Materialized Views

Three materialized views provide efficient analytics:

1. **revenue_analytics**: Monthly revenue metrics
2. **mrr_analytics**: MRR tracking and subscription counts
3. **churn_analytics**: Churn rates and growth metrics

Refresh all views:
```sql
SELECT refresh_analytics_views();
```

### Indexes

Strategic indexes on:
- User lookups
- Date-based queries (subscriptions, payments)
- Status filters
- Payment retry scheduling

## Business Logic Examples

### Proration Calculation

When upgrading from Basic ($9.99) to Pro ($29.99) mid-cycle:

```
Total Period: 30 days
Used: 15 days
Remaining: 15 days

Old Plan Credit: ($9.99 / 30) * 15 = $4.995
New Plan Cost: ($29.99 / 30) * 15 = $14.995
Proration Due: $14.995 - $4.995 = $10.00
```

### Payment Retry Logic

Failed payments are retried with exponential backoff:
- Retry 1: After 2 days
- Retry 2: After 4 days
- Retry 3: After 7 days

After 3 failures, subscription moves to `past_due` status.

### Tax Calculation

Tax is calculated based on user location:

```javascript
// For US customer in California
taxRate = 9.0%
amount = $29.99
taxAmount = $29.99 * 0.09 = $2.70
total = $32.69
```

## Scheduled Jobs

### Subscription Renewals (Hourly)
Checks for subscriptions expiring within 24 hours and:
- Generates renewal invoice
- Processes payment
- Updates subscription period
- Handles downgrades/cancellations

### Payment Retries (Every 6 hours)
Retries failed payments that are scheduled for retry based on:
- Retry count < max retries
- Next retry date has passed

### Analytics Refresh (Daily at 2 AM)
Refreshes materialized views for up-to-date analytics

### Data Cleanup (Weekly on Sunday)
- Deletes payment logs older than 1 year
- Marks invoices uncollectible if unpaid for 180+ days

## Error Handling

All errors return consistent JSON format:

```json
{
  "error": "Error type",
  "message": "Human-readable error message"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (e.g., duplicate resource)
- `500` - Internal Server Error

## Security Features

- ✅ Helmet.js for security headers
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ JWT authentication
- ✅ Request validation with Joi
- ✅ SQL injection prevention (parameterized queries)
- ✅ Transaction support for data integrity

## Performance Optimizations

- Connection pooling for database
- Materialized views for analytics
- Strategic database indexes
- Efficient SQL aggregation queries
- Background job processing

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

## Deployment

### Environment Variables

Required for production:
```env
NODE_ENV=production
PORT=3000
DB_HOST=your-db-host
DB_PASSWORD=secure-password
JWT_SECRET=very-secure-secret
STRIPE_SECRET_KEY=your-stripe-key
```

### Database Backups

Regular backups recommended:
```bash
pg_dump subscription_billing > backup.sql
```

### Monitoring

Consider adding:
- Application performance monitoring (APM)
- Error tracking (Sentry)
- Log aggregation (ELK stack)
- Uptime monitoring

## Future Enhancements

- [ ] Stripe webhook integration
- [ ] Email notifications for invoices/receipts
- [ ] Multi-currency support
- [ ] Usage-based billing
- [ ] Dunning management
- [ ] Revenue recognition
- [ ] Tax exemptions for B2B
- [ ] GraphQL API
- [ ] Webhook system for events

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Your repo URL]
- Email: support@example.com
- Documentation: [Your docs URL]

## Acknowledgments

Built with best practices from:
- Stripe's billing architecture
- Chargebee's subscription management
- Industry-standard SaaS billing patterns
