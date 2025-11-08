# Multi-Restaurant Delivery Platform

A comprehensive, production-ready food delivery platform similar to Swiggy/Uber Eats, built with microservices architecture featuring live order tracking, automatic delivery-partner assignment, load-balanced services, fraud detection, and route optimization.

## Features

### Core Features
- **Multi-Restaurant Support**: Browse and order from multiple restaurants
- **Live Order Tracking**: Real-time WebSocket-based order and delivery tracking
- **Automatic Partner Assignment**: Intelligent algorithm for optimal delivery partner selection
- **Route Optimization**: Advanced route planning and delivery time estimation
- **Fraud Detection**: Multi-layered fraud prevention system
- **Load Balancing**: Redis-based caching and message queues with Nginx
- **Payment Integration**: Secure payment processing
- **User Management**: Customer, restaurant, and delivery partner profiles

### Technical Highlights
- **Microservices Architecture**: 7+ independent, scalable services
- **Real-time Communication**: WebSocket for live tracking, Redis pub/sub for inter-service messaging
- **Database**: Hybrid approach with MongoDB (user/restaurant data) and PostgreSQL (transactional data)
- **Containerization**: Docker and docker-compose for easy deployment
- **Security**: JWT authentication, rate limiting, fraud detection
- **Caching**: Redis with in-memory fallback
- **Job Queues**: Bull for asynchronous task processing

## Architecture

```
┌─────────────────┐
│   Nginx LB      │
└────────┬────────┘
         │
┌────────▼────────┐
│  API Gateway    │
│   (Port 3000)   │
└────────┬────────┘
         │
         ├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
         │              │              │              │              │              │              │
    ┌────▼─────┐   ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐
    │  User    │   │Restaurant│  │  Order   │  │ Delivery │  │ Tracking │  │  Fraud   │  │ Payment  │
    │ Service  │   │ Service  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │
    │ (3001)   │   │ (3002)   │  │ (3003)   │  │ (3004)   │  │ (3005)   │  │ (3006)   │  │ (3007)   │
    └────┬─────┘   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
         │              │              │              │              │              │              │
         └──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
                                       │                              │
                        ┌──────────────┴──────────┬──────────────────┴────────┐
                        │                         │                           │
                   ┌────▼─────┐             ┌─────▼─────┐              ┌──────▼──────┐
                   │ MongoDB  │             │PostgreSQL │              │   Redis     │
                   │          │             │           │              │  Cache/Queue│
                   └──────────┘             └───────────┘              └─────────────┘
```

## Services

### 1. User Service (Port 3001)
- User registration and authentication
- Profile management
- Address management
- Customer, restaurant owner, and admin roles

### 2. Restaurant Service (Port 3002)
- Restaurant CRUD operations
- Menu management
- Search and filtering
- Nearby restaurant discovery (geospatial queries)

### 3. Order Service (Port 3003)
- Order creation and management
- Order status tracking
- Fraud detection integration
- Delivery partner assignment
- Job queue for async processing

### 4. Delivery Service (Port 3004)
**Partner Assignment Algorithm**:
- Multi-factor scoring (distance, rating, performance)
- Automatic partner selection
- Real-time availability tracking
- Load balancing across partners

**Route Optimization**:
- Single and multi-drop delivery routes
- Traffic-aware time estimation
- Delivery zone calculation
- Feasibility checking

### 5. Tracking Service (Port 3005)
- Real-time WebSocket connections
- Live location updates
- Order status broadcasting
- Redis pub/sub integration

### 6. Fraud Detection Service (Port 3006)
**Detection Mechanisms**:
- Order frequency analysis (velocity attacks)
- Payment history monitoring
- Distance anomaly detection
- Order value analysis
- Address pattern recognition
- Duplicate order detection
- Risk scoring (safe, low, medium, high, critical)

### 7. Payment Service (Port 3007)
- Payment processing
- Transaction management
- Payment history

### 8. API Gateway (Port 3000)
- Single entry point
- Request routing
- Rate limiting
- Load balancing
- Health monitoring

