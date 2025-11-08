// User-facing Application JavaScript

const API_BASE = window.location.origin + '/api';

// View Management
function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    document.getElementById(viewId).classList.add('active');
    document.querySelector(`[data-view="${viewId}"]`)?.classList.add('active');
}

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-link[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.currentTarget.dataset.view;
            showView(view);
        });
    });

    // Enter key handlers
    document.getElementById('trackingNumber')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') trackParcel();
    });

    document.getElementById('pickupCode')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('pickupPhone').focus();
    });

    document.getElementById('pickupPhone')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') pickupParcel();
    });
});

// Search for lockers
async function searchLockers() {
    const city = document.getElementById('citySearch').value.trim();
    const size = document.getElementById('sizeFilter').value;
    const container = document.getElementById('locationsResult');

    if (!city) {
        showNotification('Please enter a city name', 'error');
        return;
    }

    container.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading...</div>';

    try {
        let url = `/locations?city=${encodeURIComponent(city)}`;
        if (size) url += `&size=${size}`;

        const response = await fetch(API_BASE + url);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to search locations');
        }

        if (data.data.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-gray);">
                    <p>No lockers found in ${city}${size ? ' with ' + size + ' slots' : ''}</p>
                    <p>Try searching for a different city or size.</p>
                </div>
            `;
            return;
        }

        renderLocations(data.data);
    } catch (error) {
        console.error('Search error:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--danger);">
                Failed to load locations. Please try again.
            </div>
        `;
        showNotification(error.message, 'error');
    }
}

function renderLocations(locations) {
    const container = document.getElementById('locationsResult');

    const html = locations.map(loc => `
        <div class="location-card">
            <h3>${escapeHtml(loc.name)}</h3>
            <div class="location-info">
                <p>📍 ${escapeHtml(loc.address)}, ${escapeHtml(loc.city)}</p>
                <p>🏢 ${loc.locker_count} locker(s)</p>
                <p>📦 ${loc.available_slots} available slot(s)</p>
            </div>
            ${loc.operating_hours ? `
                <div style="font-size: 0.875rem; color: var(--text-gray); margin-top: 0.5rem;">
                    ⏰ Operating Hours Available
                </div>
            ` : ''}
        </div>
    `).join('');

    container.innerHTML = html;
}

// Track parcel
async function trackParcel() {
    const trackingNumber = document.getElementById('trackingNumber').value.trim().toUpperCase();
    const container = document.getElementById('trackingResult');

    if (!trackingNumber) {
        showNotification('Please enter a tracking number', 'error');
        return;
    }

    container.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading...</div>';

    try {
        const response = await fetch(`${API_BASE}/parcels/track/${encodeURIComponent(trackingNumber)}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Tracking number not found');
        }

        renderTrackingInfo(data.data);
    } catch (error) {
        console.error('Tracking error:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--danger);">
                <h3>Tracking Number Not Found</h3>
                <p>Please check the tracking number and try again.</p>
            </div>
        `;
        showNotification(error.message, 'error');
    }
}

function renderTrackingInfo(parcel) {
    const container = document.getElementById('trackingResult');

    const statusClass = `status-${parcel.status.toLowerCase().replace('_', '-')}`;
    const statusText = parcel.status.replace('_', ' ');

    let details = [
        { label: 'Tracking Number', value: parcel.tracking_number },
        { label: 'Size', value: parcel.parcel_size },
        { label: 'Recipient', value: parcel.recipient_name },
        { label: 'Status', value: statusText }
    ];

    if (parcel.location_name) {
        details.push({ label: 'Location', value: `${parcel.location_name}, ${parcel.city}` });
    }

    if (parcel.locker_number) {
        details.push({ label: 'Locker', value: parcel.locker_number });
        details.push({ label: 'Slot', value: parcel.slot_number });
    }

    if (parcel.dropped_at) {
        details.push({ label: 'Dropped At', value: new Date(parcel.dropped_at).toLocaleString() });
    }

    if (parcel.expires_at && parcel.status === 'IN_LOCKER') {
        const expiryDate = new Date(parcel.expires_at);
        const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        details.push({
            label: 'Pickup By',
            value: `${expiryDate.toLocaleDateString()} (${daysLeft} days left)`
        });
    }

    if (parcel.picked_up_at) {
        details.push({ label: 'Picked Up', value: new Date(parcel.picked_up_at).toLocaleString() });
    }

    const html = `
        <div>
            <span class="status-badge ${statusClass}">${statusText}</span>

            ${parcel.status === 'IN_LOCKER' ? `
                <div style="background: #dbeafe; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                    <strong>📬 Your parcel is ready for pickup!</strong>
                    <p style="margin: 0.5rem 0 0 0;">Check your email/SMS for the pickup code.</p>
                </div>
            ` : ''}

            <div class="tracking-details">
                ${details.map(d => `
                    <div class="detail-item">
                        <div class="detail-label">${d.label}</div>
                        <div class="detail-value">${escapeHtml(d.value)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// Pickup parcel
async function pickupParcel() {
    const pickupCode = document.getElementById('pickupCode').value.trim().toUpperCase();
    const phone = document.getElementById('pickupPhone').value.trim();
    const container = document.getElementById('pickupResult');

    if (!pickupCode || pickupCode.length !== 6) {
        showNotification('Please enter a valid 6-digit pickup code', 'error');
        return;
    }

    if (!phone) {
        showNotification('Please enter your phone number', 'error');
        return;
    }

    container.innerHTML = '<div style="text-align: center; padding: 2rem;">Verifying...</div>';

    try {
        const response = await fetch(`${API_BASE}/parcels/pickup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pickupCode, phone })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Pickup failed');
        }

        renderPickupSuccess(data.data);

        // Clear form
        document.getElementById('pickupCode').value = '';
        document.getElementById('pickupPhone').value = '';
    } catch (error) {
        console.error('Pickup error:', error);
        container.innerHTML = `
            <div style="background: #fee2e2; border: 2px solid var(--danger); color: #7f1d1d; padding: 2rem; border-radius: 0.75rem; text-align: center;">
                <h3 style="color: #7f1d1d; margin-bottom: 1rem;">❌ Pickup Failed</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
        showNotification(error.message, 'error');
    }
}

function renderPickupSuccess(data) {
    const container = document.getElementById('pickupResult');

    const html = `
        <div class="success-box">
            <h3>✅ Locker Unlocked!</h3>
            <p style="margin-bottom: 1.5rem;">Please proceed to the locker to collect your parcel.</p>

            <div class="locker-info">
                <div class="locker-detail">
                    <span>Location:</span>
                    <strong>${escapeHtml(data.lockerInfo.location)}</strong>
                </div>
                <div class="locker-detail">
                    <span>Locker Number:</span>
                    <strong>${escapeHtml(data.lockerInfo.lockerNumber)}</strong>
                </div>
                <div class="locker-detail">
                    <span>Slot Number:</span>
                    <strong>${escapeHtml(data.lockerInfo.slotNumber)}</strong>
                </div>
            </div>

            <p style="margin-top: 1rem; font-size: 0.875rem; opacity: 0.8;">
                The locker door is now open. Please close it securely after collecting your parcel.
            </p>
        </div>
    `;

    container.innerHTML = html;
    showNotification('Locker unlocked successfully!', 'success');
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Utility
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
