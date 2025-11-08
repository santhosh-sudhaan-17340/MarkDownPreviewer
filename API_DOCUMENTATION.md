# API Documentation

Complete API reference for the Subscription & Billing Management Platform.

## Base URL
```
http://localhost:3000/api
```

## Response Format
All endpoints return JSON in this format:
```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Subscription Plans

### List All Plans
```
GET /plans
```

Query Parameters:
- `billing_period` (optional): Filter by `monthly` or `yearly`

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Basic Monthly",
      "description": "Basic plan",
      "billing_period": "monthly",
      "price": 9.99,
      "trial_days": 14,
      "features": { "max_users": 1, "storage_gb": 5 },
      "is_active": true
    }
  ]
}
```

### Create Plan
```
POST /plans
```

Request Body:
```json
{
  "name": "Pro Monthly",
  "description": "Professional plan",
  "billing_period": "monthly",
  "price": 29.99,
  "trial_days": 14,
  "features": {
    "max_users": 5,
    "storage_gb": 50,
    "support": "priority"
  }
}
```

---

## Subscriptions

### Create Subscription
```
POST /subscriptions
```

Request Body:
```json
{
  "user_id": "user-uuid",
  "plan_id": "plan-uuid",
  "start_date": "2024-01-01T00:00:00Z" // optional
}
```

Response includes trial information if applicable.

### Change Plan (Upgrade/Downgrade)
```
POST /subscriptions/:id/change-plan
```

Request Body:
```json
{
  "new_plan_id": "new-plan-uuid",
  "immediate": true // true for immediate, false for end of period
}
```

Response:
```json
{
  "success": true,
  "data": { /* updated subscription */ },
  "proration_amount": 15.48 // positive = charge, negative = credit
}
```

**Optimistic Locking**: Returns 409 status if subscription was modified:
```json
{
  "success": false,
  "error": "Subscription was modified by another transaction",
  "retry": true
}
```

### Cancel Subscription
```
POST /subscriptions/:id/cancel
```

Request Body:
```json
{
  "immediate": false // false = cancel at period end
}
```

### Get Subscription History
```
GET /subscriptions/:id/history
```

Returns audit trail of all subscription changes:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "subscription_id": "sub-uuid",
      "action": "plan_changed",
      "old_plan_id": "old-plan-uuid",
      "new_plan_id": "new-plan-uuid",
      "old_status": "active",
      "new_status": "active",
      "proration_amount": 15.48,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Invoices

### Create Invoice
```
POST /invoices
```

Request Body:
```json
{
  "subscription_id": "sub-uuid",
  "coupon_code": "WELCOME20", // optional
  "country_code": "US", // optional, for tax
  "state_code": "CA" // optional, for tax
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice_number": "INV-1234567890-1234",
    "subscription_id": "sub-uuid",
    "user_id": "user-uuid",
    "status": "open",
    "subtotal": 29.99,
    "tax_amount": 2.17,
    "discount_amount": 6.00,
    "total": 26.16,
    "currency": "USD",
    "billing_period_start": "2024-01-01T00:00:00Z",
    "billing_period_end": "2024-02-01T00:00:00Z",
    "due_date": "2024-02-01T00:00:00Z"
  }
}
```

### Get Invoice Line Items
```
GET /invoices/:id/line-items
```

