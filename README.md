# Banking Mini-Core System

A comprehensive banking system implementation demonstrating advanced JDBC transaction management, multiple transaction isolation levels, deadlock handling, and concurrent transaction processing.

## Features

### Core Banking Operations
- **Account Management**: Create and manage bank accounts (Savings, Checking, Business)
- **Deposits**: Add funds to accounts with full transaction tracking
- **Withdrawals**: Remove funds with balance validation and constraints
- **Transfers**: Move money between accounts with atomic operations

### Advanced Transaction Management
- **Multiple Isolation Levels**:
  - `READ_COMMITTED`: For read operations
  - `REPEATABLE_READ`: For deposits and withdrawals
  - `SERIALIZABLE`: For transfers to prevent all anomalies

- **Locking Strategies**:
  - **Pessimistic Locking**: Row-level locks to prevent concurrent modifications
  - **Optimistic Locking**: Version-based conflict detection using `@Version`

- **Deadlock Prevention**:
  - Consistent lock ordering (by account ID) in transfer operations
  - Automatic retry mechanism with exponential backoff
  - Comprehensive deadlock detection and recovery

### Data Integrity
- Full ACID compliance for all transactions
- Audit trail with comprehensive transaction history
- Automatic transaction rollback on failures
- Failed transaction recording for analysis

## Technology Stack

- **Framework**: Spring Boot 3.2.0
- **Java Version**: 17
- **Database**: H2 (in-memory, development) / PostgreSQL (production-ready)
- **ORM**: Spring Data JPA / Hibernate
- **API Documentation**: SpringDoc OpenAPI (Swagger)
- **Build Tool**: Maven
- **Additional**: Lombok, Spring Retry

## Project Structure

```
src/main/java/com/banking/
├── entity/                 # JPA entities
│   ├── Account.java       # Account entity with optimistic locking
│   └── Transaction.java   # Transaction audit entity
├── repository/            # Data access layer
│   ├── AccountRepository.java
│   └── TransactionRepository.java
├── service/               # Business logic layer
│   └── AccountService.java  # Core banking operations
├── controller/            # REST API endpoints
│   └── AccountController.java
├── dto/                   # Data Transfer Objects
│   ├── CreateAccountRequest.java
│   ├── TransactionRequest.java
│   ├── TransferRequest.java
│   ├── AccountResponse.java
│   └── TransactionResponse.java
├── exception/             # Custom exceptions
│   ├── AccountNotFoundException.java
│   ├── InsufficientBalanceException.java
│   ├── InvalidTransactionException.java
│   ├── TransactionRetryException.java
│   └── GlobalExceptionHandler.java
├── config/                # Configuration
│   └── DataLoader.java   # Sample data initialization
└── BankingApplication.java  # Main application class
```

## Getting Started

### Prerequisites
- Java 17 or higher
- Maven 3.6+

### Building the Application

```bash
# Clone the repository
git clone <repository-url>
cd MarkDownPreviewer

# Build the project
mvn clean install

# Run the application
mvn spring-boot:run
```

### Running the Application

The application will start on `http://localhost:8080`

## API Endpoints

### Account Management

#### Create Account
```bash
POST /api/v1/accounts
Content-Type: application/json

{
  "accountNumber": "ACC005",
  "customerName": "Test User",
  "initialBalance": 1000.00,
  "currency": "USD",
  "accountType": "SAVINGS"
}
```

#### Get Account Details
```bash
GET /api/v1/accounts/{accountNumber}
```

#### Get All Accounts
```bash
GET /api/v1/accounts
```

### Transactions

#### Deposit
```bash
POST /api/v1/accounts/deposit
Content-Type: application/json

{
  "accountNumber": "ACC001",
  "amount": 500.00,
  "description": "Salary deposit"
}
```

#### Withdraw
```bash
POST /api/v1/accounts/withdraw
Content-Type: application/json

{
  "accountNumber": "ACC001",
  "amount": 200.00,
  "description": "ATM withdrawal"
}
```

#### Transfer
```bash
POST /api/v1/accounts/transfer
Content-Type: application/json

{
  "fromAccountNumber": "ACC001",
  "toAccountNumber": "ACC002",
  "amount": 1000.00,
  "description": "Money transfer"
}
```

#### Get Transaction History
```bash
GET /api/v1/accounts/{accountNumber}/transactions
```

## Sample Data

The application initializes with four sample accounts:

| Account Number | Customer Name    | Balance    | Type     |
|---------------|------------------|------------|----------|
| ACC001        | John Doe         | $10,000.00 | CHECKING |
| ACC002        | Jane Smith       | $5,000.00  | SAVINGS  |
| ACC003        | Bob Johnson      | $15,000.00 | BUSINESS |
| ACC004        | Alice Williams   | $7,500.00  | CHECKING |

## Transaction Isolation Levels Explained

