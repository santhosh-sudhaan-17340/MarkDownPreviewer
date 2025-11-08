# Crowdfunding Platform Backend

A comprehensive crowdfunding platform backend built with Java, featuring secure authentication, role-based access control, ACID-compliant transactions, payment workflow simulation, and advanced analytics.

## Features

### Core Functionality
- **User Authentication & Authorization**
  - Secure user registration with BCrypt password hashing
  - JWT-based authentication with token expiration
  - Role-based access control (USER, ADMIN)
  - Session management

- **Campaign Management**
  - Create and manage fundraising campaigns
  - Category-based organization
  - Campaign status tracking (ACTIVE, COMPLETED, SUSPENDED, CANCELLED)
  - Real-time progress tracking
  - Search and filtering capabilities

- **Contribution System**
  - **ACID-compliant transactions** using JDBC
  - Payment workflow simulation with configurable success rates
  - Multiple payment methods (Credit Card, Debit Card, PayPal, Bank Transfer)
  - Anonymous contributions support
  - Refund processing

- **Advanced Analytics**
  - Platform-wide statistics (total funds, campaigns, users)
  - Top campaigns by funds raised
  - Top campaigns by contributor count
  - Category-wise analytics
  - Contribution trends over time
  - User contribution statistics
  - Campaign-specific detailed analytics

- **Admin Features**
  - Fraud detection system with automated alerts
  - Campaign suspension and reactivation
  - Fraud alert dashboard (severity-based)
  - Manual campaign review workflow
  - Comprehensive audit logging

### Technical Highlights

- **Database Optimization**
  - HikariCP connection pooling for high performance
  - Strategic indexes on frequently queried columns
  - Materialized views for complex analytics
  - Database triggers for automatic calculations
  - Composite indexes for paginated queries

- **Transaction Management**
  - JDBC transaction isolation (SERIALIZABLE)
  - Automatic rollback on errors
  - Atomicity guaranteed for contribution processing
  - Database triggers ensure consistency

- **Security**
  - BCrypt password hashing (12 rounds)
  - JWT tokens with configurable expiration
  - SQL injection prevention with prepared statements
  - Role-based access control

## Project Structure

```
crowdfunding-platform/
├── database/
│   └── schema.sql                 # Database schema with indexes and triggers
├── src/main/
│   ├── java/com/crowdfunding/
│   │   ├── config/
│   │   │   └── DatabaseConfig.java        # Connection pooling configuration
│   │   ├── dao/
│   │   │   ├── UserDAO.java               # User data access
│   │   │   ├── CampaignDAO.java           # Campaign data access (optimized queries)
│   │   │   ├── ContributionDAO.java       # Contribution data access
│   │   │   └── FraudAlertDAO.java         # Fraud alert data access
│   │   ├── model/
│   │   │   ├── User.java                  # User entity
│   │   │   ├── Campaign.java              # Campaign entity
│   │   │   ├── Contribution.java          # Contribution entity
│   │   │   └── FraudAlert.java            # Fraud alert entity
│   │   ├── security/
│   │   │   ├── PasswordHasher.java        # BCrypt password hashing
│   │   │   └── JWTUtil.java               # JWT token management
│   │   ├── service/
│   │   │   ├── AuthenticationService.java # Authentication & authorization
│   │   │   ├── CampaignService.java       # Campaign business logic
│   │   │   ├── ContributionService.java   # ACID transaction handling
│   │   │   ├── PaymentService.java        # Payment simulation
│   │   │   ├── AnalyticsService.java      # Analytics & reporting
│   │   │   └── AdminService.java          # Admin & fraud detection
│   │   └── CrowdfundingApplication.java   # Demo application
│   └── resources/
│       └── application.properties         # Configuration
├── pom.xml                                # Maven dependencies
└── README.md
```

## Database Schema

