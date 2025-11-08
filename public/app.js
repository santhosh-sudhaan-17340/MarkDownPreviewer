// ==================== Global Variables ====================
const API_BASE = window.location.origin;
let currentShortCode = null;

// ==================== DOM Elements ====================
const shortenForm = document.getElementById('shorten-form');
const resultDiv = document.getElementById('result');
const shortUrlLink = document.getElementById('short-url');
const originalUrlDisplay = document.getElementById('original-url-display');
const qrCodeImg = document.getElementById('qr-code');
const copyBtn = document.getElementById('copy-btn');
const downloadQrBtn = document.getElementById('download-qr');
const shortenAnotherBtn = document.getElementById('shorten-another');
const viewAnalyticsBtn = document.getElementById('view-analytics-btn');

// Navigation
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

// Dashboard
const refreshDashboardBtn = document.getElementById('refresh-dashboard');
const urlsTableBody = document.getElementById('urls-table-body');
const totalUrlsEl = document.getElementById('total-urls');
const totalClicksEl = document.getElementById('total-clicks');
const avgClicksEl = document.getElementById('avg-clicks');

// Analytics
const analyticsSearchInput = document.getElementById('analytics-search');
const searchAnalyticsBtn = document.getElementById('search-analytics');
const analyticsResults = document.getElementById('analytics-results');

// ==================== View Navigation ====================
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const viewName = btn.dataset.view;

        // Update active nav button
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update active view
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(`${viewName}-view`).classList.add('active');

        // Load data for dashboard
        if (viewName === 'dashboard') {
            loadDashboard();
        }
    });
});

// ==================== URL Shortening ====================
shortenForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const originalUrl = document.getElementById('original-url').value.trim();
    const customCode = document.getElementById('custom-code').value.trim();
    const expiresIn = document.getElementById('expires-in').value;

    // Validate URL
    if (!isValidUrl(originalUrl)) {
        showToast('Please enter a valid URL', 'error');
        return;
    }

    // Show loading state
    const submitBtn = shortenForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Shortening...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/shorten`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: originalUrl,
                customCode: customCode || null,
                expiresIn: expiresIn ? parseInt(expiresIn) : null
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to shorten URL');
        }

        // Display result
        displayResult(data);
        showToast('URL shortened successfully!', 'success');

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});

// ==================== Display Result ====================
async function displayResult(data) {
    currentShortCode = data.shortCode;

    // Update result elements
    shortUrlLink.href = data.shortUrl;
    shortUrlLink.textContent = data.shortUrl;
    originalUrlDisplay.textContent = data.originalUrl;

    // Fetch and display QR code
    try {
        const qrResponse = await fetch(`${API_BASE}/api/qr/${data.shortCode}`);
        const qrData = await qrResponse.json();
        qrCodeImg.src = qrData.qrCode;
    } catch (error) {
        console.error('Error fetching QR code:', error);
    }

    // Show result section
    resultDiv.classList.remove('hidden');

    // Scroll to result
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== Copy to Clipboard ====================
copyBtn.addEventListener('click', async () => {
    const url = shortUrlLink.href;

    try {
        await navigator.clipboard.writeText(url);
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        showToast('Copied to clipboard!', 'success');

        setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    } catch (error) {
        showToast('Failed to copy', 'error');
    }
});

// ==================== Download QR Code ====================
downloadQrBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = qrCodeImg.src;
    link.download = `qr-${currentShortCode}.png`;
    link.click();
    showToast('QR code downloaded!', 'success');
});

// ==================== Shorten Another ====================
shortenAnotherBtn.addEventListener('click', () => {
    shortenForm.reset();
    resultDiv.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ==================== View Analytics ====================
viewAnalyticsBtn.addEventListener('click', () => {
    // Switch to analytics view
    navBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('[data-view="analytics"]').classList.add('active');

    views.forEach(v => v.classList.remove('active'));
    document.getElementById('analytics-view').classList.add('active');

    // Load analytics for current short code
    analyticsSearchInput.value = currentShortCode;
    loadAnalytics(currentShortCode);
});

// ==================== Dashboard ====================
refreshDashboardBtn.addEventListener('click', loadDashboard);

async function loadDashboard() {
    try {
        // Fetch statistics
        const statsResponse = await fetch(`${API_BASE}/api/stats`);
        const statsData = await statsResponse.json();

        if (statsData.success) {
            totalUrlsEl.textContent = statsData.stats.total_urls || 0;
            totalClicksEl.textContent = statsData.stats.total_clicks || 0;
            avgClicksEl.textContent = (statsData.stats.avg_clicks || 0).toFixed(1);
        }

        // Fetch all URLs
        const urlsResponse = await fetch(`${API_BASE}/api/urls`);
        const urlsData = await urlsResponse.json();

        if (urlsData.success) {
            displayUrlsTable(urlsData.urls);
        }

    } catch (error) {
        showToast('Failed to load dashboard', 'error');
        console.error('Error loading dashboard:', error);
    }
}

function displayUrlsTable(urls) {
    if (urls.length === 0) {
        urlsTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-inbox" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                    <p style="color: var(--text-secondary);">No URLs yet. Create your first shortened URL!</p>
                </td>
            </tr>
        `;
        return;
    }

    urlsTableBody.innerHTML = urls.map(url => `
        <tr>
            <td>
                <span class="short-code">${url.short_code}</span>
            </td>
            <td>
                <div class="url-text" title="${escapeHtml(url.original_url)}">
                    ${escapeHtml(url.original_url)}
                </div>
            </td>
            <td>
                <span class="badge">${url.clicks} clicks</span>
            </td>
            <td>${formatDate(url.created_at)}</td>
            <td class="table-actions">
                <button class="btn-icon" onclick="copyUrl('${url.shortUrl}')" title="Copy">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn-icon" onclick="viewUrlAnalytics('${url.short_code}')" title="Analytics">
                    <i class="fas fa-chart-line"></i>
                </button>
                <button class="btn-icon" onclick="deleteUrl(${url.id}, '${url.short_code}')" title="Delete" style="color: var(--danger-color);">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ==================== Analytics ====================
searchAnalyticsBtn.addEventListener('click', () => {
    const shortCode = analyticsSearchInput.value.trim();
    if (shortCode) {
        loadAnalytics(shortCode);
    } else {
        showToast('Please enter a short code', 'error');
    }
});

analyticsSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchAnalyticsBtn.click();
    }
});

async function loadAnalytics(shortCode) {
    try {
        const response = await fetch(`${API_BASE}/api/analytics/${shortCode}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch analytics');
        }

        displayAnalytics(data.analytics);

    } catch (error) {
        showToast(error.message, 'error');
        analyticsResults.classList.add('hidden');
    }
}