## Installation

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 16
- MongoDB 7
- Redis 7

### Quick Start with Docker

1. **Clone the repository**
```bash
git clone <repository-url>
cd MarkDownPreviewer
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start all services with Docker Compose**
```bash
docker-compose up -d
```

This will start:
- All microservices
- MongoDB
- PostgreSQL
- Redis
- Nginx load balancer

4. **Access the platform**
- API Gateway: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs
- Health Check: http://localhost:3000/health

### Manual Installation

1. **Install dependencies**
```bash
npm install
```

2. **Set up databases**
```bash
# Start MongoDB
mongod

# Start PostgreSQL and run init script
psql -U postgres -d delivery_platform -f src/database/init.sql

# Start Redis
redis-server
```

3. **Start services**
```bash
# Development mode (all services concurrently)
npm run dev

# Or start services individually
npm run start:user
npm run start:restaurant
npm run start:order
npm run start:delivery
npm run start:tracking
npm run start:fraud
npm run start:payment
npm run start  # API Gateway
```

## API Endpoints

### Authentication
```
POST /api/users/register      - Register new user
POST /api/users/login         - User login
POST /api/partners/register   - Register delivery partner
POST /api/partners/login      - Partner login
```

### Restaurants
```
GET    /api/restaurants              - Search restaurants
GET    /api/restaurants/nearby       - Get nearby restaurants
GET    /api/restaurants/:id          - Get restaurant details
GET    /api/restaurants/:id/menu     - Get restaurant menu
POST   /api/restaurants              - Create restaurant (auth)
PUT    /api/restaurants/:id          - Update restaurant (auth)
POST   /api/restaurants/:id/menu     - Add menu item (auth)
```

### Orders
```
POST   /api/orders                   - Create order (auth)
GET    /api/orders/my-orders         - Get user orders (auth)
GET    /api/orders/:id               - Get order details (auth)
GET    /api/orders/:id/track         - Track order (auth)
PUT    /api/orders/:id/cancel        - Cancel order (auth)
PUT    /api/orders/:id/status        - Update order status (auth)
POST   /api/orders/:id/rate          - Rate order (auth)
```

### Delivery
```
GET    /api/delivery/availability     - Check partner availability
POST   /api/delivery/route/calculate  - Calculate delivery route
POST   /api/delivery/feasibility      - Check delivery feasibility
POST   /api/delivery/zones            - Get delivery zones
```

### Partners
```
GET    /api/partners/profile          - Get partner profile (auth)
PUT    /api/partners/profile          - Update profile (auth)
PUT    /api/partners/location         - Update location (auth)
PUT    /api/partners/status           - Update status (auth)
POST   /api/partners/orders/:id/accept - Accept order (auth)
POST   /api/partners/orders/:id/reject - Reject order (auth)
GET    /api/partners/earnings         - Get earnings (auth)
```

### Real-time Tracking
```javascript
// WebSocket connection
const socket = io('http://localhost:3005');

// Track order
socket.emit('track_order', {
  orderId: 'order-id',
  userType: 'customer',
  userId: 'user-id'
});

// Listen for updates
socket.on('location_update', (data) => {
  console.log('Partner location:', data.location);
});