### Tables
- **users** - User accounts with role-based access
- **campaigns** - Fundraising campaigns with status tracking
- **contributions** - Donation records with payment status
- **fraud_alerts** - Automated fraud detection alerts
- **audit_logs** - Admin action audit trail
- **user_sessions** - Session management
- **campaign_updates** - Campaign milestone tracking

### Indexes (Optimized for Performance)
- `idx_users_email` - Fast authentication lookups
- `idx_campaigns_status_created` - Optimized paginated queries
- `idx_campaigns_current_amount` - Top campaigns by funds
- `idx_contributions_campaign` - Campaign contribution queries
- Plus 15+ additional strategic indexes

### Database Triggers
- **update_campaign_amount()** - Automatically updates campaign totals on contribution
- **check_fraud_patterns()** - Automated fraud detection on contributions

## Setup Instructions

### Prerequisites
- Java 11 or higher
- PostgreSQL 12 or higher
- Maven 3.6 or higher

### Database Setup

1. Create PostgreSQL database:
```bash
createdb crowdfunding_db
```

2. Run the schema:
```bash
psql crowdfunding_db < database/schema.sql
```

3. Update database credentials in `src/main/resources/application.properties`:
```properties
db.url=jdbc:postgresql://localhost:5432/crowdfunding_db
db.username=your_username
db.password=your_password
```

### Build and Run

1. Build the project:
```bash
mvn clean install
```

2. Run the demo application:
```bash
mvn exec:java -Dexec.mainClass="com.crowdfunding.CrowdfundingApplication"
```

## Configuration

All configuration is in `application.properties`:

```properties
# Database Connection
db.url=jdbc:postgresql://localhost:5432/crowdfunding_db
db.username=postgres
db.password=postgres

# Connection Pool (HikariCP)
db.pool.maximumPoolSize=10
db.pool.minimumIdle=5
db.pool.connectionTimeout=30000

# JWT Authentication
jwt.secret=your-secret-key-change-this-in-production
jwt.expiration=86400000  # 24 hours

# Payment Simulation
payment.simulation.success.rate=0.95  # 95% success rate
payment.simulation.processing.delay=2000  # 2 seconds

# Fraud Detection
fraud.contribution.max.amount=10000
fraud.contribution.max.per.hour=10
```

## Key Features Demonstration

### 1. ACID-Compliant Transactions

The contribution system demonstrates full ACID compliance:

```java
// ContributionService.java demonstrates:
// - Atomicity: All or nothing transaction execution
// - Consistency: Database constraints maintained
// - Isolation: TRANSACTION_SERIALIZABLE level
// - Durability: Changes persisted to database

Connection conn = DatabaseConfig.getConnection();
conn.setAutoCommit(false);
conn.setTransactionIsolation(Connection.TRANSACTION_SERIALIZABLE);

try {
    // Create contribution record
    Long contributionId = contributionDAO.createContribution(conn, contribution);

    // Process payment
    PaymentResult result = paymentService.processPayment(...);

    // Update status (triggers automatic campaign amount update)
    contributionDAO.updateContributionStatus(conn, contributionId, status);

    // COMMIT - all changes applied atomically
    conn.commit();
} catch (Exception e) {
    // ROLLBACK - no changes applied
    conn.rollback();
}
```

### 2. Optimized Pagination

Campaign listing uses database indexes for optimal performance:

```java
// Uses composite index: idx_campaigns_status_created
List<Campaign> campaigns = campaignDAO.findAllPaginated(
    page, pageSize, status, category
);

// Returns:
// - campaigns (paginated results)
// - totalPages, currentPage
// - hasNext, hasPrevious flags
```

### 3. Fraud Detection

Automated fraud detection with database triggers:

```sql
-- Automatic fraud alerts on:
-- - Rapid contributions (>10 per hour)
-- - Large amounts (>$10,000)
-- - Suspicious patterns
```

Admin dashboard for reviewing alerts:
```java
AdminService.FraudDashboard dashboard = adminService.getFraudDashboard();
// Returns pending alerts, high severity alerts, counts
```

