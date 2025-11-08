# Hotel Room Booking Application

A comprehensive hotel room booking system built with Spring Boot, featuring advanced reservation management, conflict detection, cancellation policies, pricing history tracking, and optimized JDBC batch processing for high-traffic scenarios.

## Features

### 1. Reservation Conflict Handling
- **Real-time conflict detection**: Prevents double booking by checking for overlapping reservations
- **Date range validation**: Ensures reservations don't conflict with existing bookings
- **Status-based filtering**: Only considers CONFIRMED and PENDING reservations when checking availability
- **Atomic operations**: Uses database transactions to prevent race conditions during high-traffic periods

### 2. Cancellation Rules & Policies
- **Three cancellation policies**:
  - **FLEXIBLE**: Full refund if cancelled 1+ days before check-in, 50% on check-in day
  - **MODERATE**: Full refund at 7+ days, 50% at 3-6 days, no refund within 3 days
  - **STRICT**: Full refund at 14+ days, 50% at 7-13 days, no refund within 7 days
- **Dynamic refund calculation**: Automatically calculates refund based on days before check-in
- **Cancellation preview**: View estimated refund before cancelling
- **Audit trail**: All cancellations are logged with timestamp and reason

### 3. Pricing History Tracking
- **Complete price change history**: Tracks all price modifications with timestamps
- **Historical price queries**: Retrieve price at any specific date
- **Price trend analysis**: Calculate min, max, average prices over date ranges
- **Change attribution**: Records who made the change and why
- **Audit logging**: All price changes are logged for compliance

### 4. JDBC Batch Processing
- **High-performance batch operations**: Optimized for high-traffic scenarios
- **Batch reservation creation**: Create multiple reservations in a single transaction
- **Batch status updates**: Update multiple reservations simultaneously
- **Batch pricing updates**: Apply pricing changes to multiple rooms at once
- **Configurable batch size**: Set to 50 by default, adjustable in configuration

## Technology Stack

- **Java 17**
- **Spring Boot 3.1.5**
- **Spring Data JPA** - Database abstraction and ORM
- **Spring JDBC** - Batch processing
- **H2 Database** - In-memory database (development)
- **MySQL/PostgreSQL** - Production database support
- **Hibernate** - ORM implementation
- **Lombok** - Reduce boilerplate code
- **Swagger/OpenAPI** - API documentation
- **Maven** - Build and dependency management

## Project Structure

```
src/
├── main/
│   ├── java/com/hotel/booking/
│   │   ├── batch/
│   │   │   └── BatchReservationService.java      # JDBC batch operations
│   │   ├── config/
│   │   ├── controller/
│   │   │   ├── HotelController.java              # Hotel REST API
│   │   │   ├── RoomController.java               # Room REST API
│   │   │   ├── ReservationController.java        # Reservation REST API
│   │   │   ├── PricingHistoryController.java     # Pricing history REST API
│   │   │   └── UserController.java               # User REST API
│   │   ├── dto/
│   │   ├── exception/
│   │   │   ├── GlobalExceptionHandler.java       # Centralized error handling
│   │   │   ├── ReservationConflictException.java # Conflict-specific exception
│   │   │   └── ResourceNotFoundException.java    # Not found exception
│   │   ├── model/
│   │   │   ├── Hotel.java                        # Hotel entity
│   │   │   ├── Room.java                         # Room entity
│   │   │   ├── Reservation.java                  # Reservation entity
│   │   │   ├── User.java                         # User entity
│   │   │   ├── PricingHistory.java               # Price change tracking
│   │   │   ├── CancellationRule.java             # Cancellation policies
│   │   │   └── AuditLog.java                     # Audit trail
│   │   ├── repository/
│   │   │   ├── HotelRepository.java
│   │   │   ├── RoomRepository.java               # Includes availability queries
│   │   │   ├── ReservationRepository.java        # Includes conflict detection
│   │   │   ├── UserRepository.java
│   │   │   ├── PricingHistoryRepository.java
│   │   │   ├── CancellationRuleRepository.java
│   │   │   └── AuditLogRepository.java
│   │   ├── service/
│   │   │   ├── HotelService.java
│   │   │   ├── RoomService.java
│   │   │   ├── ReservationService.java           # Conflict detection logic
│   │   │   ├── CancellationService.java          # Cancellation & refund logic
│   │   │   ├── PricingHistoryService.java        # Price tracking logic
│   │   │   └── UserService.java
│   │   └── HotelBookingApplication.java          # Main application
│   └── resources/
│       ├── application.properties                # Application configuration
│       ├── schema.sql                            # Database schema
│       └── data.sql                              # Sample data
└── test/
    └── java/com/hotel/booking/
```

