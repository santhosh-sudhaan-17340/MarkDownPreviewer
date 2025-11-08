# Digital Wallet with Transfer Ledger

A production-ready digital wallet system with comprehensive transaction management, fraud detection, KYC verification, and audit capabilities.

## Features

### Core Functionality
- **User Management**: User registration with automatic wallet creation
- **Wallet Operations**: Deposits, withdrawals, and peer-to-peer transfers
- **Transaction Ledger**: Complete audit trail of all transactions
- **KYC Verification**: Multi-level KYC status management

### Advanced Features
- **Strong Transaction Handling**: SERIALIZABLE isolation level with automatic rollback on failure
- **Pessimistic Locking**: Prevents race conditions in concurrent transactions
- **Withdrawal Limits**: Daily withdrawal limits with automatic reset
- **Fraud Detection**:
  - Transaction amount limits
  - Frequency-based detection
  - Rapid withdrawal after deposit detection
  - Risk scoring system
- **Statement Generation**:
  - Flexible filtering by type, status, and date range
  - Full pagination support
  - Export-ready format

### Security Features
- Wallet freeze/unfreeze capabilities
- KYC-gated high-value transactions
- Fraud flagging and blocking
- IP address and user agent tracking
- Optimistic locking for data integrity

## Technology Stack

- **Framework**: Spring Boot 3.2.0
- **Database**: H2 (development), PostgreSQL (production-ready)
- **ORM**: Spring Data JPA / Hibernate
- **Validation**: Jakarta Bean Validation
- **API Documentation**: Springdoc OpenAPI (Swagger)
- **Build Tool**: Maven

## Getting Started

### Prerequisites
- Java 17 or higher
- Maven 3.6+

### Running the Application

```bash
# Build the project
mvn clean package

# Run the application
mvn spring-boot:run

# Or run the JAR
java -jar target/digital-wallet-ledger-1.0.0.jar
```

### Using PostgreSQL (Production)

```bash
# Run with PostgreSQL profile
mvn spring-boot:run -Dspring-boot.run.profiles=postgres

# Or set environment variable
export SPRING_PROFILES_ACTIVE=postgres
mvn spring-boot:run
```

### Accessing the Application

- **Application**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **H2 Console**: http://localhost:8080/h2-console
  - JDBC URL: `jdbc:h2:mem:walletdb`
  - Username: `sa`
  - Password: (leave blank)

## API Endpoints

### User Management

- `POST /api/users/register` - Register a new user
- `GET /api/users/{id}` - Get user by ID
- `GET /api/users/username/{username}` - Get user by username
- `GET /api/users` - Get all users
- `PUT /api/users/{id}/kyc` - Update KYC status

### Wallet Operations

- `GET /api/wallets/user/{userId}` - Get wallet details
- `POST /api/wallets/deposit` - Deposit money
- `POST /api/wallets/withdraw` - Withdraw money
- `POST /api/wallets/transfer` - Transfer between wallets
- `PUT /api/wallets/user/{userId}/freeze` - Freeze wallet
- `PUT /api/wallets/user/{userId}/unfreeze` - Unfreeze wallet

### Transactions & Statements

- `GET /api/transactions/user/{userId}/history` - Get transaction history
- `GET /api/transactions/user/{userId}/statement` - Generate filtered statement
- `GET /api/transactions/reference/{ref}` - Get transaction by reference
- `GET /api/transactions/user/{userId}/flagged` - Get fraud-flagged transactions

## Sample Data

The application automatically loads sample data on startup:

- **Users**: alice, bob, charlie
- **Initial Balances**:
  - Alice: $5,000
  - Bob: $3,000
  - Charlie: $1,000
- **Sample Transfers**: Pre-populated transaction history

## API Usage Examples

### Register a User

```bash
curl -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+1-555-1234"
  }'
```

### Deposit Money

```bash
curl -X POST http://localhost:8080/api/wallets/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "amount": 1000.00,
    "description": "Initial deposit"
  }'
```

### Transfer Money

```bash
curl -X POST http://localhost:8080/api/wallets/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "fromUserId": 1,
    "toUserId": 2,
    "amount": 250.00,
    "description": "Payment for services",
    "ipAddress": "192.168.1.100"
  }'
```

### Generate Statement

```bash
# Get all transactions with pagination
curl "http://localhost:8080/api/transactions/user/1/statement?page=0&size=20"

# Filter by type and date range
curl "http://localhost:8080/api/transactions/user/1/statement?transactionType=TRANSFER_SENT&startDate=2025-01-01T00:00:00&page=0&size=50"
```

## Transaction Isolation & Safety

The application uses **SERIALIZABLE** transaction isolation for all money operations:

```java
@Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
public TransactionResponse transfer(TransferRequest request) {
    // Pessimistic locking prevents concurrent modifications
    // Automatic rollback on any exception
    // Complete audit trail maintained
}
```

### Features:
- **Pessimistic Locking**: Row-level locks prevent concurrent wallet modifications
- **Deadlock Prevention**: Consistent lock ordering (min ID first, max ID second)
- **Optimistic Locking**: Version field on wallets for additional safety
- **Automatic Rollback**: Any exception triggers complete transaction rollback
- **Full Audit Trail**: All transactions recorded, even failed ones

## Fraud Detection

The system includes multi-layered fraud detection:

1. **Amount Limits**: Configurable maximum transaction amount
2. **Frequency Detection**: Maximum transactions per hour
3. **Pattern Analysis**: Rapid withdrawals after deposits
4. **Risk Scoring**: 0-100 score based on multiple factors
5. **Automatic Blocking**: Flagged transactions are blocked

### Configuration

```properties
# In application.properties
wallet.withdrawal.daily-limit=10000.00
wallet.fraud.max-transaction-amount=50000.00
wallet.fraud.max-transactions-per-hour=10
```

## Database Schema

### Main Tables
- `users` - User accounts with KYC status
- `wallets` - User wallet balances and limits
- `transactions` - Complete transaction ledger

### Key Relationships
- One-to-One: User ↔ Wallet
- One-to-Many: Wallet → Transactions
- Self-referencing: Transaction → Counterparty Wallet

## Error Handling

The application provides comprehensive error handling:

- `400 Bad Request` - Validation errors, insufficient balance
- `403 Forbidden` - Frozen wallet, fraud detected, KYC required
- `404 Not Found` - User/wallet/transaction not found
- `500 Internal Server Error` - Unexpected errors

All errors include:
- Timestamp
- HTTP status
- Error type
- Detailed message
- Request path
- Validation details (if applicable)

## Testing

Run the included tests:

```bash
mvn test
```

## Production Deployment

1. Update `application-postgres.properties` with production database credentials
2. Set appropriate limits and fraud detection thresholds
3. Enable production logging configuration
4. Set `spring.jpa.hibernate.ddl-auto=validate` (never use `create-drop` in production)
5. Configure proper security (authentication, authorization)
6. Set up SSL/TLS
7. Configure rate limiting

## License

This project is provided as-is for educational and commercial use.

## Author

Built with Spring Boot and best practices for transaction handling, security, and scalability.
