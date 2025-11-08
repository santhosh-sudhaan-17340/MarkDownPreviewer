// Dashboard JavaScript with WebSocket support for real-time updates

const API_BASE_URL = 'http://localhost:8080/api';
const WS_BASE_URL = 'http://localhost:8080/ws';

let stompClient = null;
let isConnected = false;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    connectWebSocket();
    loadDashboardData();
    setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
});

// Connect to WebSocket for real-time updates
function connectWebSocket() {
    const socket = new SockJS(WS_BASE_URL);
    stompClient = Stomp.over(socket);

    stompClient.connect({}, function(frame) {
        console.log('Connected: ' + frame);
        isConnected = true;
        updateConnectionStatus(true);

        // Subscribe to occupancy updates
        stompClient.subscribe('/topic/occupancy', function(message) {
            const occupancy = JSON.parse(message.body);
            updateOccupancyDisplay(occupancy);
        });

        // Subscribe to parking events
        stompClient.subscribe('/topic/events', function(message) {
            const event = JSON.parse(message.body);
            console.log('Parking event:', event);
            loadDashboardData(); // Refresh on any event
        });

    }, function(error) {
        console.error('WebSocket connection error:', error);
        isConnected = false;
        updateConnectionStatus(false);
        // Retry connection after 5 seconds
        setTimeout(connectWebSocket, 5000);
    });
}

// Update connection status indicator
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    const dotEl = statusEl.querySelector('.status-dot');
    const textEl = statusEl.querySelector('span');

    if (connected) {
        dotEl.classList.remove('offline');
        textEl.textContent = 'Live Updates Active';
    } else {
        dotEl.classList.add('offline');
        textEl.textContent = 'Reconnecting...';
    }
}

// Load dashboard data from API
async function loadDashboardData() {
    try {
        // Load occupancy statistics
        const occupancyResponse = await fetch(`${API_BASE_URL}/analytics/occupancy`);
        const occupancy = await occupancyResponse.json();
        updateOccupancyDisplay(occupancy);

        // Load admin dashboard summary
        const summaryResponse = await fetch(`${API_BASE_URL}/admin/dashboard`);
        const summary = await summaryResponse.json();
        updateDashboardSummary(summary);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update occupancy display
function updateOccupancyDisplay(occupancy) {
    // Update stats cards
    document.getElementById('totalSlots').textContent = occupancy.totalSlots || 0;
    document.getElementById('availableSlots').textContent = occupancy.availableSlots || 0;
    document.getElementById('occupiedSlots').textContent = occupancy.occupiedSlots || 0;
    document.getElementById('reservedSlots').textContent = occupancy.reservedSlots || 0;

    // Update occupancy bar
    const percentage = occupancy.occupancyPercentage || 0;
    const fillEl = document.getElementById('occupancyFill');
    const percentEl = document.getElementById('occupancyPercent');

    fillEl.style.width = percentage + '%';
    percentEl.textContent = percentage.toFixed(1) + '%';

    // Update color based on occupancy level
    if (percentage < 50) {
        fillEl.style.background = 'linear-gradient(90deg, #11998e 0%, #38ef7d 100%)';
    } else if (percentage < 80) {
        fillEl.style.background = 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)';
    } else {
        fillEl.style.background = 'linear-gradient(90deg, #ee0979 0%, #ff6a00 100%)';
    }

    // Update floor-wise occupancy
    if (occupancy.floorWiseOccupancy) {
        updateFloorOccupancy(occupancy.floorWiseOccupancy);
    }

    // Update vehicle type distribution
    if (occupancy.vehicleTypeDistribution) {
        updateVehicleDistribution(occupancy.vehicleTypeDistribution);
    }
}

// Update floor-wise occupancy
function updateFloorOccupancy(floorData) {
    const container = document.getElementById('floorOccupancy');
    container.innerHTML = '';

    for (const [floorName, count] of Object.entries(floorData)) {
        const floorItem = document.createElement('div');
        floorItem.className = 'floor-item';
        floorItem.innerHTML = `
            <h3>${count}</h3>
            <p>${floorName}</p>
        `;
        container.appendChild(floorItem);
    }
}

// Update vehicle type distribution
function updateVehicleDistribution(vehicleData) {
    const container = document.getElementById('vehicleDistribution');
    container.innerHTML = '';

    const icons = {
        'TWO_WHEELER': '🏍️',
        'CAR': '🚗',
        'TRUCK': '🚚'
    };

    const labels = {
        'TWO_WHEELER': 'Two-Wheelers',
        'CAR': 'Cars',
        'TRUCK': 'Trucks'
    };

    for (const [type, count] of Object.entries(vehicleData)) {
        const vehicleItem = document.createElement('div');
        vehicleItem.className = 'vehicle-item';
        vehicleItem.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 10px;">${icons[type] || '🚗'}</div>
            <h3>${count}</h3>
            <p>${labels[type] || type}</p>
        `;
        container.appendChild(vehicleItem);
    }
}

// Update dashboard summary
function updateDashboardSummary(summary) {
    if (summary.todayRevenue !== undefined) {
        document.getElementById('todayRevenue').textContent =
            '$' + summary.todayRevenue.toFixed(2);
    }

    if (summary.monthRevenue !== undefined) {
        document.getElementById('monthRevenue').textContent =
            '$' + summary.monthRevenue.toFixed(2);
    }
}

// Utility function to show notifications
function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    document.querySelector('.main-content').insertBefore(
        alertDiv,
        document.querySelector('.main-content').firstChild
    );

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}