socket.on('status_update', (data) => {
  console.log('Order status:', data.status);
});
```

## Key Algorithms

### 1. Partner Assignment Algorithm
The system uses a multi-factor weighted scoring system:

```javascript
Score = (Distance Score × 0.4) + (Rating Score × 0.3) + (Performance Score × 0.3)
```

Factors considered:
- **Distance**: Proximity to restaurant
- **Rating**: Partner's customer rating
- **Performance**: Completion rate and on-time delivery rate

### 2. Route Optimization
- **Single Delivery**: Direct path with traffic consideration
- **Multi-Delivery**: Nearest neighbor algorithm for optimal sequence
- **Traffic Adjustment**: Time multipliers based on traffic conditions
- **Zone-based**: Delivery zones with dynamic pricing

### 3. Fraud Detection
Risk scoring based on:
- Order frequency (velocity attacks)
- Payment failure history
- Unusual delivery distances
- Order value anomalies
- Address pattern changes
- Duplicate orders
- Time-based anomalies

Risk levels: Safe → Low → Medium → High → Critical

## Configuration

### Environment Variables

Key configurations in `.env`:

```bash
# Service Ports
GATEWAY_PORT=3000
USER_SERVICE_PORT=3001
RESTAURANT_SERVICE_PORT=3002
ORDER_SERVICE_PORT=3003
DELIVERY_SERVICE_PORT=3004
TRACKING_SERVICE_PORT=3005
FRAUD_SERVICE_PORT=3006
PAYMENT_SERVICE_PORT=3007

# Database
MONGODB_URI=mongodb://localhost:27017/delivery_platform
POSTGRES_HOST=localhost
POSTGRES_DB=delivery_platform
REDIS_HOST=localhost

# Security
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Fraud Detection
MAX_ORDERS_PER_HOUR=10
MAX_FAILED_PAYMENTS=3
SUSPICIOUS_DISTANCE_KM=50

# Route Optimization
MAX_DELIVERY_DISTANCE_KM=20
AVERAGE_SPEED_KMH=30
```

## Database Schema

### PostgreSQL (Transactional Data)
- `orders` - Order records
- `payments` - Payment transactions
- `order_tracking` - Order status history
- `partner_locations` - Location history
- `fraud_logs` - Fraud detection logs

### MongoDB (Operational Data)
- `users` - Customer accounts
- `restaurants` - Restaurant profiles and menus
- `deliverypartners` - Delivery partner profiles

## Load Balancing

The platform uses multiple load balancing strategies:

1. **Nginx**: Frontend load balancing across gateway instances
2. **Redis**: Distributed caching and session management
3. **Bull Queues**: Asynchronous job processing
4. **Partner Assignment**: Intelligent distribution of delivery jobs

## Security Features

- **JWT Authentication**: Token-based auth with blacklisting
- **Rate Limiting**: API and auth endpoint protection
- **Helmet.js**: Security headers
- **Input Validation**: Request validation with Joi
- **Fraud Detection**: Multi-layer fraud prevention
- **CORS**: Configurable cross-origin policies

## Monitoring and Logging

- **Winston**: Structured logging
- **Morgan**: HTTP request logging
- **Health Checks**: Service health monitoring
- **Metrics**: Queue stats, connection counts

## Testing

```bash
# Run tests
npm test

# Test individual services
npm run test:user
npm run test:order
```

## Production Deployment

### Docker Deployment
```bash
# Build images
docker-compose build

# Start production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale order-service=3
```

### Environment Checklist
- [ ] Update JWT_SECRET
- [ ] Configure production databases
- [ ] Set up SSL certificates
- [ ] Configure payment gateway credentials
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure backup strategy
- [ ] Set up logging aggregation

## Performance Optimization

- **Caching**: Redis caching for frequently accessed data
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Database connection management
- **Compression**: Response compression with gzip
- **CDN**: Static assets via CDN (in production)
- **Horizontal Scaling**: Stateless services for easy scaling

## Future Enhancements

- [ ] Mobile applications (React Native)
- [ ] Advanced ML-based fraud detection
- [ ] Real-time traffic integration (Google Maps API)
- [ ] Multi-currency support
- [ ] Loyalty programs
- [ ] Restaurant analytics dashboard
- [ ] Partner mobile app
- [ ] Chat support
- [ ] Scheduled deliveries
- [ ] Subscription plans

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License

## Support

For issues and questions:
- Create an issue on GitHub
- Email: support@deliveryplatform.com

## Acknowledgments

Built with modern Node.js ecosystem:
- Express.js for REST APIs
- Socket.IO for real-time communication
- MongoDB & PostgreSQL for data persistence
- Redis for caching and queuing
- Docker for containerization
