const axios = require('axios');
const { db } = require('../database/db');

// Currency conversion
async function convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
        return amount;
    }

    try {
        // Check cache first (within last 24 hours)
        const cached = db.prepare(`
            SELECT rate FROM exchange_rates
            WHERE base_currency = ? AND target_currency = ?
            AND datetime(updated_at) > datetime('now', '-24 hours')
        `).get(fromCurrency, toCurrency);

        let rate;
        if (cached) {
            rate = cached.rate;
        } else {
            // Fetch from API (using a free service)
            const response = await axios.get(
                `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
            );

            rate = response.data.rates[toCurrency];

            // Cache the rate
            db.prepare(`
                INSERT OR REPLACE INTO exchange_rates (base_currency, target_currency, rate, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `).run(fromCurrency, toCurrency, rate);
        }

        return amount * rate;
    } catch (error) {
        console.error('Currency conversion error:', error);
        // Return original amount if conversion fails
        return amount;
    }
}

// Get supported currencies
function getSupportedCurrencies() {
    return [
        { code: 'USD', symbol: '$', name: 'US Dollar' },
        { code: 'EUR', symbol: '€', name: 'Euro' },
        { code: 'GBP', symbol: '£', name: 'British Pound' },
        { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
        { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
        { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
        { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
        { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
        { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
        { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
        { code: 'NZD', symbol: '$', name: 'New Zealand Dollar' },
        { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
        { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
        { code: 'HKD', symbol: '$', name: 'Hong Kong Dollar' },
        { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
        { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
        { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
        { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
        { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
        { code: 'ZAR', symbol: 'R', name: 'South African Rand' }
    ];
}

// Encryption helpers for secure syncing
const CryptoJS = require('crypto-js');

function encryptData(data, key) {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
}

function decryptData(encryptedData, key) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, key);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

module.exports = {
    convertCurrency,
    getSupportedCurrencies,
    encryptData,
    decryptData
};
