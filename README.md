# Multi-Level Car Parking (MLCP) System

A comprehensive parking management system with real-time tracking, dynamic pricing, online reservations, and analytics. Built with Spring Boot and modern web technologies.

## 🚀 Features

### Core Functionality
- **Multi-Vehicle Support**: Two-Wheelers, Cars, and Trucks with different slot sizes
- **Smart Slot Allocation**: Automatic nearest available slot assignment based on entry gate
- **Real-Time Occupancy**: Live updates via WebSocket for slot availability
- **Dynamic Pricing**: Hourly, daily rates with penalty charges
- **Ticket Management**: Automated ticket generation with QR code support
- **Online Reservations**: Book slots in advance with expiration handling
- **EV Charging Slots**: Dedicated slots with charging facilities
- **VIP Parking**: Reserved premium parking sections with discounts

### Advanced Features
- **Analytics Dashboard**: Peak hours, vehicle distribution, revenue reports
- **Admin Panel**: Slot management, maintenance alerts, pricing configuration
- **Concurrency Control**: Race-condition-free slot allocation using pessimistic locking
- **Transaction Safety**: JDBC transactions with ACID guarantees
- **WebSocket Support**: Real-time updates for occupancy and events
- **Scheduled Tasks**: Automatic reservation expiration handling

## 📋 System Requirements

- **Java**: 17 or higher
- **Maven**: 3.6 or higher
- **Database**: H2 (development), PostgreSQL (production)
- **Browser**: Modern browser with WebSocket support

## 🛠️ Technology Stack

### Backend
- **Framework**: Spring Boot 3.2.0
- **Database**: JPA/Hibernate with H2/PostgreSQL
- **WebSocket**: STOMP over SockJS
- **Caching**: Caffeine Cache
- **Retry**: Spring Retry
- **Validation**: Jakarta Validation
- **Build Tool**: Maven

### Frontend
- **HTML5, CSS3, JavaScript**
- **WebSocket Client**: SockJS + STOMP.js
- **Responsive Design**: CSS Grid & Flexbox

## 📦 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd MarkDownPreviewer
```

### 2. Build the Project

```bash
mvn clean install
```

### 3. Run the Application

```bash
mvn spring-boot:run
```

The application will start on `http://localhost:8080`

### 4. Access the UI

Open your browser and navigate to:
```
file:///path/to/frontend/index.html
```

Or serve the frontend using a simple HTTP server:
```bash
cd frontend
python3 -m http.server 8000
```

Then access: `http://localhost:8000`

### 5. H2 Database Console

Access the H2 console at: `http://localhost:8080/h2-console`

- **JDBC URL**: `jdbc:h2:mem:mlcpdb`
- **Username**: `sa`
- **Password**: (leave empty)

## 📖 API Documentation

### Base URL
```
http://localhost:8080/api
```

### 1. Parking Operations

#### Check-In Vehicle
```http
POST /api/parking/check-in
Content-Type: application/json

{
  "vehicleNumber": "ABC-1234",
  "vehicleType": "CAR",
  "gateId": 1,
  "requiresEvCharging": false,
  "isVip": false,
  "reservationNumber": null
}
```

**Response:**
```json
{
  "ticketNumber": "TKT-20240101-000001",
  "vehicleNumber": "ABC-1234",
  "vehicleType": "CAR",
  "slotNumber": "G-CAR-025",
  "floorNumber": 1,
  "entryTime": "2024-01-01T10:00:00",
  "message": "Vehicle parked successfully at G-CAR-025"
}
```

#### Check-Out Vehicle
```http
POST /api/parking/check-out
Content-Type: application/json

{
  "ticketNumber": "TKT-20240101-000001",
  "paymentMethod": "CARD"
}
```

**Response:**
```json
{
  "ticketNumber": "TKT-20240101-000001",
  "vehicleNumber": "ABC-1234",
  "entryTime": "2024-01-01T10:00:00",
  "exitTime": "2024-01-01T13:30:00",
  "durationInMinutes": 210,
  "parkingFee": 45.00,
  "paymentStatus": "SUCCESS",
  "message": "Thank you for parking with us!"
}
```

#### Get Ticket Details
```http
GET /api/parking/ticket/{ticketNumber}
```

### 2. Reservations

#### Create Reservation
```http
POST /api/reservations
Content-Type: application/json

{
  "vehicleNumber": "XYZ-5678",
  "vehicleType": "CAR",
  "userEmail": "user@example.com",
  "userPhone": "+1234567890",
  "reservedFrom": "2024-01-02T09:00:00",
  "reservedUntil": "2024-01-02T18:00:00",
  "requiresEvCharging": true,
  "isVip": false
}
```

