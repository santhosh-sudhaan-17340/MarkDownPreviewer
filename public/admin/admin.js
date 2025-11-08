// Admin Portal JavaScript

const API_BASE = window.location.origin + '/api';
let authToken = localStorage.getItem('adminToken');
let currentSection = 'dashboard';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (!authToken) {
        showLoginModal();
    } else {
        initializeApp();
    }

    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const section = e.currentTarget.dataset.section;
            switchSection(section);
        });
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadCurrentSection();
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Overfill threshold
    document.getElementById('thresholdSelect')?.addEventListener('change', () => {
        if (currentSection === 'overfill') {
            loadOverfillReport();
        }
    });

    // Audit filters
    document.getElementById('auditEntityFilter')?.addEventListener('change', loadAuditLogs);
    document.getElementById('auditActionFilter')?.addEventListener('change', loadAuditLogs);

    // Optimization tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            switchTab(tab);
        });
    });
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            if (data.data.user.role !== 'ADMIN' && data.data.user.role !== 'SUPER_ADMIN') {
                errorEl.textContent = 'Admin access required';
                errorEl.classList.add('active');
                return;
            }

            authToken = data.data.token;
            localStorage.setItem('adminToken', authToken);
            localStorage.setItem('adminUser', JSON.stringify(data.data.user));

            hideLoginModal();
            initializeApp();
        } else {
            errorEl.textContent = data.error || 'Login failed';
            errorEl.classList.add('active');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.classList.add('active');
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    showLoginModal();
}

function showLoginModal() {
    document.getElementById('loginModal').classList.add('active');
}

function hideLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
}

// Initialize
function initializeApp() {
    const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
    document.getElementById('userName').textContent = user.fullName || user.email || 'Admin';

    loadDashboard();
}

// API Helper
async function apiCall(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'API request failed');
    }

    return data.data;
}

// Section Management
function switchSection(section) {
    currentSection = section;

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Update content sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === section);
    });

    // Update header
    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'Overview of parcel locker system' },
        health: { title: 'Health Checks', subtitle: 'Monitor locker health and performance' },
        overfill: { title: 'Overfill Report', subtitle: 'Lockers approaching capacity' },
        optimization: { title: 'Logistics Optimization', subtitle: 'Data-driven insights for operations' },
        expired: { title: 'Expired Parcels', subtitle: 'Parcels needing removal' },
        lockers: { title: 'Manage Lockers', subtitle: 'Locker configuration and status' },
        audit: { title: 'Audit Logs', subtitle: 'System activity history' }
    };

    const info = titles[section] || { title: section, subtitle: '' };
    document.getElementById('sectionTitle').textContent = info.title;
    document.getElementById('sectionSubtitle').textContent = info.subtitle;

    loadCurrentSection();
}

function loadCurrentSection() {
    const loaders = {
        dashboard: loadDashboard,
        health: loadHealthChecks,
        overfill: loadOverfillReport,
        optimization: loadOptimization,
        expired: loadExpiredParcels,
        lockers: loadLockers,
        audit: loadAuditLogs
    };

    const loader = loaders[currentSection];
    if (loader) {
        loader();
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tab);
    });
}