function displayAnalytics(analytics) {
    const lastClicked = analytics.last_clicked
        ? formatDate(analytics.last_clicked)
        : 'Never';

    analyticsResults.innerHTML = `
        <div class="analytics-header">
            <h3>Analytics for: <span class="short-code">${analytics.short_code}</span></h3>
            <p><strong>Original URL:</strong> ${escapeHtml(analytics.original_url)}</p>
            <p><strong>Created:</strong> ${formatDate(analytics.created_at)}</p>
            ${analytics.expires_at ? `<p><strong>Expires:</strong> ${formatDate(analytics.expires_at)}</p>` : ''}
        </div>

        <div class="analytics-stats">
            <div class="analytics-stat">
                <h4>${analytics.total_clicks}</h4>
                <p>Total Clicks</p>
            </div>
            <div class="analytics-stat">
                <h4>${lastClicked}</h4>
                <p>Last Clicked</p>
            </div>
            <div class="analytics-stat">
                <h4>${analytics.custom_code ? 'Yes' : 'No'}</h4>
                <p>Custom Code</p>
            </div>
        </div>

        ${analytics.clickHistory && analytics.clickHistory.length > 0 ? `
            <div class="click-history">
                <h4><i class="fas fa-history"></i> Recent Clicks</h4>
                ${analytics.clickHistory.slice(0, 10).map(click => `
                    <div class="click-item">
                        <div>
                            <i class="fas fa-clock"></i> ${formatDate(click.clicked_at)}
                        </div>
                        <div>
                            <i class="fas fa-external-link-alt"></i> ${escapeHtml(click.referrer)}
                        </div>
                        <div>
                            <i class="fas fa-laptop"></i> ${escapeHtml(click.user_agent).substring(0, 50)}...
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : '<p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">No clicks yet</p>'}
    `;

    analyticsResults.classList.remove('hidden');
}

// ==================== Utility Functions ====================
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== Global Functions for onclick handlers ====================
window.copyUrl = async function(url) {
    try {
        await navigator.clipboard.writeText(url);
        showToast('URL copied to clipboard!', 'success');
    } catch (error) {
        showToast('Failed to copy URL', 'error');
    }
};

window.viewUrlAnalytics = function(shortCode) {
    // Switch to analytics view
    navBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('[data-view="analytics"]').classList.add('active');

    views.forEach(v => v.classList.remove('active'));
    document.getElementById('analytics-view').classList.add('active');

    // Load analytics
    analyticsSearchInput.value = shortCode;
    loadAnalytics(shortCode);
};

window.deleteUrl = async function(id, shortCode) {
    if (!confirm(`Are you sure you want to delete the short URL: ${shortCode}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/urls/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete URL');
        }

        showToast('URL deleted successfully', 'success');
        loadDashboard();

    } catch (error) {
        showToast(error.message, 'error');
    }
};

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
    // Load dashboard if it's the active view
    const activeView = document.querySelector('.view.active');
    if (activeView && activeView.id === 'dashboard-view') {
        loadDashboard();
    }
});
