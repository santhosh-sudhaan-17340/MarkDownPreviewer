# P2P Payment App - API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register User
Create a new user account.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "1234567890",
  "password": "securepassword123",
  "fullName": "John Doe",
  "pin": "1234"
}
```

**Validation:**
- email: Valid email format
- phone: 10 digits
- password: Minimum 8 characters
- fullName: Minimum 2 characters
- pin: 4-6 digits

**Success Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": "1234567890",
    "full_name": "John Doe",
    "is_verified": false,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt-token-here"
}
```

**Error Responses:**
- `400`: Validation error
- `409`: Email or phone already registered
- `500`: Registration failed

---

### Login User
Authenticate and receive JWT token.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe"
  },
  "token": "jwt-token-here"
}
```

**Error Responses:**
- `401`: Invalid credentials
- `500`: Login failed

---

### Verify PIN
Verify user's transaction PIN.

**Endpoint:** `POST /auth/verify-pin`
**Auth Required:** Yes

**Request Body:**
```json
{
  "pin": "1234"
}
```

**Success Response (200):**
```json
{
  "valid": true
}
```

---

### Get Profile
Get current user profile.

**Endpoint:** `GET /auth/profile`
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": "1234567890",
    "full_name": "John Doe",
    "is_verified": true,
    "is_active": true
  }
}
```

---

## Payment Endpoints

### Process Payment
Send money to another account.

**Endpoint:** `POST /payments/transfer`
**Auth Required:** Yes

**Request Body:**
```json
{
  "senderAccountId": "uuid",
  "receiverAccountId": "uuid",
  "amount": 1000.00,
  "description": "Payment for services",
  "pin": "1234"
}
```

**Validation:**
- senderAccountId: Valid UUID
- receiverAccountId: Valid UUID
- amount: Positive number
- pin: 4-6 digits

**Success Response (201):**
```json
{
  "message": "Payment processed successfully",
  "transaction": {
    "id": "uuid",
    "transaction_ref": "TXN1234567890ABC",
    "sender_account_id": "uuid",
    "receiver_account_id": "uuid",
    "amount": 1000.00,
    "currency": "INR",
    "transaction_type": "P2P",
    "status": "SUCCESS",
    "description": "Payment for services",
    "fraud_score": 15.5,
    "is_flagged": false,
    "retry_count": 0,
    "created_at": "2024-01-01T00:00:00.000Z",
    "completed_at": "2024-01-01T00:00:01.000Z"
  }
}
```

**Error Responses:**
- `400`: Validation error or payment failed
- `401`: Invalid PIN
- `500`: Internal server error

**Fraud Detection:**
The system automatically calculates a fraud score:
- Score >= 70: Transaction blocked
- Score 50-69: Flagged for manual review
- Score < 50: Processed normally

---

### Get Transaction History
Retrieve user's transaction history.

**Endpoint:** `GET /payments/transactions?limit=50`
**Auth Required:** Yes

**Query Parameters:**
- `limit` (optional): Number of transactions (default: 50)

**Success Response (200):**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "transaction_ref": "TXN1234567890ABC",
      "amount": 1000.00,
      "currency": "INR",
      "transaction_type": "P2P",
      "status": "SUCCESS",
      "description": "Payment for services",
      "sender_account": "1234567890",
      "receiver_account": "0987654321",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Get Transaction Details
Get specific transaction by ID.

