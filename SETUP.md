# P2P Payment App - Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database

#### Create Database
```bash
createdb p2p_payment
```

#### Run Schema
```bash
psql -d p2p_payment -f src/database/schema.sql
```

#### Seed Sample Data (Optional)
```sql
-- Insert sample banks
INSERT INTO bank_integrations (bank_name, bank_code, api_endpoint, health_status)
VALUES
  ('HDFC Bank', 'HDFC', 'https://api.hdfc.example.com', 'HEALTHY'),
  ('ICICI Bank', 'ICICI', 'https://api.icici.example.com', 'HEALTHY'),
  ('SBI', 'SBI', 'https://api.sbi.example.com', 'HEALTHY'),
  ('Axis Bank', 'AXIS', 'https://api.axis.example.com', 'HEALTHY');
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=p2p_payment
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_very_secure_secret_key_here
```

### 4. Run Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm run build
npm start
```

### 5. Access Application
- Frontend: http://localhost:3000
- API Docs: http://localhost:3000/api
- Health Check: http://localhost:3000/health

## Testing the Application

### 1. Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "phone": "9876543210",
    "password": "securepass123",
    "fullName": "Alice Smith",
    "pin": "1234"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "securepass123"
  }'
```

Save the token from the response.

### 3. Create Sample Bank Accounts
You'll need to manually insert bank accounts for testing:

```sql
-- Alice's account
INSERT INTO bank_accounts (user_id, bank_name, account_number, ifsc_code, account_holder_name, account_type, is_primary, is_verified, balance)
VALUES
  ('<alice-user-id>', 'HDFC Bank', '1234567890', 'HDFC0001234', 'Alice Smith', 'SAVINGS', true, true, 10000.00);

-- Bob's account (for receiving payments)
INSERT INTO users (email, phone, password_hash, full_name, pin_hash, is_verified)
VALUES ('bob@example.com', '9876543211', '<password-hash>', 'Bob Jones', '<pin-hash>', true);

INSERT INTO bank_accounts (user_id, bank_name, account_number, ifsc_code, account_holder_name, account_type, is_primary, is_verified, balance)
VALUES
  ('<bob-user-id>', 'ICICI Bank', '0987654321', 'ICIC0005678', 'Bob Jones', 'SAVINGS', true, true, 5000.00);
```

### 4. Make a Payment
```bash
curl -X POST http://localhost:3000/api/payments/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "senderAccountId": "<alice-account-id>",
    "receiverAccountId": "<bob-account-id>",
    "amount": 500.00,
    "description": "Test payment",
    "pin": "1234"
  }'
```

### 5. Generate QR Code
```bash
curl -X POST http://localhost:3000/api/qr/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "accountId": "<your-account-id>",
    "amount": 100.00,
    "description": "Payment request",
    "expiresInMinutes": 30
  }'
```

### 6. View Transactions
```bash
curl http://localhost:3000/api/payments/transactions \
  -H "Authorization: Bearer <your-token>"
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep p2p_payment

# Test connection
psql -d p2p_payment -c "SELECT 1;"
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Module Not Found Errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Compilation Errors
```bash
# Clean build
rm -rf dist
npm run build
```

## Development Tips

### Enable Debug Logging
```env
NODE_ENV=development
```

### Database Migrations
For schema changes, update `src/database/schema.sql` and re-run:
```bash
psql -d p2p_payment -f src/database/schema.sql
```

### Hot Reload
The development server uses `ts-node-dev` for hot reload. Just save your files and the server will restart.

### Testing Fraud Detection
To trigger fraud alerts, try:
1. Large amount (> 50000)
2. Multiple transactions quickly (> 10 per hour)
3. High daily volume (> 200000)
4. Late night transactions (12 AM - 6 AM)

### Testing Transaction Retries
To simulate retry scenarios:
1. Temporarily reduce account balance
2. Make payment that exceeds balance
3. System will retry and fail appropriately

## Production Deployment

### Environment Configuration
```env
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
DB_PASSWORD=<secure-password>
```

### Security Checklist
- [ ] Change JWT_SECRET to strong random value
- [ ] Use strong database password
- [ ] Enable SSL for database connection
- [ ] Configure CORS for specific origins
- [ ] Set up rate limiting appropriately
- [ ] Enable HTTPS
- [ ] Set up logging and monitoring
- [ ] Configure backup strategy
- [ ] Review and adjust fraud thresholds

### Recommended Infrastructure
- PostgreSQL with replication
- Redis for caching (future)
- Load balancer for scaling
- CDN for static assets
- Monitoring (Prometheus/Grafana)
- Logging (ELK stack)

## Next Steps

1. Implement email notifications
2. Add SMS OTP verification
3. Integrate real bank APIs
4. Add analytics dashboard
5. Implement refund mechanism
6. Add recurring payments
7. Implement wallet system
8. Add multi-currency support
