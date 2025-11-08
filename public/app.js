const API_BASE = 'http://localhost:3000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (authToken && currentUser) {
        showDashboard('payment');
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        document.getElementById('user-name').textContent = currentUser.full_name;
    }
});

// Tab Management
function showTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
}

function showDashboard(section) {
    document.querySelectorAll('.dashboard-tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.dashboard-content').forEach(content => {
        content.style.display = 'none';
    });

    document.getElementById(`${section}-dashboard`).style.display = 'block';

    if (section === 'transactions') {
        loadTransactions();
    } else if (section === 'disputes') {
        loadDisputes();
    }
}

// Authentication
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            showMessage('Login successful!', 'success');
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('dashboard-section').style.display = 'block';
            document.getElementById('user-name').textContent = currentUser.full_name;
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const fullName = document.getElementById('reg-fullname').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;
    const pin = document.getElementById('reg-pin').value;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, phone, password, pin })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Registration successful! Please login.', 'success');
            showTab('login');
        } else {
            showMessage(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');

    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('dashboard-section').style.display = 'none';
    showMessage('Logged out successfully', 'success');
}

// Payment
async function handlePayment(event) {
    event.preventDefault();

    const senderAccountId = document.getElementById('payment-sender').value;
    const receiverAccountId = document.getElementById('payment-receiver').value;
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const description = document.getElementById('payment-desc').value;
    const pin = document.getElementById('payment-pin').value;

    try {
        const response = await fetch(`${API_BASE}/payments/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                senderAccountId,
                receiverAccountId,
                amount,
                description,
                pin
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Payment processed successfully!', 'success');
            event.target.reset();
        } else {
            showMessage(data.error || 'Payment failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// QR Code
async function generateQR(event) {
    event.preventDefault();

    const accountId = document.getElementById('qr-account').value;
    const amount = document.getElementById('qr-amount').value;
    const description = document.getElementById('qr-desc').value;
    const expiresInMinutes = document.getElementById('qr-expires').value;

    const payload = { accountId };
    if (amount) payload.amount = parseFloat(amount);
    if (description) payload.description = description;
    if (expiresInMinutes) payload.expiresInMinutes = parseInt(expiresInMinutes);

    try {
        const response = await fetch(`${API_BASE}/qr/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('qr-display').innerHTML = `
                <img src="${data.qrImage}" alt="QR Code">
                <p style="margin-top: 10px; font-size: 0.9rem;">QR Code ID: ${data.qrCode.id}</p>
                <textarea readonly style="width: 100%; margin-top: 10px; font-size: 0.8rem;">${data.qrCode.qr_data}</textarea>
            `;
            showMessage('QR code generated successfully!', 'success');
        } else {
            showMessage(data.error || 'QR generation failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function payViaQR(event) {
    event.preventDefault();

    const qrDataString = document.getElementById('qr-data').value;
    const senderAccountId = document.getElementById('qr-pay-sender').value;
    const amount = document.getElementById('qr-pay-amount').value;
    const pin = document.getElementById('qr-pay-pin').value;

    const payload = {
        qrDataString,
        senderAccountId,
        pin
    };
    if (amount) payload.amount = parseFloat(amount);

    try {
        const response = await fetch(`${API_BASE}/qr/pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('QR payment successful!', 'success');
            event.target.reset();
        } else {
            showMessage(data.error || 'QR payment failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Transactions
async function loadTransactions() {
    try {
        const response = await fetch(`${API_BASE}/payments/transactions`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            const list = document.getElementById('transactions-list');

            if (data.transactions.length === 0) {
                list.innerHTML = '<p>No transactions found.</p>';
                return;
            }

            list.innerHTML = data.transactions.map(tx => `
                <div class="transaction-item">
                    <h5>Transaction ${tx.transaction_ref}</h5>
                    <p><strong>Amount:</strong> ${tx.currency} ${tx.amount}</p>
                    <p><strong>Type:</strong> ${tx.transaction_type}</p>
                    <p><strong>Status:</strong> <span class="status status-${tx.status.toLowerCase()}">${tx.status}</span></p>
                    <p><strong>Date:</strong> ${new Date(tx.created_at).toLocaleString()}</p>
                    ${tx.description ? `<p><strong>Description:</strong> ${tx.description}</p>` : ''}
                </div>
            `).join('');
        } else {
            showMessage(data.error || 'Failed to load transactions', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Disputes
async function createDispute(event) {
    event.preventDefault();

    const transactionId = document.getElementById('dispute-txn').value;
    const disputeType = document.getElementById('dispute-type').value;
    const description = document.getElementById('dispute-desc').value;

    try {
        const response = await fetch(`${API_BASE}/disputes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                transactionId,
                disputeType,
                description
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Dispute created successfully!', 'success');
            event.target.reset();
            loadDisputes();
        } else {
            showMessage(data.error || 'Dispute creation failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function loadDisputes() {
    try {
        const response = await fetch(`${API_BASE}/disputes`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            const list = document.getElementById('disputes-list');

            if (data.disputes.length === 0) {
                list.innerHTML = '<p>No disputes found.</p>';
                return;
            }

            list.innerHTML = data.disputes.map(dispute => `
                <div class="dispute-item">
                    <h5>Dispute #${dispute.id.substring(0, 8)}</h5>
                    <p><strong>Transaction:</strong> ${dispute.transaction_ref}</p>
                    <p><strong>Type:</strong> ${dispute.dispute_type}</p>
                    <p><strong>Status:</strong> <span class="status status-${dispute.status.toLowerCase()}">${dispute.status}</span></p>
                    <p><strong>Description:</strong> ${dispute.description}</p>
                    <p><strong>Created:</strong> ${new Date(dispute.created_at).toLocaleString()}</p>
                </div>
            `).join('');
        } else {
            showMessage(data.error || 'Failed to load disputes', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Utility
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';

    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}
