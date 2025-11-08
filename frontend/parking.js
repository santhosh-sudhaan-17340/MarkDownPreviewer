// Parking Operations JavaScript

const API_BASE_URL = 'http://localhost:8080/api';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadActiveTickets();
    setupFormHandlers();
    setInterval(loadActiveTickets, 30000); // Refresh every 30 seconds
});

// Setup form handlers
function setupFormHandlers() {
    document.getElementById('checkInForm').addEventListener('submit', handleCheckIn);
    document.getElementById('checkOutForm').addEventListener('submit', handleCheckOut);
}

// Handle vehicle check-in
async function handleCheckIn(event) {
    event.preventDefault();

    const checkInData = {
        vehicleNumber: document.getElementById('checkInVehicleNumber').value,
        vehicleType: document.getElementById('checkInVehicleType').value,
        gateId: parseInt(document.getElementById('checkInGateId').value),
        requiresEvCharging: document.getElementById('checkInEV').checked,
        isVip: document.getElementById('checkInVIP').checked,
        reservationNumber: document.getElementById('checkInReservation').value || null
    };

    try {
        const response = await fetch(`${API_BASE_URL}/parking/check-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(checkInData)
        });

        if (response.ok) {
            const result = await response.json();
            showTicket(result);
            showNotification('Vehicle checked in successfully!', 'success');
            document.getElementById('checkInForm').reset();
            loadActiveTickets();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Check-in failed', 'error');
        }
    } catch (error) {
        console.error('Check-in error:', error);
        showNotification('Network error occurred', 'error');
    }
}

// Handle vehicle check-out
async function handleCheckOut(event) {
    event.preventDefault();

    const checkOutData = {
        ticketNumber: document.getElementById('checkOutTicketNumber').value,
        paymentMethod: document.getElementById('checkOutPaymentMethod').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/parking/check-out`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(checkOutData)
        });

        if (response.ok) {
            const result = await response.json();
            displayCheckOutResult(result);
            showNotification('Vehicle checked out successfully!', 'success');
            document.getElementById('checkOutForm').reset();
            loadActiveTickets();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Check-out failed', 'error');
        }
    } catch (error) {
        console.error('Check-out error:', error);
        showNotification('Network error occurred', 'error');
    }
}

// Display ticket information
function showTicket(ticket) {
    const ticketDisplay = document.getElementById('ticketDisplay');
    const ticketContent = document.getElementById('ticketContent');

    ticketContent.innerHTML = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h3 style="color: #667eea; margin-bottom: 15px;">✅ ${ticket.message}</h3>
            <div style="display: grid; gap: 10px;">
                <p><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
                <p><strong>Vehicle Number:</strong> ${ticket.vehicleNumber}</p>
                <p><strong>Vehicle Type:</strong> ${ticket.vehicleType}</p>
                <p><strong>Slot Number:</strong> ${ticket.slotNumber}</p>
                <p><strong>Floor:</strong> ${ticket.floorNumber}</p>
                <p><strong>Entry Time:</strong> ${new Date(ticket.entryTime).toLocaleString()}</p>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: #fff; border: 2px dashed #667eea; border-radius: 5px; text-align: center;">
                <strong>Please save this ticket number for check-out</strong>
            </div>
        </div>
    `;

    ticketDisplay.style.display = 'block';
    ticketDisplay.scrollIntoView({ behavior: 'smooth' });
}

// Display check-out result
function displayCheckOutResult(result) {
    const resultDiv = document.getElementById('checkOutResult');

    resultDiv.innerHTML = `
        <div style="background: #d4edda; padding: 20px; border-radius: 8px; border: 1px solid #c3e6cb;">
            <h3 style="color: #155724; margin-bottom: 15px;">✅ ${result.message}</h3>
            <div style="display: grid; gap: 10px; color: #155724;">
                <p><strong>Ticket Number:</strong> ${result.ticketNumber}</p>
                <p><strong>Vehicle Number:</strong> ${result.vehicleNumber}</p>
                <p><strong>Duration:</strong> ${Math.floor(result.durationInMinutes / 60)} hours ${result.durationInMinutes % 60} minutes</p>
                <p><strong>Parking Fee:</strong> $${result.parkingFee.toFixed(2)}</p>
                <p><strong>Payment Status:</strong> ${result.paymentStatus}</p>
            </div>
        </div>
    `;
}

// Load active tickets
async function loadActiveTickets() {
    try {
        const response = await fetch(`${API_BASE_URL}/parking/check-in`);
        // Note: This endpoint doesn't exist in controller, we'd need to add it
        // For now, show a message
        document.getElementById('activeTicketsBody').innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center;">
                    Use the check-in and check-out forms above to manage parking
                </td>
            </tr>
        `;
    } catch (error) {
        console.error('Error loading active tickets:', error);
    }
}

// Calculate duration
function calculateDuration(entryTime) {
    const entry = new Date(entryTime);
    const now = new Date();
    const diffMs = now - entry;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
}

// Utility function to show notifications
function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(alertDiv, mainContent.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}