**Endpoint:** `GET /payments/transactions/:transactionId`
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "transaction": {
    "id": "uuid",
    "transaction_ref": "TXN1234567890ABC",
    "amount": 1000.00,
    "status": "SUCCESS",
    "sender_account": "1234567890",
    "receiver_account": "0987654321"
  }
}
```

**Error Responses:**
- `404`: Transaction not found
- `500`: Internal server error

---

## QR Code Endpoints

### Generate QR Code
Create QR code for receiving payment.

**Endpoint:** `POST /qr/generate`
**Auth Required:** Yes

**Request Body:**
```json
{
  "accountId": "uuid",
  "amount": 500.00,
  "description": "Payment request",
  "expiresInMinutes": 30
}
```

**Validation:**
- accountId: Valid UUID (required)
- amount: Positive number (optional, creates dynamic QR if omitted)
- description: String (optional)
- expiresInMinutes: Positive number (optional)

**Success Response (201):**
```json
{
  "message": "QR code generated successfully",
  "qrCode": {
    "id": "uuid",
    "user_id": "uuid",
    "account_id": "uuid",
    "qr_data": "{\"type\":\"UPI_PAYMENT\",...}",
    "amount": 500.00,
    "is_dynamic": false,
    "is_active": true,
    "expires_at": "2024-01-01T01:00:00.000Z",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "qrImage": "data:image/png;base64,..."
}
```

---

### Validate QR Code
Validate a QR code before payment.

**Endpoint:** `POST /qr/validate`
**Auth Required:** Yes

**Request Body:**
```json
{
  "qrDataString": "{\"type\":\"UPI_PAYMENT\",...}"
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "qrCode": {
    "id": "uuid",
    "amount": 500.00,
    "is_dynamic": false
  },
  "qrData": {
    "type": "UPI_PAYMENT",
    "accountId": "uuid",
    "amount": 500.00
  }
}
```

**Error Response:**
```json
{
  "valid": false,
  "error": "QR code has expired"
}
```

---

### Pay via QR Code
Make payment using QR code.

**Endpoint:** `POST /qr/pay`
**Auth Required:** Yes

**Request Body:**
```json
{
  "qrDataString": "{\"type\":\"UPI_PAYMENT\",...}",
  "senderAccountId": "uuid",
  "pin": "1234",
  "amount": 500.00
}
```

**Note:** `amount` is required for dynamic QR codes only.

**Success Response (201):**
```json
{
  "message": "QR payment successful",
  "transaction": {
    "id": "uuid",
    "transaction_ref": "TXN1234567890ABC",
    "status": "SUCCESS",
    "amount": 500.00
  }
}
```

---

### Get User QR Codes
Retrieve all QR codes for current user.

**Endpoint:** `GET /qr/my-codes`
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "qrCodes": [
    {
      "id": "uuid",
      "amount": 500.00,
      "is_dynamic": false,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Deactivate QR Code
Deactivate a QR code.

**Endpoint:** `DELETE /qr/:qrCodeId`
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "message": "QR code deactivated successfully"
}
```

---

## Dispute Endpoints

### Create Dispute
Raise a dispute for a transaction.

**Endpoint:** `POST /disputes`
**Auth Required:** Yes

**Request Body:**
```json
{
  "transactionId": "uuid",
  "disputeType": "UNAUTHORIZED",
  "description": "I did not authorize this transaction. My phone was stolen."
}
```

**Dispute Types:**
- `UNAUTHORIZED`: Unauthorized transaction
- `AMOUNT_MISMATCH`: Wrong amount charged
- `NOT_RECEIVED`: Payment not received
- `DUPLICATE`: Duplicate transaction
- `OTHER`: Other issues

**Validation:**
- description: Minimum 10 characters

**Success Response (201):**
```json
{
  "message": "Dispute created successfully",
  "dispute": {
    "id": "uuid",
    "transaction_id": "uuid",
    "raised_by_user_id": "uuid",
    "dispute_type": "UNAUTHORIZED",
    "description": "I did not authorize this transaction",
    "status": "OPEN",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Get User Disputes
Retrieve all disputes for current user.

**Endpoint:** `GET /disputes`
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "disputes": [
    {
      "id": "uuid",
      "transaction_ref": "TXN1234567890ABC",
      "amount": 1000.00,
      "dispute_type": "UNAUTHORIZED",
      "status": "OPEN",
      "description": "I did not authorize this transaction",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Get Dispute Statistics
Get dispute statistics for analytics.

**Endpoint:** `GET /disputes/statistics`
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "statistics": {
    "open_count": 5,
    "under_review_count": 3,
    "resolved_count": 42,
    "rejected_count": 8,
    "unauthorized_count": 15,
    "amount_mismatch_count": 10,
    "not_received_count": 7
  }
}
```

---

### Get Dispute Details
Get specific dispute by ID.

**Endpoint:** `GET /disputes/:disputeId`
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "dispute": {
    "id": "uuid",
    "transaction_ref": "TXN1234567890ABC",
    "amount": 1000.00,
    "dispute_type": "UNAUTHORIZED",
    "status": "OPEN",
    "description": "I did not authorize this transaction"
  }
}
```

---

## Error Handling

All endpoints may return these error responses:

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "User not verified"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

---

## Rate Limiting

- Window: 15 minutes
- Max requests: 100 per window
- Applies to all `/api/*` endpoints

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","phone":"1234567890","password":"password123","fullName":"Test User","pin":"1234"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Make Payment
```bash
curl -X POST http://localhost:3000/api/payments/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"senderAccountId":"uuid","receiverAccountId":"uuid","amount":100,"description":"Test","pin":"1234"}'
```
