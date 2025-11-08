# P2P Payment App - Secure UPI-like Payment System

A comprehensive peer-to-peer payment application with instant transfers, fraud monitoring, transaction retries, dispute resolution, multi-bank support, and QR-based payments.

## Features

### Core Features
- **Instant P2P Transfers**: Real-time money transfers between users
- **Fraud Monitoring**: Advanced fraud detection with risk scoring
- **Transaction Retry**: Automatic retry mechanism with exponential backoff
- **Dispute Resolution**: Complete dispute management workflow
- **Multi-Bank Support**: Integration with multiple banks (simulated)
- **QR Code Payments**: Generate and scan QR codes for payments
- **Secure Authentication**: JWT-based authentication with PIN protection
- **Transaction History**: Complete transaction tracking and history

### Security Features
- Bcrypt password hashing (12 rounds)
- JWT token-based authentication
- PIN-based transaction authorization
- Rate limiting to prevent abuse
- Helmet.js security headers
- CORS protection
- Input validation with Joi

### Fraud Detection
- Large transaction amount detection
- High-frequency transaction monitoring
- Daily transaction limit checks
- First-time receiver validation
- Unusual timing detection
- Risk scoring (0-100 scale)
- Automatic blocking of high-risk transactions
- Manual review flagging for medium-risk transactions

## Quick Start

```bash
npm install
cp .env.example .env
# Configure your database in .env
createdb p2p_payment
psql -d p2p_payment -f src/database/schema.sql
npm run dev
```

Visit `http://localhost:3000` to access the application.

For detailed setup instructions, see [SETUP.md](SETUP.md)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-pin` - Verify transaction PIN
- `GET /api/auth/profile` - Get user profile

### Payments
- `POST /api/payments/transfer` - Process payment
- `GET /api/payments/transactions` - Get transaction history
- `GET /api/payments/transactions/:id` - Get transaction details

### QR Codes
- `POST /api/qr/generate` - Generate QR code
- `POST /api/qr/validate` - Validate QR code
- `POST /api/qr/pay` - Pay via QR code
- `GET /api/qr/my-codes` - Get user QR codes
- `DELETE /api/qr/:id` - Deactivate QR code

### Disputes
- `POST /api/disputes` - Create dispute
- `GET /api/disputes` - Get user disputes
- `GET /api/disputes/statistics` - Get dispute statistics
- `GET /api/disputes/:id` - Get dispute details

## Technology Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT, Bcrypt
- **Frontend**: HTML, CSS, JavaScript
- **QR Codes**: qrcode library
- **Security**: Helmet, CORS, Rate Limiting

## Architecture

The application follows a clean architecture with:
- Controllers for request handling
- Services for business logic
- Middleware for authentication and validation
- Database layer with connection pooling
- Comprehensive error handling and logging

## Key Features Implementation

### Fraud Detection Algorithm
Risk score calculation based on multiple factors with automatic blocking for high-risk transactions.

### Transaction Retry System
Exponential backoff strategy with configurable retry attempts and smart error classification.

### Multi-Bank Integration
Supports both intra-bank and inter-bank transfers with health monitoring.

### QR Code Payments
Dynamic and static QR codes with expiry and usage tracking.

## License

MIT
