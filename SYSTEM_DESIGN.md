# Multi-Level Car Parking (MLCP) System - Design Document

## 1. System Overview

The MLCP system is a comprehensive parking management solution that handles multiple vehicle types, automated slot allocation, real-time occupancy tracking, dynamic pricing, reservations, and analytics.

## 2. Key Requirements

### 2.1 Functional Requirements
- Support three vehicle types: Two-Wheeler, Car, Truck
- Automatic nearest slot allocation based on entry gate
- Real-time occupancy tracking
- Dynamic pricing (hourly, daily, penalty)
- Ticket generation and scanning
- Online booking and reservations with expiration
- EV charging slot booking
- VIP reserved sections
- Analytics and reporting
- Admin dashboard

### 2.2 Non-Functional Requirements
- **Concurrency**: Race-condition-free slot assignment
- **Consistency**: ACID transactions using JDBC
- **Scalability**: Support multiple floors and entry gates
- **Real-time**: Live updates on slot availability
- **Performance**: Fast slot allocation (<100ms)
- **Reliability**: 99.9% uptime

## 3. System Architecture

### 3.1 Architecture Pattern
**Layered Architecture** with the following layers:
```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│   (REST API + WebSocket + UI)       │
├─────────────────────────────────────┤
│         Service Layer               │
│   (Business Logic + Orchestration)  │
├─────────────────────────────────────┤
│         Repository Layer            │
│   (Data Access + JDBC Transactions) │
├─────────────────────────────────────┤
│         Database Layer              │
│   (PostgreSQL/H2 for dev)           │
└─────────────────────────────────────┘
```

### 3.2 Core Components

#### 3.2.1 Parking Management
- **SlotAllocationService**: Finds nearest available slot
- **ParkingService**: Handles check-in/check-out
- **ReservationService**: Manages online bookings
- **PricingService**: Calculates parking fees

#### 3.2.2 Concurrency Control
- **Optimistic Locking**: Version-based conflict detection
- **Pessimistic Locking**: Row-level locks for critical operations
- **Distributed Locking**: For multi-instance deployments

#### 3.2.3 Analytics
- **OccupancyAnalyzer**: Real-time occupancy metrics
- **RevenueAnalyzer**: Financial reports
- **TrendAnalyzer**: Peak hours and patterns

## 4. Database Schema

### 4.1 Core Tables

