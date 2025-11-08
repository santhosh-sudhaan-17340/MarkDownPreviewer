# Crowdfunding Platform - API Reference

This document provides detailed information about the service layer APIs and how to use them.

## Table of Contents
1. [Authentication Service](#authentication-service)
2. [Campaign Service](#campaign-service)
3. [Contribution Service](#contribution-service)
4. [Analytics Service](#analytics-service)
5. [Admin Service](#admin-service)
6. [Payment Service](#payment-service)

---

## Authentication Service

Handles user registration, login, and JWT token management.

### `register(username, email, password, fullName)`

Register a new user.

**Parameters:**
- `username` (String) - Unique username
- `email` (String) - User email address
- `password` (String) - Plain text password (will be hashed)
- `fullName` (String) - User's full name

**Returns:** `Map<String, Object>` containing:
- `userId` - Newly created user ID
- `username` - Username
- `email` - Email address
- `role` - User role (USER/ADMIN)
- `token` - JWT authentication token

**Example:**
```java
AuthenticationService authService = new AuthenticationService();
Map<String, Object> response = authService.register(
    "johndoe",
    "john@example.com",
    "securePassword123",
    "John Doe"
);
String token = (String) response.get("token");
```

### `login(email, password)`

Authenticate user and get JWT token.

**Parameters:**
- `email` (String) - User email
- `password` (String) - User password

**Returns:** `Map<String, Object>` with user info and token

**Example:**
```java
Map<String, Object> response = authService.login(
    "john@example.com",
    "securePassword123"
);
```

### `validateToken(token)`

Validate JWT token and get user object.

**Parameters:**
- `token` (String) - JWT token

**Returns:** `User` object if valid

**Throws:** `IllegalArgumentException` if token is invalid or expired

---

## Campaign Service

Manages fundraising campaigns with optimized pagination.

### `createCampaign(creatorId, title, description, goalAmount, category, endDate)`

Create a new fundraising campaign.

**Parameters:**
- `creatorId` (Long) - User ID of campaign creator
- `title` (String) - Campaign title (max 200 chars)
- `description` (String) - Detailed description
- `goalAmount` (BigDecimal) - Fundraising goal
- `category` (String) - Campaign category
- `endDate` (LocalDateTime) - Campaign end date

**Returns:** `Campaign` object with generated ID

**Example:**
```java
CampaignService campaignService = new CampaignService();
Campaign campaign = campaignService.createCampaign(
    userId,
    "Save the Ocean",
    "Help us protect marine life...",
    new BigDecimal("50000.00"),
    "Environment",
    LocalDateTime.now().plusDays(30)
);
```

### `getCampaignsPaginated(page, pageSize, status, category)`

Get paginated list of campaigns with filtering.

**Parameters:**
- `page` (int) - Page number (0-indexed)
- `pageSize` (int) - Items per page (max 100)
- `status` (String, optional) - Filter by status (ACTIVE, COMPLETED, etc.)
- `category` (String, optional) - Filter by category

**Returns:** `Map<String, Object>` containing:
- `campaigns` - List of campaigns
- `currentPage` - Current page number
- `pageSize` - Page size
- `totalCampaigns` - Total campaign count
- `totalPages` - Total pages
- `hasNext` - Boolean, true if more pages exist
- `hasPrevious` - Boolean, true if previous pages exist

**Example:**
```java
Map<String, Object> result = campaignService.getCampaignsPaginated(
    0,           // first page
    20,          // 20 items per page
    "ACTIVE",    // only active campaigns
    null         // all categories
);
List<Campaign> campaigns = (List<Campaign>) result.get("campaigns");
```

### `getCampaignById(campaignId)`

Get campaign by ID.

**Returns:** `Optional<Campaign>`

### `updateCampaign(campaignId, title, description, goalAmount, category, endDate)`

Update campaign details (only non-null parameters are updated).

### `searchCampaigns(keyword, limit)`

Search campaigns by keyword in title or description.

### `getTopCampaigns(limit)`

Get top campaigns by funds raised (uses optimized index).

---

## Contribution Service

Handles contributions with **ACID-compliant transactions**.

### `contribute(campaignId, userId, amount, paymentMethod, isAnonymous, message)`

Process a contribution with full ACID transaction support.

**Transaction Guarantees:**
- **Atomicity:** All operations succeed or all fail
- **Consistency:** Database constraints maintained
- **Isolation:** SERIALIZABLE isolation level
- **Durability:** Changes persisted to database

**Parameters:**
- `campaignId` (Long) - Target campaign ID
- `userId` (Long) - Contributing user ID
- `amount` (BigDecimal) - Contribution amount
- `paymentMethod` (String) - Payment method (CREDIT_CARD, PAYPAL, etc.)
- `isAnonymous` (boolean) - Hide contributor identity
- `message` (String, optional) - Support message

**Returns:** `Contribution` object with payment status

**Example:**
```java
ContributionService contributionService = new ContributionService();
Contribution contribution = contributionService.contribute(
    campaignId,
    userId,
    new BigDecimal("100.00"),
    "CREDIT_CARD",
    false,
    "Great cause!"
);

System.out.println("Status: " + contribution.getPaymentStatus());
System.out.println("Transaction ID: " + contribution.getTransactionId());
```

**Transaction Flow:**
1. Begin transaction with SERIALIZABLE isolation
2. Validate campaign is active and not suspended
3. Create contribution record with PENDING status
4. Commit pending contribution
5. Process payment (simulated)
6. Begin new transaction
7. Update contribution status to COMPLETED/FAILED
8. Database trigger automatically updates campaign amount
9. Commit transaction

**On Error:** Automatic rollback, no changes applied

### `contributeAsync(campaignId, userId, amount, paymentMethod, isAnonymous, message)`

Asynchronous version returning `CompletableFuture<Contribution>`.

### `getCampaignContributions(campaignId, page, pageSize)`

Get paginated contributions for a campaign.

### `getUserContributions(userId)`

Get all contributions by a user.

### `getContributorCount(campaignId)`

Get unique contributor count for a campaign.

---

## Analytics Service

Provides comprehensive analytics and reporting.

### `getPlatformStats()`

Get platform-wide statistics.

**Returns:** `Map<String, Object>` with:
- `totalCampaigns` - Total number of campaigns
- `activeCampaigns` - Number of active campaigns
- `totalUsers` - Total registered users
- `totalContributions` - Total contributions made
- `totalFundsRaised` - Total funds raised (BigDecimal)
- `avgContribution` - Average contribution amount

**Example:**
```java
AnalyticsService analyticsService = new AnalyticsService();
Map<String, Object> stats = analyticsService.getPlatformStats();
System.out.println("Total raised: $" + stats.get("totalFundsRaised"));
```

### `getTopCampaignsByFunds(limit)`

Get top campaigns ranked by funds raised.

**Uses optimized index:** `idx_campaigns_current_amount`

**Returns:** `List<Map<String, Object>>` with campaign details and progress

### `getTopCampaignsByContributors(limit)`

Get top campaigns ranked by contributor count.

### `getCampaignAnalytics(campaignId)`

Get detailed analytics for a specific campaign.

**Returns:** `Map<String, Object>` with:
- `campaignId` - Campaign ID
- `title` - Campaign title
- `goalAmount` - Goal amount
- `currentAmount` - Current amount raised
- `status` - Campaign status
- `contributorCount` - Number of unique contributors
- `totalContributions` - Total contribution count
- `avgContribution` - Average contribution amount
- `largestContribution` - Largest single contribution
- `smallestContribution` - Smallest contribution
- `progressPercentage` - Percentage of goal reached
- `daysRemaining` - Days until campaign ends

**Example:**
```java
Map<String, Object> analytics = analyticsService.getCampaignAnalytics(campaignId);
System.out.println("Progress: " + analytics.get("progressPercentage") + "%");
System.out.println("Contributors: " + analytics.get("contributorCount"));
```

### `getCategoryStats()`

Get statistics grouped by category.

### `getContributionTrends(days)`

Get contribution trends over the last N days.

### `getUserStats(userId)`

Get contribution statistics for a user.

---

## Admin Service

Admin-only features for fraud detection and campaign management.

### `suspendCampaign(campaignId, reason, adminId)`

Suspend a campaign (admin action).

**Parameters:**
- `campaignId` (Long) - Campaign to suspend
- `reason` (String) - Suspension reason
- `adminId` (Long) - Admin user ID

**Effects:**
- Campaign status set to SUSPENDED
- Campaign marked as suspicious
- Fraud alert created with reason

**Example:**
```java
AdminService adminService = new AdminService();
adminService.suspendCampaign(
    campaignId,
    "Suspicious activity detected - multiple rapid contributions",
    adminUserId
);
```

### `reactivateCampaign(campaignId, adminId)`

Reactivate a suspended campaign.

### `getPendingFraudAlerts()`

Get all pending fraud alerts.

**Returns:** `List<FraudAlert>`

### `getHighSeverityAlerts()`

Get fraud alerts with HIGH or CRITICAL severity.

### `getCampaignFraudAlerts(campaignId)`

Get all fraud alerts for a specific campaign.

### `reviewFraudAlert(alertId, newStatus, adminId)`

Review and update fraud alert status.

**Parameters:**
- `alertId` (Long) - Alert ID
- `newStatus` (AlertStatus) - New status (REVIEWED, RESOLVED, DISMISSED)
- `adminId` (Long) - Reviewing admin ID

### `investigateCampaign(campaignId)`

Investigate campaign and assess fraud risk.

**Returns:** `FraudAlert.Severity` (LOW, MEDIUM, HIGH, CRITICAL)

### `getFraudDashboard()`

Get fraud detection dashboard data.

**Returns:** `FraudDashboard` object with:
- `pendingAlerts` - List of pending alerts
- `highSeverityAlerts` - List of high severity alerts
- `pendingCount` - Count of pending alerts
- `highSeverityCount` - Count of high severity alerts

**Example:**
```java
AdminService.FraudDashboard dashboard = adminService.getFraudDashboard();
System.out.println("Pending alerts: " + dashboard.getPendingCount());
for (FraudAlert alert : dashboard.getHighSeverityAlerts()) {
    System.out.println("Alert: " + alert.getDescription());
}
```

---

## Payment Service

Simulates payment processing for contributions.

### `processPayment(amount, paymentMethod, userEmail)`

Process payment asynchronously.

**Parameters:**
- `amount` (BigDecimal) - Payment amount
- `paymentMethod` (String) - Payment method
- `userEmail` (String) - User email

**Returns:** `CompletableFuture<PaymentResult>`

**PaymentResult fields:**
- `success` (boolean) - Payment succeeded
- `transactionId` (String) - Unique transaction ID
- `status` (PaymentStatus) - Payment status
- `message` (String) - Status message

**Configuration:**
```properties
payment.simulation.success.rate=0.95  # 95% success rate
payment.simulation.processing.delay=2000  # 2 second delay
```

**Example:**
```java
PaymentService paymentService = new PaymentService();
CompletableFuture<PaymentResult> future = paymentService.processPayment(
    new BigDecimal("100.00"),
    "CREDIT_CARD",
    "user@example.com"
);

PaymentResult result = future.get(); // Wait for completion
if (result.isSuccess()) {
    System.out.println("Payment successful: " + result.getTransactionId());
} else {
    System.out.println("Payment failed: " + result.getMessage());
}
```

### `validatePaymentMethod(paymentMethod)`

Validate payment method.

**Supported methods:**
- CREDIT_CARD
- DEBIT_CARD
- PAYPAL
- BANK_TRANSFER

### `processRefund(transactionId, amount)`

Process refund (simulated).

---

## Error Handling

All service methods may throw:

- `SQLException` - Database errors
- `IllegalArgumentException` - Invalid input parameters
- `SecurityException` - Authorization failures (admin operations)

**Example with error handling:**
```java
try {
    Campaign campaign = campaignService.createCampaign(...);
    System.out.println("Campaign created: " + campaign.getCampaignId());
} catch (IllegalArgumentException e) {
    System.err.println("Invalid input: " + e.getMessage());
} catch (SQLException e) {
    System.err.println("Database error: " + e.getMessage());
}
```

---

## Security Best Practices

1. **Always validate JWT tokens** before processing requests
2. **Check user permissions** for campaign modifications
3. **Verify admin role** before calling admin service methods
4. **Use prepared statements** - all DAOs use parameterized queries
5. **Hash passwords** - never store plain text passwords

**Example with authentication:**
```java
AuthenticationService authService = new AuthenticationService();

// Validate token from request header
String token = request.getHeader("Authorization");
User user = authService.validateToken(token);

// Verify user is campaign creator
if (!campaignService.isCreator(campaignId, user.getUserId())) {
    throw new SecurityException("Not authorized to modify this campaign");
}

// Proceed with operation
campaignService.updateCampaign(...);
```

---

## Performance Tips

1. **Use pagination** for large result sets
2. **Leverage database indexes** - queries are optimized with indexes
3. **Connection pooling** - configured via HikariCP
4. **Batch operations** when possible
5. **Cache frequently accessed data** (implement as needed)

**Optimized query example:**
```java
// This query uses idx_campaigns_status_created for optimal performance
Map<String, Object> result = campaignService.getCampaignsPaginated(
    0, 20, "ACTIVE", null
);
```

---

## Integration Example

Complete workflow from user registration to contribution:

```java
// 1. User Registration
AuthenticationService authService = new AuthenticationService();
Map<String, Object> regResponse = authService.register(
    "johndoe", "john@example.com", "password", "John Doe"
);
Long userId = (Long) regResponse.get("userId");
String token = (String) regResponse.get("token");

// 2. Create Campaign
CampaignService campaignService = new CampaignService();
Campaign campaign = campaignService.createCampaign(
    userId,
    "My Campaign",
    "Description",
    new BigDecimal("10000.00"),
    "Technology",
    LocalDateTime.now().plusDays(30)
);

// 3. Another user contributes
ContributionService contributionService = new ContributionService();
Contribution contribution = contributionService.contribute(
    campaign.getCampaignId(),
    anotherUserId,
    new BigDecimal("100.00"),
    "CREDIT_CARD",
    false,
    "Supporting this project!"
);

// 4. View analytics
AnalyticsService analyticsService = new AnalyticsService();
Map<String, Object> analytics = analyticsService.getCampaignAnalytics(
    campaign.getCampaignId()
);

System.out.println("Progress: " + analytics.get("progressPercentage") + "%");
System.out.println("Contributors: " + analytics.get("contributorCount"));
```

---

For more information, see the main [README.md](README.md) and review the source code in the `service` package.
