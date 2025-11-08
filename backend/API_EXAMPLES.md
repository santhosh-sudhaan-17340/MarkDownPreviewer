# API Usage Examples

This document provides practical examples of using the Subscription & Billing Management Platform API.

## Table of Contents

1. [Complete User Journey](#complete-user-journey)
2. [Subscription Management](#subscription-management)
3. [Payment Processing](#payment-processing)
4. [Coupon Usage](#coupon-usage)
5. [Analytics Queries](#analytics-queries)
6. [Admin Operations](#admin-operations)

## Complete User Journey

### 1. User Signs Up and Creates a Subscription

```bash
# Step 1: Get available plans
curl -X GET http://localhost:3000/api/subscriptions/plans

# Response:
{
  "plans": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Basic",
      "billing_cycle": "monthly",
      "price": 9.99,
      "trial_days": 14
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Pro",
      "billing_cycle": "monthly",
      "price": 29.99,
      "trial_days": 14
    }
  ]
}

# Step 2: Create subscription with trial
curl -X POST http://localhost:3000/api/subscriptions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "550e8400-e29b-41d4-a716-446655440002"
  }'

# Response:
{
  "message": "Subscription created successfully",
  "subscription": {
    "id": "750e8400-e29b-41d4-a716-446655440001",
    "status": "trial",
    "trial_end": "2024-11-22T10:00:00Z",
    "current_period_end": "2024-12-22T10:00:00Z"
  }
}
```

### 2. User Upgrades Plan Mid-Trial

```bash
# Upgrade to Enterprise plan
curl -X POST http://localhost:3000/api/subscriptions/750e8400-e29b-41d4-a716-446655440001/upgrade \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newPlanId": "550e8400-e29b-41d4-a716-446655440003"
  }'

# Response:
{
  "message": "Subscription upgraded successfully",
  "subscription": {
    "id": "750e8400-e29b-41d4-a716-446655440001",
    "status": "trial",
    "plan_id": "550e8400-e29b-41d4-a716-446655440003",
    "price": 99.99
  },
  "prorationAmount": 35.00
}
```

### 3. Trial Ends - First Invoice Created

```bash
# Get pending invoice (auto-generated when trial ends)
curl -X GET http://localhost:3000/api/invoices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "invoices": [
    {
      "id": "850e8400-e29b-41d4-a716-446655440001",
      "invoice_number": "INV-2024-001",
      "status": "open",
      "subtotal": 99.99,
      "tax_amount": 9.00,
      "total": 108.99,
      "due_date": "2024-11-29T10:00:00Z"
    }
  ]
}
```

### 4. Apply Coupon to Invoice

```bash
# Validate coupon first (optional)
curl -X POST http://localhost:3000/api/coupons/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "WELCOME20",
    "invoiceSubtotal": 99.99
  }'

# Response:
{
  "valid": true,
  "discountAmount": 19.998,
  "coupon": {
    "code": "WELCOME20",
    "discount_type": "percentage",
    "discount_value": 20
  }
}

# Apply coupon to invoice
curl -X POST http://localhost:3000/api/invoices/850e8400-e29b-41d4-a716-446655440001/apply-coupon \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "WELCOME20"
  }'

# Response:
{
  "message": "Coupon applied successfully",
  "discountAmount": 19.998,
  "newTotal": 89.00
}
```

### 5. Process Payment

```bash
curl -X POST http://localhost:3000/api/payments/process \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "850e8400-e29b-41d4-a716-446655440001",
    "paymentMethod": {
      "type": "credit_card",
      "details": {
        "last4": "4242",
        "brand": "visa"
      }
    }
  }'

# Response (Success):
{
  "message": "Payment processed successfully",
  "payment": {
    "id": "950e8400-e29b-41d4-a716-446655440001",
    "status": "succeeded",
    "amount": 89.00,
    "gateway_transaction_id": "txn_1234567890"
  }
}

# Response (Failure - will auto-retry):
{
  "error": "Payment failed",
  "message": "Your card was declined"
}
```

## Subscription Management

### Check Current Subscription

```bash
curl -X GET http://localhost:3000/api/subscriptions/my-subscription \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### View Subscription History

```bash
curl -X GET http://localhost:3000/api/subscriptions/750e8400-e29b-41d4-a716-446655440001/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "history": [
    {
      "action": "created",
      "to_plan_name": "Pro",
      "new_price": 29.99,
      "created_at": "2024-11-08T10:00:00Z"
    },
    {
      "action": "upgraded",
      "from_plan_name": "Pro",
      "to_plan_name": "Enterprise",
      "old_price": 29.99,
      "new_price": 99.99,
      "proration_amount": 35.00,
      "created_at": "2024-11-10T14:30:00Z"
    }
  ]
}
```

### Downgrade at End of Period

```bash
curl -X POST http://localhost:3000/api/subscriptions/750e8400-e29b-41d4-a716-446655440001/downgrade \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newPlanId": "550e8400-e29b-41d4-a716-446655440001"
  }'

# Response:
{
  "message": "Downgrade scheduled for end of billing period",
  "subscription": {
    "metadata": {
      "pending_downgrade": {
        "new_plan_id": "550e8400-e29b-41d4-a716-446655440001",
        "new_price": 9.99,
        "scheduled_for": "2024-12-08T10:00:00Z"
      }
    }
  }
}
```

### Cancel Subscription

```bash
# Cancel at end of period (default)
curl -X POST http://localhost:3000/api/subscriptions/750e8400-e29b-41d4-a716-446655440001/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "immediate": false
  }'

# Cancel immediately
curl -X POST http://localhost:3000/api/subscriptions/750e8400-e29b-41d4-a716-446655440001/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "immediate": true
  }'
```

## Payment Processing

### View Payment History

```bash
curl -X GET http://localhost:3000/api/payments?limit=10&offset=0 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### View Payment Details and Logs

```bash
# Get payment details
curl -X GET http://localhost:3000/api/payments/950e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get payment logs (audit trail)
curl -X GET http://localhost:3000/api/payments/950e8400-e29b-41d4-a716-446655440001/logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "logs": [
    {
      "event_type": "created",
      "message": "Payment initiated",
      "created_at": "2024-11-08T10:00:00Z"
    },
    {
      "event_type": "processing",
      "message": "Payment processing",
      "created_at": "2024-11-08T10:00:01Z"
    },
    {
      "event_type": "succeeded",
      "message": "Payment successful",
      "created_at": "2024-11-08T10:00:02Z"
    }
  ]
}
```

### Failed Payment Example

```bash
# When payment fails, system auto-schedules retries
# Check payment status:
curl -X GET http://localhost:3000/api/payments/950e8400-e29b-41d4-a716-446655440005 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "payment": {
    "status": "failed",
    "failure_code": "card_declined",
    "failure_message": "Your card was declined",
    "retry_count": 1,
    "max_retries": 3,
    "next_retry_at": "2024-11-10T10:00:00Z"
  }
}
```

## Coupon Usage

### List Active Coupons

```bash
curl -X GET http://localhost:3000/api/coupons/active
```

### Validate Coupon Before Applying

```bash
curl -X POST http://localhost:3000/api/coupons/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "BLACKFRIDAY",
    "invoiceSubtotal": 99.99
  }'

# Success response:
{
  "valid": true,
  "coupon": {
    "code": "BLACKFRIDAY",
    "discount_type": "percentage",
    "discount_value": 30
  },
  "discountAmount": 29.997
}

# Failure response:
{
  "valid": false,
  "error": "This coupon has expired"
}
```

## Analytics Queries

### Dashboard Overview

```bash
curl -X GET http://localhost:3000/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "subscribers": {
    "active_subscribers": 1250,
    "current_mrr": 42500.00,
    "trial_users": 150,
    "active_users": 1100,
    "past_due_users": 25,
    "canceling_users": 10
  },
  "revenue": {
    "current_month": {
      "total": 45000.00,
      "transaction_count": 1100
    },
    "last_month": {
      "total": 42000.00,
      "transaction_count": 1050
    },
    "growth_rate": 7.14
  },
  "payments": {
    "total_attempts": 1150,
    "successful": 1100,
    "failed": 50,
    "success_rate": 95.65
  },
  "ltv": {
    "average_ltv": 480.50,
    "median_ltv": 350.00,
    "max_ltv": 2500.00
  }
}
```

### Monthly Recurring Revenue

```bash
curl -X GET http://localhost:3000/api/analytics/mrr?months=12 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "mrr": [
    {
      "month": "2024-11-01",
      "active_subscriptions": 1250,
      "mrr": 42500.00,
      "average_mrr_per_user": 34.00
    },
    {
      "month": "2024-10-01",
      "active_subscriptions": 1200,
      "mrr": 40800.00,
      "average_mrr_per_user": 34.00
    }
  ]
}
```

### Churn Analysis

```bash
curl -X GET http://localhost:3000/api/analytics/churn?months=6 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "churn": [
    {
      "month": "2024-11-01",
      "new_subscriptions": 150,
      "canceled_subscriptions": 45,
      "active_subscriptions": 1250,
      "churn_rate_percentage": 3.60,
      "growth_rate_percentage": 12.00
    }
  ]
}
```

### Trial Conversion Rate

```bash
curl -X GET http://localhost:3000/api/analytics/trial-conversion \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "total_trials": 500,
  "converted": 350,
  "conversion_rate": 70.00
}
```

## Admin Operations

### Create New Coupon

```bash
curl -X POST http://localhost:3000/api/admin/coupons \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "NEWYEAR2025",
    "discountType": "percentage",
    "discountValue": 50,
    "validFrom": "2025-01-01T00:00:00Z",
    "validUntil": "2025-01-15T23:59:59Z",
    "maxRedemptions": 500,
    "maxRedemptionsPerUser": 1,
    "minimumAmount": 0,
    "firstTimeOnly": true,
    "description": "New Year 2025 - 50% off for new customers"
  }'
```

### Get Coupon Statistics

```bash
curl -X GET http://localhost:3000/api/admin/coupons/a50e8400-e29b-41d4-a716-446655440001/stats \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Response:
{
  "stats": {
    "code": "WELCOME20",
    "times_redeemed": 245,
    "max_redemptions": 1000,
    "actual_redemptions": 245,
    "total_discount_given": 4899.50,
    "average_discount": 20.00,
    "unique_users": 245
  }
}
```

### Create Tax Rule

```bash
curl -X POST http://localhost:3000/api/admin/tax-rules \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "US",
    "stateCode": "NY",
    "taxName": "New York Sales Tax",
    "taxRate": 8.0,
    "effectiveFrom": "2025-01-01T00:00:00Z",
    "appliesToShipping": false,
    "inclusive": false,
    "description": "NY state sales tax"
  }'
```

### Manually Run Scheduled Jobs

```bash
# Run subscription renewals
curl -X POST http://localhost:3000/api/admin/jobs/renewals/run \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Response:
{
  "message": "Job renewals completed successfully",
  "result": {
    "total": 15,
    "success": 14,
    "failed": 1
  }
}

# Run payment retries
curl -X POST http://localhost:3000/api/admin/jobs/retries/run \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Refresh analytics
curl -X POST http://localhost:3000/api/admin/jobs/analytics/run \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

## Error Responses

### Validation Error

```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "planId",
      "message": "planId is required"
    }
  ]
}
```

### Authentication Error

```json
{
  "error": "Authentication required",
  "message": "No token provided"
}
```

### Business Logic Error

```json
{
  "error": "User already has an active subscription"
}
```

### Optimistic Locking Conflict

```json
{
  "error": "Subscription was modified by another transaction. Please retry."
}
```

## Rate Limiting

The API implements rate limiting:
- **Window**: 15 minutes
- **Max Requests**: 100 per window

Rate limit exceeded response:
```json
{
  "error": "Too many requests",
  "message": "Please try again later"
}
```

## Testing Tips

### Using curl

All examples use curl. For better readability, save responses to files:

```bash
curl -X GET http://localhost:3000/api/subscriptions/plans | jq > plans.json
```

### Using Postman

Import the API into Postman:
1. Create a new collection
2. Add environment variables for tokens
3. Use collection variables for IDs

### Using JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Create subscription
const subscription = await api.post('/subscriptions', {
  planId: 'plan-uuid'
});

// Process payment
const payment = await api.post('/payments/process', {
  invoiceId: 'invoice-uuid',
  paymentMethod: {
    type: 'credit_card'
  }
});
```
