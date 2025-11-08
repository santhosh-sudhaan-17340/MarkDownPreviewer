# Usage Examples

This document provides practical examples of using the Appointment Scheduling System API.

## Table of Contents
- [Setup Example Data](#setup-example-data)
- [Common Workflows](#common-workflows)
- [Advanced Scenarios](#advanced-scenarios)

## Setup Example Data

### 1. Create Resources

```bash
# Create a doctor
curl -X POST http://localhost:3000/api/resources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Sarah Johnson",
    "type": "DOCTOR",
    "email": "sarah.johnson@clinic.com",
    "phone": "+1-555-0123",
    "description": "General Practitioner with 10 years experience"
  }'

# Save the returned resourceId for later use
# Example response: {"id": "550e8400-e29b-41d4-a716-446655440000", ...}

# Create a barber
curl -X POST http://localhost:3000/api/resources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mike Stevens",
    "type": "BARBER",
    "email": "mike@barbershop.com",
    "phone": "+1-555-0456"
  }'
```

### 2. Set Up Schedules

```bash
# Add Monday schedule for Dr. Johnson (9 AM - 5 PM)
curl -X POST http://localhost:3000/api/resources/550e8400-e29b-41d4-a716-446655440000/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "17:00"
  }'

# Add Tuesday schedule
curl -X POST http://localhost:3000/api/resources/550e8400-e29b-41d4-a716-446655440000/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "dayOfWeek": 2,
    "startTime": "09:00",
    "endTime": "17:00"
  }'

# Add Wednesday schedule
curl -X POST http://localhost:3000/api/resources/550e8400-e29b-41d4-a716-446655440000/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "dayOfWeek": 3,
    "startTime": "09:00",
    "endTime": "17:00"
  }'

# Add Friday schedule (half day)
curl -X POST http://localhost:3000/api/resources/550e8400-e29b-41d4-a716-446655440000/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "dayOfWeek": 5,
    "startTime": "09:00",
    "endTime": "13:00"
  }'
```

### 3. Create Customers

```bash
# Create customer 1
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@email.com",
    "phone": "+1-555-1001"
  }'

# Save customerId: e.g., "660e8400-e29b-41d4-a716-446655440001"

# Create customer 2
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane.smith@email.com",
    "phone": "+1-555-1002"
  }'
```

### 4. Create Cancellation Rules

```bash
# Create a 24-hour cancellation policy with 50% penalty
curl -X POST http://localhost:3000/api/penalties/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Standard 24-Hour Policy",
    "hoursBeforeStart": 24,
    "penaltyPercentage": 50
  }'
```

## Common Workflows

### Workflow 1: Book an Appointment

#### Step 1: Search for Available Slots

```bash
# Find next 5 available slots for any doctor
curl -X POST http://localhost:3000/api/availability/search \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "DOCTOR",
    "durationMinutes": 30,
    "limit": 5
  }'

# Response will include available slots:
# {
#   "count": 5,
#   "slots": [
#     {
#       "resourceId": "550e8400-e29b-41d4-a716-446655440000",
#       "resourceName": "Dr. Sarah Johnson",
#       "startTime": "2024-01-15T09:00:00Z",
#       "endTime": "2024-01-15T09:30:00Z"
#     },
#     ...
#   ]
# }
```

#### Step 2: Check Specific Slot Availability

```bash
# Verify a specific slot is still available
curl -X POST http://localhost:3000/api/availability/check \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "550e8400-e29b-41d4-a716-446655440000",
    "startTime": "2024-01-15T09:00:00Z",
    "endTime": "2024-01-15T09:30:00Z"
  }'

# Response: {"isAvailable": true}
```

#### Step 3: Book the Appointment

```bash
# Create the appointment
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "550e8400-e29b-41d4-a716-446655440000",
    "customerId": "660e8400-e29b-41d4-a716-446655440001",
    "startTime": "2024-01-15T09:00:00Z",
    "endTime": "2024-01-15T09:30:00Z",
    "notes": "Annual checkup"
  }'

# Save appointmentId from response
```

### Workflow 2: Reschedule an Appointment

```bash
# Reschedule to a new time
curl -X POST http://localhost:3000/api/appointments/770e8400-e29b-41d4-a716-446655440002/reschedule \
  -H "Content-Type: application/json" \
  -d '{
    "newStartTime": "2024-01-16T14:00:00Z",
    "newEndTime": "2024-01-16T14:30:00Z"
  }'
```

### Workflow 3: Cancel an Appointment

```bash
# Cancel appointment (within 24-hour window = no penalty)
curl -X POST http://localhost:3000/api/appointments/770e8400-e29b-41d4-a716-446655440002/cancel

# Response will indicate if penalty was applied:
# {
#   "appointment": {...},
#   "penaltyApplied": false
# }
```

### Workflow 4: Handle No-Show

```bash
# Mark appointment as no-show (applies penalty)
curl -X POST http://localhost:3000/api/appointments/770e8400-e29b-41d4-a716-446655440002/no-show

# This will:
# 1. Update appointment status to NO_SHOW
# 2. Create penalty record
# 3. Increment customer's no-show count
# 4. Add penalty amount to customer's total
```

### Workflow 5: View Customer History

```bash
# Get customer statistics
curl http://localhost:3000/api/customers/660e8400-e29b-41d4-a716-446655440001/stats

# Response:
# {
#   "customerId": "660e8400-e29b-41d4-a716-446655440001",
#   "name": "John Doe",
#   "email": "john.doe@email.com",
#   "totalAppointments": 15,
#   "completedAppointments": 12,
#   "cancelledAppointments": 2,
#   "noShowAppointments": 1,
#   "noShowCount": 1,
#   "totalPenalty": 25.00,
#   "unpaidPenalties": 25.00
# }

# Get customer's upcoming appointments
curl http://localhost:3000/api/customers/660e8400-e29b-41d4-a716-446655440001/appointments?futureOnly=true

# Get customer's penalties
curl http://localhost:3000/api/customers/660e8400-e29b-41d4-a716-446655440001/penalties?unpaidOnly=true
```

### Workflow 6: View Resource Availability

```bash
# Get all available slots for a resource over the next week
curl "http://localhost:3000/api/availability/resource/550e8400-e29b-41d4-a716-446655440000?startDate=2024-01-15&endDate=2024-01-22&durationMinutes=30"

# Get resource utilization statistics
curl "http://localhost:3000/api/availability/resource/550e8400-e29b-41d4-a716-446655440000/utilization?startDate=2024-01-01&endDate=2024-01-31"

# Response:
# {
#   "resourceId": "550e8400-e29b-41d4-a716-446655440000",
#   "totalSlots": 336,
#   "bookedSlots": 250,
#   "availableSlots": 86,
#   "utilizationPercentage": 74.40
# }
```

## Advanced Scenarios

### Scenario 1: Prevent Double Booking (Concurrent Requests)

The system uses database-level locking to prevent double booking even when multiple requests arrive simultaneously:

```bash
# Terminal 1: Try to book a slot
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "550e8400-e29b-41d4-a716-446655440000",
    "customerId": "660e8400-e29b-41d4-a716-446655440001",
    "startTime": "2024-01-15T10:00:00Z",
    "endTime": "2024-01-15T10:30:00Z"
  }'

# Terminal 2: Simultaneously try to book the SAME slot
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "550e8400-e29b-41d4-a716-446655440000",
    "customerId": "660e8400-e29b-41d4-a716-446655440002",
    "startTime": "2024-01-15T10:00:00Z",
    "endTime": "2024-01-15T10:30:00Z"
  }'

# Result: One succeeds, the other gets:
# {"error": "Time slot is already booked. Please choose another time."}
```

### Scenario 2: Find Nearest Available Slot for Any Resource

```bash
# Search across all barbers for next available 45-minute slot
curl -X POST http://localhost:3000/api/availability/search \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "BARBER",
    "durationMinutes": 45,
    "limit": 1
  }'

# Returns the absolute nearest available slot
```

### Scenario 3: Complex Scheduling

```bash
# Find slots for a specific resource starting from a specific date
curl -X POST http://localhost:3000/api/availability/search \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "550e8400-e29b-41d4-a716-446655440000",
    "startDate": "2024-02-01T00:00:00Z",
    "endDate": "2024-02-28T23:59:59Z",
    "durationMinutes": 60,
    "limit": 20
  }'
```

### Scenario 4: Penalty Management

```bash
# Pay a penalty
curl -X POST http://localhost:3000/api/penalties/880e8400-e29b-41d4-a716-446655440003/pay

# Waive a penalty (forgive customer)
curl -X POST http://localhost:3000/api/penalties/880e8400-e29b-41d4-a716-446655440003/waive

# Get system-wide penalty statistics
curl http://localhost:3000/api/penalties/stats/all

# Response:
# {
#   "totalPenalties": 45,
#   "paidPenalties": 30,
#   "unpaidPenalties": 15,
#   "totalAmount": 1125.00,
#   "paidAmount": 750.00,
#   "unpaidAmount": 375.00
# }
```

### Scenario 5: Managing Resources

```bash
# Get all resources of a specific type
curl http://localhost:3000/api/resources?type=DOCTOR

# Update resource information
curl -X PUT http://localhost:3000/api/resources/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "General Practitioner - Now specializing in sports medicine"
  }'

# Deactivate a resource (soft delete)
curl -X DELETE http://localhost:3000/api/resources/550e8400-e29b-41d4-a716-446655440000

# Get resource with schedules
curl http://localhost:3000/api/resources/550e8400-e29b-41d4-a716-446655440000
```

## Integration Examples

### JavaScript/Node.js Client

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function bookAppointment(resourceId, customerId, startTime, endTime) {
  try {
    // First, check if slot is available
    const checkResponse = await axios.post(`${API_BASE}/availability/check`, {
      resourceId,
      startTime,
      endTime
    });

    if (!checkResponse.data.isAvailable) {
      throw new Error('Slot is not available');
    }

    // Book the appointment
    const bookResponse = await axios.post(`${API_BASE}/appointments`, {
      resourceId,
      customerId,
      startTime,
      endTime,
      notes: 'Booked via API'
    });

    console.log('Appointment booked:', bookResponse.data);
    return bookResponse.data;
  } catch (error) {
    console.error('Error booking appointment:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
bookAppointment(
  '550e8400-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440001',
  '2024-01-15T10:00:00Z',
  '2024-01-15T10:30:00Z'
);
```

### Python Client

```python
import requests
from datetime import datetime, timedelta

API_BASE = 'http://localhost:3000/api'

def find_and_book_appointment(customer_id, resource_type='DOCTOR', duration_minutes=30):
    # Search for available slots
    search_response = requests.post(f'{API_BASE}/availability/search', json={
        'resourceType': resource_type,
        'durationMinutes': duration_minutes,
        'limit': 1
    })

    if search_response.status_code != 200:
        raise Exception('Failed to search availability')

    slots = search_response.json()['slots']
    if not slots:
        raise Exception('No available slots found')

    # Book the first available slot
    slot = slots[0]
    book_response = requests.post(f'{API_BASE}/appointments', json={
        'resourceId': slot['resourceId'],
        'customerId': customer_id,
        'startTime': slot['startTime'],
        'endTime': slot['endTime']
    })

    if book_response.status_code == 201:
        print(f"Appointment booked with {slot['resourceName']}")
        return book_response.json()
    else:
        raise Exception(f"Booking failed: {book_response.json()}")

# Usage
appointment = find_and_book_appointment('660e8400-e29b-41d4-a716-446655440001')
print(f"Appointment ID: {appointment['id']}")
```

## Testing Scenarios

### Load Testing Concurrent Bookings

```bash
# Use Apache Bench or similar tools to test concurrent booking prevention
ab -n 100 -c 10 -p appointment.json -T application/json \
  http://localhost:3000/api/appointments

# Where appointment.json contains the same appointment details
# Expected: Only 1 booking succeeds for each time slot
```

### Testing Reminder System

```bash
# Create an appointment 25 hours in the future
# Wait for reminder processor to run (runs every minute)
# Check logs for reminder processing

# Manually trigger reminder processing (in development):
# The reminder service will automatically process pending reminders every minute
```

This should give you a comprehensive understanding of how to use the Appointment Scheduling System!