## Database Schema

### Core Tables
- **hotels**: Hotel information
- **rooms**: Room inventory with pricing
- **users**: Customer information
- **reservations**: Booking records with status and policies
- **pricing_history**: Complete price change history
- **cancellation_rules**: Policy definitions
- **audit_log**: System-wide audit trail

### Key Relationships
- Hotel → Rooms (One-to-Many)
- Room → Reservations (One-to-Many)
- Room → PricingHistory (One-to-Many)
- User → Reservations (One-to-Many)

## API Endpoints

### Hotels
- `POST /api/hotels` - Create hotel
- `GET /api/hotels` - List all hotels
- `GET /api/hotels/{id}` - Get hotel details
- `GET /api/hotels/search?name={name}` - Search hotels
- `PUT /api/hotels/{id}` - Update hotel
- `DELETE /api/hotels/{id}` - Delete hotel

### Rooms
- `POST /api/rooms` - Create room
- `GET /api/rooms` - List all rooms
- `GET /api/rooms/{id}` - Get room details
- `GET /api/rooms/hotel/{hotelId}` - Get rooms by hotel
- `GET /api/rooms/available?hotelId={id}&checkInDate={date}&checkOutDate={date}` - Find available rooms
- `PUT /api/rooms/{id}` - Update room
- `DELETE /api/rooms/{id}` - Delete room

### Reservations
- `POST /api/reservations` - Create reservation (with conflict detection)
- `GET /api/reservations/{id}` - Get reservation details
- `GET /api/reservations/user/{userId}` - Get user's reservations
- `GET /api/reservations/user/{userId}/upcoming` - Get upcoming reservations
- `PUT /api/reservations/{id}/confirm` - Confirm reservation
- `POST /api/reservations/{id}/cancel` - Cancel reservation (with refund calculation)
- `GET /api/reservations/{id}/cancel-preview` - Preview cancellation refund
- `GET /api/reservations/check-availability?roomId={id}&checkInDate={date}&checkOutDate={date}` - Check availability

### Pricing History
- `POST /api/pricing-history/room/{roomId}` - Update room price (creates history)
- `GET /api/pricing-history/room/{roomId}` - Get price history
- `GET /api/pricing-history/room/{roomId}/date-range?startDate={date}&endDate={date}` - Get history by date range
- `GET /api/pricing-history/room/{roomId}/price-at-date?date={date}` - Get price at specific date
- `GET /api/pricing-history/room/{roomId}/trend?startDate={date}&endDate={date}` - Get price trends

### Users
- `POST /api/users` - Create user
- `GET /api/users` - List all users
- `GET /api/users/{id}` - Get user details
- `GET /api/users/email/{email}` - Get user by email
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

## Getting Started

### Prerequisites
- Java 17 or higher
- Maven 3.6+
- MySQL 8.0 or PostgreSQL 13+ (for production)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hotel-booking-app
```

2. Build the project:
```bash
mvn clean install
```

3. Run the application:
```bash
mvn spring-boot:run
```

The application will start on `http://localhost:8080`

### Access Points

- **Application**: http://localhost:8080
- **H2 Console**: http://localhost:8080/h2-console
  - JDBC URL: `jdbc:h2:mem:hotelbookingdb`
  - Username: `sa`
  - Password: (leave blank)
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **API Docs**: http://localhost:8080/api-docs

## Configuration

### Development (H2 Database)
The application comes pre-configured with H2 in-memory database for development. No additional setup required.