Returns detailed breakdown:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "invoice_id": "inv-uuid",
      "description": "Pro Monthly - monthly subscription",
      "quantity": 1,
      "unit_price": 29.99,
      "amount": 29.99,
      "proration": false,
      "period_start": "2024-01-01T00:00:00Z",
      "period_end": "2024-02-01T00:00:00Z"
    },
    {
      "description": "Proration for plan upgrade",
      "amount": 15.48,
      "proration": true
    }
  ]
}
```

---

## Payments

### Create and Process Payment
```
POST /payments
```

Request Body:
```json
{
  "invoice_id": "inv-uuid",
  "subscription_id": "sub-uuid",
  "user_id": "user-uuid",
  "amount": 26.16,
  "payment_method": "credit_card",
  "payment_gateway": "stripe" // optional
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice_id": "inv-uuid",
    "amount": 26.16,
    "status": "succeeded", // or "failed"
    "gateway_transaction_id": "txn_abc123",
    "retry_count": 0,
    "next_retry_at": null
  }
}
```

For failed payments:
```json
{
  "status": "failed",
  "failure_code": "insufficient_funds",
  "failure_message": "Insufficient funds in account",
  "retry_count": 1,
  "next_retry_at": "2024-01-02T10:30:00Z"
}
```

### Get Payment Retry Logs
```
GET /payments/:id/retry-logs
```

### Retry Failed Payment
```
POST /payments/:id/retry
```

### Batch Retry All Failed Payments
```
POST /payments/retry-failed/batch
```

Triggers retry for all payments with `next_retry_at <= now`.

---

## Coupons

### Validate Coupon
```
POST /coupons/validate
```

Request Body:
```json
{
  "code": "WELCOME20",
  "plan_id": "plan-uuid" // optional
}
```

Response:
```json
{
  "success": true,
  "is_valid": true,
  "data": {
    "id": "uuid",
    "code": "WELCOME20",
    "discount_type": "percentage",
    "discount_value": 20,
    "valid_from": "2024-01-01T00:00:00Z",
    "valid_until": "2024-03-31T23:59:59Z",
    "max_redemptions": 1000,
    "current_redemptions": 45
  }
}
```

Invalid coupon:
```json
{
  "success": false,
  "is_valid": false,
  "error": "Coupon has expired"
}
```

### Calculate Discount
```
POST /coupons/calculate-discount
```

Request Body:
```json
{
  "code": "WELCOME20",
  "amount": 100,
  "plan_id": "plan-uuid"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "original_amount": 100,
    "discount_amount": 20,
    "final_amount": 80,
    "coupon": { /* coupon details */ }
  }
}
```

---

## Tax Rules

### Calculate Tax
```
POST /tax-rules/calculate
```

Request Body:
```json
{
  "amount": 100,
  "country_code": "US",
  "state_code": "CA"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "subtotal": 100,
    "tax_amount": 7.25,
    "total": 107.25,
    "tax_rule": {
      "country_code": "US",
      "state_code": "CA",
      "tax_rate": 0.0725,
      "tax_name": "California Sales Tax"
    }
  }
}
```

---

## Analytics

### Revenue Analytics
```
GET /analytics/revenue?start_date=2024-01-01&end_date=2024-12-31
```

Response:
```json
{
  "success": true,
  "data": {
    "total_revenue": 125450.75,
    "monthly_recurring_revenue": 9875.50,
    "annual_recurring_revenue": 118506.00,
    "active_subscriptions": 342,
    "trial_subscriptions": 28,
    "churned_subscriptions": 15,
    "average_revenue_per_user": 28.88,
    "period_start": "2024-01-01T00:00:00Z",
    "period_end": "2024-12-31T23:59:59Z"
  }
}
```

### Revenue by Plan
```
GET /analytics/revenue-by-plan?start_date=2024-01-01&end_date=2024-12-31
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "plan_id": "uuid",
      "plan_name": "Pro Monthly",
      "billing_period": "monthly",
      "subscription_count": 150,
      "total_revenue": 54750.00,
      "average_invoice_amount": 29.99
    }
  ]
}
```

### Subscription Growth
```
GET /analytics/subscription-growth?start_date=2024-01-01&end_date=2024-01-31
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01T00:00:00Z",
      "new_subscriptions": 15,
      "canceled_subscriptions": 2,
      "net_growth": 13
    }
  ]
}
```

### Churn Rate
```
GET /analytics/churn-rate?start_date=2024-01-01&end_date=2024-01-31
```

Response:
```json
{
  "success": true,
  "data": {
    "churn_rate": 4.35, // percentage
    "period_start": "2024-01-01T00:00:00Z",
    "period_end": "2024-01-31T23:59:59Z"
  }
}
```

### Payment Success Rate
```
GET /analytics/payment-success-rate?start_date=2024-01-01&end_date=2024-12-31
```

Response:
```json
{
  "success": true,
  "data": {
    "total_payments": 1250,
    "successful_payments": 1180,
    "failed_payments": 70,
    "success_rate": 94.4,
    "average_retry_count": 1.2
  }
}
```

### Coupon Usage Statistics
```
GET /analytics/coupon-usage?start_date=2024-01-01&end_date=2024-12-31
```

### Tax Collection Summary
```
GET /analytics/tax-collection?start_date=2024-01-01&end_date=2024-12-31
```

### Customer Lifetime Value
```
GET /analytics/lifetime-value
```

Response:
```json
{
  "success": true,
  "data": {
    "estimated_lifetime_value": 687.50
  }
}
```

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 404 | Not Found |
| 409 | Conflict (optimistic lock failure) |
| 500 | Internal Server Error |

## Rate Limiting

Currently not implemented. Add rate limiting middleware for production.

## Authentication

Currently not implemented. Add authentication middleware (JWT, OAuth) for production.