### 1. READ_COMMITTED (Account Queries)
- Prevents dirty reads
- Other transactions' uncommitted changes are not visible
- Used for: Account lookups, balance checks

### 2. REPEATABLE_READ (Deposits/Withdrawals)
- Prevents dirty reads and non-repeatable reads
- Same query returns same results within transaction
- Used for: Single account modifications

### 3. SERIALIZABLE (Transfers)
- Highest isolation level
- Prevents dirty reads, non-repeatable reads, and phantom reads
- Complete transaction isolation
- Used for: Multi-account operations (transfers)

## Deadlock Handling

The system implements multiple strategies to prevent and handle deadlocks:

### Prevention
1. **Consistent Lock Ordering**: Locks are always acquired in ascending order by account ID
2. **Timeout Configuration**: Transactions have configurable timeouts
3. **Minimal Lock Duration**: Locks are held for the shortest time possible

### Detection & Recovery
1. **Automatic Retry**: Failed transactions are retried up to 3 times
2. **Exponential Backoff**: Retry delays increase exponentially (100ms, 200ms, 400ms)
3. **Transaction Logging**: All deadlocks are logged for analysis

### Example Deadlock Prevention in Transfers:
```java
// Always lock accounts in order by ID to prevent circular dependencies
if (fromAccount.getId() < toAccount.getId()) {
    lock(fromAccount);
    lock(toAccount);
} else {
    lock(toAccount);
    lock(fromAccount);
}
```

## Error Handling

The system provides comprehensive error handling:

| HTTP Status | Exception | Description |
|------------|-----------|-------------|
| 400 | InvalidTransactionException | Invalid transaction parameters |
| 400 | InsufficientBalanceException | Insufficient funds |
| 404 | AccountNotFoundException | Account does not exist |
| 409 | OptimisticLockingFailureException | Concurrent modification detected |
| 409 | TransactionRetryException | Deadlock - retry required |
| 500 | Exception | Unexpected server error |

## Access Points

Once the application is running, you can access:

- **REST API**: http://localhost:8080/api/v1/accounts
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **API Documentation**: http://localhost:8080/api-docs
- **H2 Console**: http://localhost:8080/h2-console
  - JDBC URL: `jdbc:h2:mem:bankingdb`
  - Username: `sa`
  - Password: (leave empty)

## Database Configuration

### Development (H2)
The application uses H2 in-memory database by default. Configuration in `application.properties`:

```properties
spring.datasource.url=jdbc:h2:mem:bankingdb
spring.datasource.username=sa
spring.datasource.password=
```

### Production (PostgreSQL)
To use PostgreSQL, uncomment these lines in `application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/bankingdb
spring.datasource.username=postgres
spring.datasource.password=postgres
```

## Testing Transaction Isolation

### Test Concurrent Deposits
```bash
# Terminal 1
curl -X POST http://localhost:8080/api/v1/accounts/deposit \
  -H "Content-Type: application/json" \
  -d '{"accountNumber":"ACC001","amount":500,"description":"Test 1"}'

# Terminal 2 (simultaneously)
curl -X POST http://localhost:8080/api/v1/accounts/deposit \
  -H "Content-Type: application/json" \
  -d '{"accountNumber":"ACC001","amount":300,"description":"Test 2"}'
```

### Test Deadlock Handling
```bash
# Terminal 1: Transfer from ACC001 to ACC002
curl -X POST http://localhost:8080/api/v1/accounts/transfer \
  -H "Content-Type: application/json" \
  -d '{"fromAccountNumber":"ACC001","toAccountNumber":"ACC002","amount":100}'

# Terminal 2 (simultaneously): Transfer from ACC002 to ACC001
curl -X POST http://localhost:8080/api/v1/accounts/transfer \
  -H "Content-Type: application/json" \
  -d '{"fromAccountNumber":"ACC002","toAccountNumber":"ACC001","amount":100}'
```

## Key Implementation Details

### Pessimistic Locking
```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT a FROM Account a WHERE a.accountNumber = :accountNumber")
Optional<Account> findByAccountNumberWithLock(@Param("accountNumber") String accountNumber);
```

### Optimistic Locking
```java
@Version
@Column(nullable = false)
private Long version;
```

### Retry Mechanism
```java
@Retryable(
    retryFor = {DeadlockLoserDataAccessException.class, CannotAcquireLockException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 100, multiplier = 2)
)
```

## Monitoring and Logs

The application provides detailed logging for:
- All transaction operations
- Deadlock detection and retry attempts
- Balance changes and validations
- Exception handling and error recovery

Check logs at console output or configure file logging in `application.properties`.

## License

This is a demonstration project for educational purposes.

## Contributing

This project demonstrates banking transaction management concepts. Feel free to extend it with additional features like:
- Interest calculation
- Transaction limits
- Multi-currency support
- Account statements
- Scheduled transfers
- Transaction reversal