### Production (MySQL)
Update `application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/hotel_booking_db
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.jpa.database-platform=org.hibernate.dialect.MySQL8Dialect
spring.jpa.hibernate.ddl-auto=validate
```

### Production (PostgreSQL)
Update `application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/hotel_booking_db
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=validate
```

## Performance Optimization

### JDBC Batch Processing
The application uses JDBC batch processing for high-traffic operations:

```properties
# Batch size configuration
spring.jpa.properties.hibernate.jdbc.batch_size=50
spring.jpa.properties.hibernate.order_inserts=true
spring.jpa.properties.hibernate.order_updates=true
```

### Connection Pooling (HikariCP)
Optimized connection pool settings:

```properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
```

## Key Features Explained

### 1. Reservation Conflict Detection

The system prevents double booking using database-level queries:

```java
// ReservationRepository.java
@Query("SELECT COUNT(r) > 0 FROM Reservation r " +
       "WHERE r.room.id = :roomId " +
       "AND r.status IN ('CONFIRMED', 'PENDING') " +
       "AND r.checkInDate < :checkOutDate " +
       "AND r.checkOutDate > :checkInDate")
boolean hasConflictingReservation(Long roomId, LocalDate checkInDate, LocalDate checkOutDate);
```

### 2. Cancellation Refund Calculation

Automatic refund calculation based on cancellation policy:

```java
// Example: MODERATE policy
// - 7+ days before: 100% refund
// - 3-6 days before: 50% refund
// - 0-2 days before: 0% refund

CancellationResult result = cancellationService.cancelReservation(reservationId, reason);
// Returns: refund amount, percentage, policy details
```

### 3. Pricing History

Track and analyze price changes over time:

```java
// Update price (automatically creates history)
pricingHistoryService.updateRoomPrice(roomId, newPrice, "Seasonal adjustment", "ADMIN");

// Get price at any historical date
BigDecimal price = pricingHistoryService.getPriceAtDate(roomId, LocalDate.of(2024, 1, 15));

// Analyze trends
PriceTrend trend = pricingHistoryService.calculatePriceTrend(roomId, startDate, endDate);
// Returns: min, max, average prices, number of changes
```

### 4. Batch Operations for High Traffic

Process multiple operations efficiently:

```java
// Create 100 reservations in a single batch
List<BatchReservationRequest> requests = // ... prepare requests
int[] results = batchReservationService.batchCreateReservations(requests);

// Update prices for multiple rooms
List<BatchRoomPriceUpdate> updates = // ... prepare updates
batchReservationService.batchUpdateRoomPrices(updates);
```

## Sample API Usage

### Create a Reservation
```bash
curl -X POST http://localhost:8080/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": 1,
    "userId": 1,
    "checkInDate": "2025-12-01",
    "checkOutDate": "2025-12-05",
    "numberOfGuests": 2,
    "cancellationPolicy": "MODERATE"
  }'
```

### Check Room Availability
```bash
curl "http://localhost:8080/api/reservations/check-availability?roomId=1&checkInDate=2025-12-01&checkOutDate=2025-12-05"
```

### Preview Cancellation
```bash
curl http://localhost:8080/api/reservations/1/cancel-preview
```

### Cancel Reservation
```bash
curl -X POST http://localhost:8080/api/reservations/1/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Change of plans"
  }'
```

### Update Room Price
```bash
curl -X POST http://localhost:8080/api/pricing-history/room/1 \
  -H "Content-Type: application/json" \
  -d '{
    "newPrice": 175.00,
    "reason": "Peak season pricing",
    "changedBy": "ADMIN"
  }'
```

## Testing

Run tests with:
```bash
mvn test
```

## Built With

- [Spring Boot](https://spring.io/projects/spring-boot) - Framework
- [Spring Data JPA](https://spring.io/projects/spring-data-jpa) - Data access
- [Hibernate](https://hibernate.org/) - ORM
- [H2 Database](https://www.h2database.com/) - In-memory database
- [Lombok](https://projectlombok.org/) - Code generation
- [Swagger/OpenAPI](https://swagger.io/) - API documentation

## Author

Hotel Booking Application - Spring Boot Implementation

## License

This project is licensed under the MIT License.