### 4. Analytics

Comprehensive analytics with optimized queries:

```java
// Platform statistics
Map<String, Object> stats = analyticsService.getPlatformStats();

// Top campaigns by funds (uses idx_campaigns_current_amount)
List<Map<String, Object>> topCampaigns =
    analyticsService.getTopCampaignsByFunds(10);

// Campaign-specific analytics
Map<String, Object> analytics =
    analyticsService.getCampaignAnalytics(campaignId);
```

## API Usage Examples

### User Registration
```java
AuthenticationService authService = new AuthenticationService();
Map<String, Object> response = authService.register(
    "username", "email@example.com", "password", "Full Name"
);
String token = (String) response.get("token");
```

### Create Campaign
```java
CampaignService campaignService = new CampaignService();
Campaign campaign = campaignService.createCampaign(
    userId,
    "Campaign Title",
    "Description",
    new BigDecimal("10000.00"),
    "Category",
    LocalDateTime.now().plusDays(30)
);
```

### Make Contribution (ACID Transaction)
```java
ContributionService contributionService = new ContributionService();
Contribution contribution = contributionService.contribute(
    campaignId,
    userId,
    new BigDecimal("100.00"),
    "CREDIT_CARD",
    false,  // not anonymous
    "Supporting this cause!"
);
```

### Admin: Suspend Campaign
```java
AdminService adminService = new AdminService();
adminService.suspendCampaign(
    campaignId,
    "Suspicious activity detected",
    adminUserId
);
```

## Security Features

1. **Password Security**
   - BCrypt hashing with 12 rounds
   - Salted hashes stored in database

2. **Authentication**
   - JWT tokens with expiration
   - Token validation on each request
   - Role-based access control

3. **SQL Injection Prevention**
   - Prepared statements for all queries
   - Input validation and sanitization

4. **Transaction Security**
   - SERIALIZABLE isolation level
   - Automatic rollback on errors
   - Audit logging for admin actions

## Performance Optimizations

1. **Connection Pooling**
   - HikariCP for efficient connection management
   - Configurable pool size and timeouts

2. **Database Indexes**
   - 20+ strategic indexes
   - Composite indexes for complex queries
   - Covering indexes for frequently accessed columns

3. **Materialized Views**
   - Pre-computed analytics for faster queries
   - Refreshable for updated data

4. **Query Optimization**
   - Efficient JOIN strategies
   - Pagination to limit result sets
   - Selective column retrieval

## Testing

Run the demo application to test all features:

```bash
mvn exec:java -Dexec.mainClass="com.crowdfunding.CrowdfundingApplication"
```

The demo demonstrates:
- User registration and authentication
- Campaign creation and management
- Contribution processing with ACID transactions
- Analytics and reporting
- Admin fraud detection features

## Technology Stack

- **Java 11** - Core language
- **JDBC** - Database connectivity with transaction management
- **PostgreSQL** - Relational database
- **HikariCP** - High-performance connection pooling
- **BCrypt** - Password hashing
- **JWT (jjwt)** - Token-based authentication
- **Gson** - JSON serialization
- **SLF4J** - Logging framework
- **Maven** - Build and dependency management

## Database Triggers & Functions

### Automatic Campaign Amount Update
```sql
CREATE OR REPLACE FUNCTION update_campaign_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'COMPLETED' THEN
        UPDATE campaigns
        SET current_amount = current_amount + NEW.amount
        WHERE campaign_id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Fraud Pattern Detection
```sql
CREATE OR REPLACE FUNCTION check_fraud_patterns()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for rapid contributions, large amounts, etc.
    -- Automatically creates fraud alerts
END;
$$ LANGUAGE plpgsql;
```

## License

This project is created for educational purposes.

## Author

Built with Java, JDBC, and PostgreSQL to demonstrate enterprise-level backend development practices.