**Response:**
```json
{
  "reservationNumber": "RSV-20240101-000001",
  "vehicleNumber": "XYZ-5678",
  "slotNumber": "G-CAR-022",
  "floorNumber": 1,
  "reservedFrom": "2024-01-02T09:00:00",
  "reservedUntil": "2024-01-02T18:00:00",
  "status": "CONFIRMED",
  "message": "Reservation confirmed. Please arrive between..."
}
```

#### Get Reservation
```http
GET /api/reservations/{reservationNumber}
```

#### Cancel Reservation
```http
PUT /api/reservations/{reservationNumber}/cancel
```

#### Get User Reservations
```http
GET /api/reservations/user/{email}
```

### 3. Analytics

#### Get Real-Time Occupancy
```http
GET /api/analytics/occupancy
```

**Response:**
```json
{
  "totalSlots": 200,
  "availableSlots": 145,
  "occupiedSlots": 45,
  "reservedSlots": 8,
  "blockedSlots": 2,
  "occupancyPercentage": 22.5,
  "floorWiseOccupancy": {
    "Ground Floor": 15,
    "First Floor": 12,
    "Second Floor": 10,
    "Third Floor": 8
  },
  "vehicleTypeDistribution": {
    "TWO_WHEELER": 10,
    "CAR": 30,
    "TRUCK": 5
  }
}
```

#### Get Revenue Report
```http
GET /api/analytics/revenue?startDate=2024-01-01T00:00:00&endDate=2024-01-31T23:59:59
```

#### Get Peak Hours Analysis
```http
GET /api/analytics/peak-hours?startDate=2024-01-01T00:00:00&endDate=2024-01-07T23:59:59
```

### 4. Admin Operations

#### Get Dashboard Summary
```http
GET /api/admin/dashboard
```

#### Block/Unblock Slot
```http
PUT /api/admin/slots/{slotId}/block
Content-Type: application/json

{
  "reason": "Maintenance required"
}
```

#### Create Maintenance Alert
```http
POST /api/admin/maintenance
Content-Type: application/json

{
  "slotId": 25,
  "alertType": "REPAIR",
  "description": "Ceiling leak detected",
  "severity": "HIGH"
}
```

#### Update Pricing Rule
```http
POST /api/admin/pricing
Content-Type: application/json

{
  "vehicleType": "CAR",
  "basePrice": 20.00,
  "hourlyRate": 10.00,
  "dailyRate": 100.00,
  "penaltyRate": 5.00,
  "evChargingRate": 5.00,
  "vipDiscountPercent": 15,
  "isActive": true
}
```

## 🔌 WebSocket Integration

### Connect to WebSocket

```javascript
const socket = new SockJS('http://localhost:8080/ws');
const stompClient = Stomp.over(socket);

stompClient.connect({}, function(frame) {
    console.log('Connected: ' + frame);

    // Subscribe to occupancy updates
    stompClient.subscribe('/topic/occupancy', function(message) {
        const occupancy = JSON.parse(message.body);
        updateUI(occupancy);
    });

    // Subscribe to parking events
    stompClient.subscribe('/topic/events', function(message) {
        const event = JSON.parse(message.body);
        handleEvent(event);
    });
});
```

### WebSocket Topics

- `/topic/occupancy` - Real-time occupancy updates
- `/topic/slots/{floorId}` - Floor-specific slot updates
- `/topic/alerts` - Maintenance alert notifications
- `/topic/events` - General parking events

## 🏗️ Architecture

### Layered Architecture

```
┌─────────────────────────────────────┐
│     Presentation Layer              │
│  (Controllers + WebSocket + UI)     │
├─────────────────────────────────────┤
│     Service Layer                   │
│  (Business Logic + Transactions)    │
├─────────────────────────────────────┤
│     Repository Layer                │
│  (Data Access + JPA)                │
├─────────────────────────────────────┤
│     Database Layer                  │
│  (H2 / PostgreSQL)                  │
└─────────────────────────────────────┘
```

### Key Components

1. **SlotAllocationService**: Handles slot allocation with pessimistic locking
2. **ParkingService**: Manages check-in/check-out operations
3. **PricingService**: Calculates dynamic parking fees
4. **ReservationService**: Manages online bookings
5. **AnalyticsService**: Generates reports and statistics
6. **AdminService**: Admin operations and dashboard
7. **NotificationService**: WebSocket notifications

## 🔐 Concurrency Control