#### 4.1.1 parking_floor
```sql
CREATE TABLE parking_floor (
    floor_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    floor_number INT NOT NULL,
    floor_name VARCHAR(50),
    total_slots INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.1.2 entry_gate
```sql
CREATE TABLE entry_gate (
    gate_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    gate_name VARCHAR(50) NOT NULL,
    floor_id BIGINT,
    x_coordinate INT,
    y_coordinate INT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (floor_id) REFERENCES parking_floor(floor_id)
);
```

#### 4.1.3 parking_slot
```sql
CREATE TABLE parking_slot (
    slot_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    slot_number VARCHAR(20) NOT NULL UNIQUE,
    floor_id BIGINT NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL, -- TWO_WHEELER, CAR, TRUCK
    slot_status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, OCCUPIED, RESERVED, BLOCKED, MAINTENANCE
    is_ev_charging BOOLEAN DEFAULT FALSE,
    is_vip BOOLEAN DEFAULT FALSE,
    x_coordinate INT,
    y_coordinate INT,
    version BIGINT DEFAULT 0, -- For optimistic locking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (floor_id) REFERENCES parking_floor(floor_id),
    INDEX idx_floor_type_status (floor_id, vehicle_type, slot_status)
);
```

#### 4.1.4 parking_ticket
```sql
CREATE TABLE parking_ticket (
    ticket_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL,
    slot_id BIGINT NOT NULL,
    gate_id BIGINT NOT NULL,
    entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP NULL,
    parking_fee DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, CANCELLED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES parking_slot(slot_id),
    FOREIGN KEY (gate_id) REFERENCES entry_gate(gate_id),
    INDEX idx_vehicle_number (vehicle_number),
    INDEX idx_status (status)
);
```

#### 4.1.5 reservation
```sql
CREATE TABLE reservation (
    reservation_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservation_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL,
    slot_id BIGINT,
    user_email VARCHAR(100),
    user_phone VARCHAR(20),
    reserved_from TIMESTAMP NOT NULL,
    reserved_until TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, CONFIRMED, EXPIRED, CANCELLED, COMPLETED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES parking_slot(slot_id),
    INDEX idx_status_time (status, reserved_from, reserved_until)
);
```

#### 4.1.6 pricing_rule
```sql
CREATE TABLE pricing_rule (
    rule_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vehicle_type VARCHAR(20) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    daily_rate DECIMAL(10,2) NOT NULL,
    penalty_rate DECIMAL(10,2) DEFAULT 0,
    ev_charging_rate DECIMAL(10,2) DEFAULT 0,
    vip_discount_percent INT DEFAULT 0,
    effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### 4.1.7 payment_transaction
```sql
CREATE TABLE payment_transaction (
    transaction_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ticket_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20), -- CASH, CARD, UPI, WALLET
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES parking_ticket(ticket_id),
    INDEX idx_transaction_time (transaction_time)
);
```

#### 4.1.8 maintenance_alert
```sql
CREATE TABLE maintenance_alert (
    alert_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    slot_id BIGINT NOT NULL,
    alert_type VARCHAR(50), -- CLEANING, REPAIR, INSPECTION
    description TEXT,
    severity VARCHAR(20), -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (slot_id) REFERENCES parking_slot(slot_id)
);
```

## 5. API Design

### 5.1 Parking Operations
```
POST   /api/parking/check-in         - Vehicle entry
POST   /api/parking/check-out        - Vehicle exit
GET    /api/parking/ticket/{id}      - Get ticket details
GET    /api/parking/availability     - Check slot availability
```

### 5.2 Reservations
```
POST   /api/reservations             - Create reservation
GET    /api/reservations/{id}        - Get reservation details
PUT    /api/reservations/{id}/cancel - Cancel reservation
GET    /api/reservations/user/{email}- Get user reservations
```

### 5.3 Analytics
```
GET    /api/analytics/occupancy      - Real-time occupancy
GET    /api/analytics/revenue        - Revenue reports
GET    /api/analytics/peak-hours     - Peak hour analysis
GET    /api/analytics/vehicle-dist   - Vehicle distribution
```

### 5.4 Admin
```
GET    /api/admin/dashboard          - Dashboard summary
POST   /api/admin/slots              - Create/update slots
PUT    /api/admin/slots/{id}/block   - Block/unblock slot
GET    /api/admin/maintenance        - Maintenance alerts
POST   /api/admin/pricing            - Update pricing rules
```

## 6. Concurrency Control Strategy

### 6.1 Slot Allocation (Pessimistic Locking)
```java
@Transactional(isolation = Isolation.SERIALIZABLE)
public ParkingSlot allocateSlot(VehicleType type, Long gateId) {
    // Use SELECT FOR UPDATE to lock the row
    ParkingSlot slot = slotRepository.findAndLockNearestAvailable(type, gateId);
    slot.setStatus(SlotStatus.OCCUPIED);
    return slotRepository.save(slot);
}
```

### 6.2 Reservation (Optimistic Locking)
```java
@Version
private Long version;

@Transactional
public Reservation createReservation(ReservationRequest request) {
    ParkingSlot slot = findAvailableSlot();
    // Version check prevents concurrent modifications
    slot.setStatus(SlotStatus.RESERVED);
    return reservationRepository.save(new Reservation(slot, request));
}
```

### 6.3 Retry Mechanism
```java
@Retryable(
    value = {OptimisticLockingFailureException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 100)
)
```

## 7. Distance Calculation

### 7.1 Nearest Slot Algorithm
```
Distance = √[(x₂ - x₁)² + (y₂ - y₁)²]

Algorithm:
1. Get entry gate coordinates
2. Filter slots by vehicle type and AVAILABLE status
3. Calculate distance for each slot
4. Sort by distance (ascending)
5. Return first slot (nearest)
```

## 8. Dynamic Pricing Logic

### 8.1 Calculation Formula
```
Base Fee = base_price
Hourly Fee = hours_parked * hourly_rate
Daily Fee = (days_parked * daily_rate) if days > 0
Penalty = overdue_hours * penalty_rate
EV Charging = charging_hours * ev_charging_rate
VIP Discount = total * (vip_discount_percent / 100)

Total = Base + Hourly/Daily + Penalty + EV Charging - VIP Discount
```

## 9. Real-time Updates

### 9.1 WebSocket Implementation
```
/topic/occupancy          - Occupancy updates
/topic/slots/{floorId}    - Floor-wise slot updates
/topic/alerts             - Maintenance alerts
```

### 9.2 Event-Driven Architecture
```
Events:
- SlotOccupiedEvent
- SlotVacatedEvent
- ReservationCreatedEvent
- ReservationExpiredEvent
- MaintenanceAlertEvent
```

## 10. Security Considerations

### 10.1 Authentication & Authorization
- Admin APIs: ROLE_ADMIN
- User APIs: ROLE_USER
- Public APIs: No authentication

### 10.2 Input Validation
- Vehicle number format validation
- Date/time range validation
- Payment amount validation

## 11. Technology Stack

### 11.1 Backend
- **Framework**: Spring Boot 3.x
- **Database**: PostgreSQL (production), H2 (development)
- **Caching**: Redis (optional)
- **WebSocket**: Spring WebSocket + STOMP

### 11.2 Frontend
- **Framework**: React.js
- **Real-time**: WebSocket client
- **UI Library**: Material-UI / Tailwind CSS
- **State Management**: Redux / Context API

## 12. Performance Optimizations

### 12.1 Database Indexing
- Composite index on (floor_id, vehicle_type, slot_status)
- Index on ticket status and entry_time
- Index on reservation status and time range

### 12.2 Caching Strategy
- Cache slot availability (TTL: 10 seconds)
- Cache pricing rules (TTL: 1 hour)
- Cache floor configuration (TTL: 1 day)

### 12.3 Connection Pooling
```properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
```

## 13. Monitoring & Alerts

### 13.1 Metrics
- Slot allocation time (SLA: <100ms)
- Database connection pool utilization
- API response times
- WebSocket connection count

### 13.2 Logging
- All check-in/check-out operations
- Failed slot allocations
- Payment transactions
- System errors and exceptions

## 14. Future Enhancements

1. License plate recognition (LPR) integration
2. Mobile app for users
3. Integration with payment gateways
4. Multi-tenancy support for multiple parking facilities
5. Machine learning for demand prediction
6. Dynamic pricing based on demand
7. Integration with navigation apps