// Dashboard
async function loadDashboard() {
    try {
        const data = await apiCall('/admin/dashboard');

        // Update stats
        document.getElementById('activeLockers').textContent = data.statistics.active_lockers || 0;
        document.getElementById('parcelsInLockers').textContent = data.statistics.parcels_in_lockers || 0;
        document.getElementById('pickupsToday').textContent = data.statistics.pickups_today || 0;
        document.getElementById('expiredParcels').textContent = data.statistics.expired_parcels || 0;

        // Capacity overview
        renderCapacityOverview(data.capacity);

        // Recent activity
        renderRecentActivity(data.recentActivity);

        updateLastUpdated();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

function renderCapacityOverview(capacity) {
    const container = document.getElementById('capacityOverview');

    if (!capacity || capacity.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No data available</p>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Location</th>
                    <th>Locker</th>
                    <th>Status</th>
                    <th>Capacity</th>
                    <th>Occupancy</th>
                </tr>
            </thead>
            <tbody>
                ${capacity.map(c => `
                    <tr>
                        <td>${escapeHtml(c.location_name)}</td>
                        <td>${escapeHtml(c.locker_number)}</td>
                        <td>${getStatusBadge(c.status)}</td>
                        <td>${c.occupied_slots}/${c.total_slots}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span>${c.occupancy_percent || 0}%</span>
                                <div class="progress-bar" style="flex: 1;">
                                    <div class="progress-fill ${getProgressClass(c.occupancy_percent)}"
                                         style="width: ${c.occupancy_percent || 0}%"></div>
                                </div>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderRecentActivity(activities) {
    const container = document.getElementById('recentActivity');

    if (!activities || activities.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No recent activity</p>';
        return;
    }

    const html = activities.slice(0, 15).map(a => `
        <div class="activity-item">
            <div>
                <div class="activity-action">${getActionIcon(a.action)} ${formatAction(a.action, a.entity_type)}</div>
                <div class="activity-time">${formatTime(a.created_at)}</div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// Health Checks
async function loadHealthChecks() {
    try {
        const data = await apiCall('/admin/health-checks');

        renderHealthStatus(data.healthStatus);
        renderLockerIssues(data.lockerIssues);

        updateLastUpdated();
    } catch (error) {
        console.error('Error loading health checks:', error);
        showError('Failed to load health check data');
    }
}

function renderHealthStatus(health) {
    const container = document.getElementById('healthStatus');

    if (!health || health.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No data available</p>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Location</th>
                    <th>Locker</th>
                    <th>Status</th>
                    <th>Faulty Slots</th>
                    <th>Temperature</th>
                    <th>Humidity</th>
                    <th>Maintenance</th>
                </tr>
            </thead>
            <tbody>
                ${health.map(h => `
                    <tr>
                        <td>${escapeHtml(h.location_name)}</td>
                        <td>${escapeHtml(h.locker_number)}</td>
                        <td>${getStatusBadge(h.status)}</td>
                        <td>${h.faulty_slots || 0}</td>
                        <td>${h.temperature_celsius ? h.temperature_celsius + '°C' : '-'}</td>
                        <td>${h.humidity_percent ? h.humidity_percent + '%' : '-'}</td>
                        <td>${getMaintenanceBadge(h.maintenance_status)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderLockerIssues(issues) {
    const container = document.getElementById('lockerIssues');

    if (!issues || issues.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">✅ No issues detected</p>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Location</th>
                    <th>Locker</th>
                    <th>Status</th>
                    <th>Door Errors</th>
                    <th>Lock Errors</th>
                    <th>Last Maintenance</th>
                </tr>
            </thead>
            <tbody>
                ${issues.map(i => `
                    <tr>
                        <td>${escapeHtml(i.location_name)}</td>
                        <td>${escapeHtml(i.locker_number)}</td>
                        <td>${getStatusBadge(i.status)}</td>
                        <td class="${i.door_sensor_errors > 0 ? 'text-danger' : ''}">${i.door_sensor_errors || 0}</td>
                        <td class="${i.lock_sensor_errors > 0 ? 'text-danger' : ''}">${i.lock_sensor_errors || 0}</td>
                        <td>${formatDate(i.last_maintenance)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Overfill Report
async function loadOverfillReport() {
    try {
        const threshold = document.getElementById('thresholdSelect').value;
        const data = await apiCall(`/admin/overfill-report?threshold=${threshold}`);

        renderOverfillData(data.overfillLockers);

        updateLastUpdated();
    } catch (error) {
        console.error('Error loading overfill report:', error);
        showError('Failed to load overfill report');
    }
}

function renderOverfillData(lockers) {
    const container = document.getElementById('overfillData');

    if (!lockers || lockers.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No lockers approaching capacity</p>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Location</th>
                    <th>Locker</th>
                    <th>Occupancy</th>
                    <th>Available</th>
                    <th>By Size (S/M/L/XL)</th>
                    <th>Est. Full In</th>
                </tr>
            </thead>
            <tbody>
                ${lockers.map(l => `
                    <tr>
                        <td>${escapeHtml(l.location_name)}<br><small class="text-muted">${escapeHtml(l.city)}</small></td>
                        <td>${escapeHtml(l.locker_number)}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <strong>${l.occupancy_percent}%</strong>
                                <div class="progress-bar" style="flex: 1;">
                                    <div class="progress-fill ${getProgressClass(l.occupancy_percent)}"
                                         style="width: ${l.occupancy_percent}%"></div>
                                </div>
                            </div>
                        </td>
                        <td>${l.available_slots}/${l.total_slots}</td>
                        <td>${l.small_available || 0}/${l.medium_available || 0}/${l.large_available || 0}/${l.xlarge_available || 0}</td>
                        <td>${formatEstimatedTime(l.estimated_full_seconds)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Optimization
async function loadOptimization() {
    try {
        const data = await apiCall('/admin/logistics-optimization');

        renderExpansionAnalysis(data.expansionAnalysis);
        renderSlotSizeOptimization(data.slotSizeOptimization);
        renderPeakHours(data.peakHoursAnalysis);
        renderMaintenance(data.maintenanceOptimization);

        updateLastUpdated();
    } catch (error) {
        console.error('Error loading optimization data:', error);
        showError('Failed to load optimization data');
    }
}

function renderExpansionAnalysis(data) {
    const container = document.getElementById('expansionData');

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No data available</p>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>City</th>
                    <th>Existing Locations</th>
                    <th>Avg Occupancy</th>
                    <th>Parcels/Location</th>
                    <th>Recent Parcels (30d)</th>
                    <th>Priority</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(d => `
                    <tr>
                        <td><strong>${escapeHtml(d.city)}</strong></td>
                        <td>${d.existing_locations}</td>
                        <td>${d.avg_occupancy_percent}%</td>
                        <td>${d.parcels_per_location}</td>
                        <td>${d.recent_parcels}</td>
                        <td>${getPriorityBadge(d.expansion_priority)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderSlotSizeOptimization(data) {
    const container = document.getElementById('slotsizeData');

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No data available</p>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Location</th>
                    <th>Size</th>
                    <th>Demand (90d)</th>
                    <th>Supply</th>
                    <th>Ratio</th>
                    <th>Recommendation</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(d => `
                    <tr>
                        <td>${escapeHtml(d.location)}<br><small class="text-muted">${escapeHtml(d.city)}</small></td>
                        <td>${d.size}</td>
                        <td>${d.demand}</td>
                        <td>${d.supply} (${d.current_available} free)</td>
                        <td>${d.demand_supply_ratio || '-'}</td>
                        <td>${getRecommendationBadge(d.recommendation)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderPeakHours(data) {
    const container = document.getElementById('peakhoursData');

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No data available</p>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Day</th>
                    <th>Hour</th>
                    <th>City</th>
                    <th>Parcel Count</th>
                    <th>Avg Storage (hours)</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(d => `
                    <tr>
                        <td>${d.day_name}</td>
                        <td>${formatHour(d.hour_of_day)}:00</td>
                        <td>${escapeHtml(d.city)}</td>
                        <td><strong>${d.parcel_count}</strong></td>
                        <td>${parseFloat(d.avg_storage_hours || 0).toFixed(1)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderMaintenance(data) {
    const container = document.getElementById('maintenanceData');

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No maintenance due</p>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Location</th>
                    <th>Locker</th>
                    <th>Priority</th>
                    <th>Next Maintenance</th>
                    <th>Days Until</th>
                    <th>Busy Hours</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(d => `
                    <tr>
                        <td>${escapeHtml(d.location_name)}</td>
                        <td>${escapeHtml(d.locker_number)}</td>
                        <td>${getMaintenancePriorityBadge(d.maintenance_priority)}</td>
                        <td>${formatDate(d.next_maintenance)}</td>
                        <td>${Math.round(d.days_until_maintenance) || 0}</td>
                        <td><small>${d.busy_hours ? d.busy_hours.join(', ') : 'N/A'}</small></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Expired Parcels
async function loadExpiredParcels() {
    try {
        const data = await apiCall('/admin/expired-parcels');
        renderExpiredParcelsData(data);
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading expired parcels:', error);
        showError('Failed to load expired parcels');
    }
}

function renderExpiredParcelsData(parcels) {
    const container = document.getElementById('expiredParcelsData');

    if (!parcels || parcels.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">✅ No expired parcels</p>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Tracking #</th>
                    <th>Recipient</th>
                    <th>Location</th>
                    <th>Locker/Slot</th>
                    <th>Dropped</th>
                    <th>Expired</th>
                    <th>Days Overdue</th>
                </tr>
            </thead>
            <tbody>
                ${parcels.map(p => `
                    <tr>
                        <td><code>${escapeHtml(p.tracking_number)}</code></td>
                        <td>
                            ${escapeHtml(p.recipient_name)}<br>
                            <small class="text-muted">${escapeHtml(p.recipient_phone)}</small>
                        </td>
                        <td>${escapeHtml(p.location_name)}</td>
                        <td>${escapeHtml(p.locker_number)} / ${escapeHtml(p.slot_number)}</td>
                        <td>${formatDate(p.dropped_at)}</td>
                        <td>${formatDate(p.expires_at)}</td>
                        <td class="text-danger"><strong>${Math.floor(p.days_overdue)} days</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Lockers Management
async function loadLockers() {
    try {
        const data = await apiCall('/admin/dashboard');
        renderLockersData(data.capacity);
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading lockers:', error);
        showError('Failed to load lockers');
    }
}

function renderLockersData(capacity) {
    const container = document.getElementById('lockersData');

    if (!capacity || capacity.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No lockers found</p>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Location</th>
                    <th>Locker</th>
                    <th>Status</th>
                    <th>Capacity</th>
                    <th>Occupancy</th>
                    <th>Temperature</th>
                    <th>Last Maintenance</th>
                </tr>
            </thead>
            <tbody>
                ${capacity.map(c => `
                    <tr>
                        <td>${escapeHtml(c.location_name)}<br><small class="text-muted">${escapeHtml(c.city)}</small></td>
                        <td>${escapeHtml(c.locker_number)}</td>
                        <td>${getStatusBadge(c.status)}</td>
                        <td>${c.occupied_slots}/${c.total_slots}</td>
                        <td>${c.occupancy_percent || 0}%</td>
                        <td>${c.temperature_celsius ? c.temperature_celsius + '°C' : '-'}</td>
                        <td>${formatDate(c.last_maintenance)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Audit Logs
async function loadAuditLogs() {
    try {
        const entityType = document.getElementById('auditEntityFilter').value;
        const action = document.getElementById('auditActionFilter').value;

        let query = '?limit=50';
        if (entityType) query += `&entityType=${entityType}`;
        if (action) query += `&action=${action}`;

        const data = await apiCall(`/admin/audit-logs${query}`);
        renderAuditData(data);
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading audit logs:', error);
        showError('Failed to load audit logs');
    }
}

function renderAuditData(logs) {
    const container = document.getElementById('auditData');

    if (!logs || logs.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No audit logs found</p>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Entity</th>
                    <th>Action</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(l => `
                    <tr>
                        <td>${formatTime(l.created_at)}</td>
                        <td>${l.entity_type}</td>
                        <td>${getActionBadge(l.action)}</td>
                        <td><small class="text-muted">${formatJsonSummary(l.new_values)}</small></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Helper Functions
function formatTime(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' hr ago';

    return date.toLocaleString();
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString();
}

function formatHour(hour) {
    return hour < 10 ? '0' + hour : hour;
}

function formatEstimatedTime(seconds) {
    if (!seconds || seconds <= 0) return 'Already full';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours';
    return Math.floor(seconds / 86400) + ' days';
}

function formatAction(action, entityType) {
    const actions = {
        CREATE: 'Created',
        UPDATE: 'Updated',
        DELETE: 'Deleted',
        RESERVE: 'Reserved',
        PICKUP: 'Picked up',
        DROP_OFF: 'Dropped off'
    };
    return `${actions[action] || action} ${entityType}`;
}

function formatJsonSummary(json) {
    if (!json) return '-';
    try {
        const obj = typeof json === 'string' ? JSON.parse(json) : json;
        return Object.keys(obj).slice(0, 3).join(', ');
    } catch {
        return '-';
    }
}

function getStatusBadge(status) {
    const badges = {
        ACTIVE: 'badge-success',
        MAINTENANCE: 'badge-warning',
        OFFLINE: 'badge-danger',
        FULL: 'badge-warning'
    };
    return `<span class="badge ${badges[status] || 'badge-info'}">${status}</span>`;
}

function getMaintenanceBadge(status) {
    const badges = {
        OK: 'badge-success',
        DUE_SOON: 'badge-warning',
        OVERDUE: 'badge-danger'
    };
    return `<span class="badge ${badges[status] || 'badge-info'}">${status}</span>`;
}

function getPriorityBadge(priority) {
    const badges = {
        HIGH: 'badge-danger',
        MEDIUM: 'badge-warning',
        LOW: 'badge-success'
    };
    return `<span class="badge ${badges[priority] || 'badge-info'}">${priority}</span>`;
}

function getRecommendationBadge(rec) {
    const badges = {
        INCREASE_CAPACITY: 'badge-warning',
        REDUCE_CAPACITY: 'badge-info',
        OPTIMAL: 'badge-success'
    };
    const text = rec ? rec.replace(/_/g, ' ') : 'OPTIMAL';
    return `<span class="badge ${badges[rec] || 'badge-info'}">${text}</span>`;
}

function getMaintenancePriorityBadge(priority) {
    const badges = {
        OVERDUE: 'badge-danger',
        URGENT: 'badge-warning',
        SCHEDULED: 'badge-info',
        OK: 'badge-success'
    };
    return `<span class="badge ${badges[priority] || 'badge-info'}">${priority}</span>`;
}

function getActionBadge(action) {
    const badges = {
        CREATE: 'badge-success',
        UPDATE: 'badge-info',
        DELETE: 'badge-danger',
        RESERVE: 'badge-warning',
        PICKUP: 'badge-success'
    };
    return `<span class="badge ${badges[action] || 'badge-info'}">${action}</span>`;
}

function getActionIcon(action) {
    const icons = {
        CREATE: '➕',
        UPDATE: '✏️',
        DELETE: '🗑️',
        RESERVE: '🔒',
        PICKUP: '✅',
        DROP_OFF: '📦'
    };
    return icons[action] || '📝';
}

function getProgressClass(percent) {
    if (percent >= 90) return 'danger';
    if (percent >= 75) return 'warning';
    return '';
}

function updateLastUpdated() {
    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    console.error(message);
    // Could add a toast notification here
}