### Pessimistic Locking for Slot Allocation

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT s FROM ParkingSlot s WHERE s.slotId = :slotId")
Optional<ParkingSlot> findByIdWithLock(@Param("slotId") Long slotId);
```

### Transaction Isolation

```java
@Transactional(isolation = Isolation.SERIALIZABLE)
public ParkingSlot allocateNearestSlot(...) {
    // Slot allocation with serializable isolation
}
```

### Retry Mechanism

```java
@Retryable(
    retryFor = {OptimisticLockingFailureException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 100, multiplier = 2)
)
```

## 💰 Dynamic Pricing

### Pricing Formula

```
Base Fee = base_price
Hourly Fee = hours_parked * hourly_rate
Daily Fee = days_parked * daily_rate (if days > 0)
EV Charging = charging_hours * ev_charging_rate
VIP Discount = total * (vip_discount_percent / 100)

Total = Base + Hourly/Daily + EV Charging - VIP Discount
```

### Default Pricing Rules

| Vehicle Type | Base Price | Hourly Rate | Daily Rate | EV Charging | VIP Discount |
|-------------|-----------|-------------|------------|-------------|--------------|
| Two-Wheeler | $10 | $5/hr | $50/day | $3/hr | 10% |
| Car | $20 | $10/hr | $100/day | $5/hr | 15% |
| Truck | $40 | $20/hr | $200/day | N/A | 5% |

## 📊 Database Schema

### Key Tables

- `parking_floor`: Stores floor information
- `entry_gate`: Entry gate details with coordinates
- `parking_slot`: Slot details with vehicle type, status, coordinates
- `parking_ticket`: Ticket records with entry/exit times
- `reservation`: Online booking records
- `pricing_rule`: Dynamic pricing configuration
- `payment_transaction`: Payment records
- `maintenance_alert`: Maintenance and alert tracking

See `SYSTEM_DESIGN.md` for detailed schema.

## 🧪 Testing

### Run Tests

```bash
mvn test
```

### Manual Testing with cURL

1. **Check-In Test**:
   ```bash
   curl -X POST http://localhost:8080/api/parking/check-in \
     -H "Content-Type: application/json" \
     -d '{"vehicleNumber":"TEST-123","vehicleType":"CAR","gateId":1}'
   ```

2. **Get Occupancy**:
   ```bash
   curl http://localhost:8080/api/analytics/occupancy
   ```

## 🚀 Deployment

### Production Configuration

1. Update `application-prod.properties`:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/mlcpdb
   spring.datasource.username=your_username
   spring.datasource.password=your_password
   ```

2. Build for production:
   ```bash
   mvn clean package -Pprod
   ```

3. Run with production profile:
   ```bash
   java -jar target/mlcp-system-1.0.0.jar --spring.profiles.active=prod
   ```

## 🔧 Configuration

### Key Application Properties

```properties
# Server
server.port=8080

# Database
spring.datasource.url=jdbc:h2:mem:mlcpdb

# JPA
spring.jpa.hibernate.ddl-auto=create-drop

# Connection Pool
spring.datasource.hikari.maximum-pool-size=20

# Cache
spring.cache.type=caffeine
```

## 📈 Monitoring

### Metrics to Monitor

- Slot allocation time (SLA: <100ms)
- Database connection pool utilization
- API response times
- WebSocket connection count
- Cache hit rates

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Change port in application.properties
   server.port=8081
   ```

2. **Database Connection Issues**
   ```bash
   # Check H2 console at http://localhost:8080/h2-console
   ```

3. **WebSocket Connection Failed**
   - Ensure browser supports WebSocket
   - Check CORS configuration
   - Verify WebSocket endpoint URL

## 📁 Project Structure

```
MarkDownPreviewer/
├── src/
│   ├── main/
│   │   ├── java/com/parking/mlcp/
│   │   │   ├── model/          # Enums and value objects
│   │   │   ├── entity/         # JPA entities
│   │   │   ├── repository/     # Data access layer
│   │   │   ├── service/        # Business logic
│   │   │   ├── controller/     # REST API controllers
│   │   │   ├── dto/            # Data transfer objects
│   │   │   ├── config/         # Configuration classes
│   │   │   ├── websocket/      # WebSocket configuration
│   │   │   ├── exception/      # Exception handling
│   │   │   └── util/           # Utility classes
│   │   └── resources/
│   │       ├── application.properties
│   │       └── data.sql        # Initial data
│   └── test/
├── frontend/
│   ├── index.html              # Dashboard
│   ├── parking.html            # Parking operations
│   ├── reservation.html        # Reservations
│   ├── admin.html              # Admin panel
│   ├── styles.css              # Styling
│   └── *.js                    # JavaScript files
├── pom.xml
├── SYSTEM_DESIGN.md
└── README.md
```

## 📝 License

This project is licensed under the MIT License.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using Spring Boot and modern web technologies**
