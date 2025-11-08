/**
 * Generate secure pickup codes for locker access
 */

const crypto = require('crypto');

/**
 * Generate a random pickup code
 * @param {number} length - Length of the code (default: 6)
 * @param {boolean} alphanumeric - Include letters (default: false, numbers only)
 * @returns {string} Generated code
 */
function generatePickupCode(length = 6, alphanumeric = false) {
  const codeLength = parseInt(process.env.PICKUP_CODE_LENGTH) || length;

  if (alphanumeric) {
    // Alphanumeric code (excludes ambiguous characters: 0, O, I, l, 1)
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    const randomBytes = crypto.randomBytes(codeLength);

    for (let i = 0; i < codeLength; i++) {
      code += chars[randomBytes[i] % chars.length];
    }

    return code;
  } else {
    // Numeric code only
    const min = Math.pow(10, codeLength - 1);
    const max = Math.pow(10, codeLength) - 1;
    const randomNumber = crypto.randomInt(min, max + 1);

    return String(randomNumber).padStart(codeLength, '0');
  }
}

/**
 * Validate pickup code format
 * @param {string} code - Code to validate
 * @param {number} expectedLength - Expected length
 * @returns {boolean} True if valid format
 */
function validatePickupCodeFormat(code, expectedLength = 6) {
  if (!code || typeof code !== 'string') {
    return false;
  }

  const codeLength = parseInt(process.env.PICKUP_CODE_LENGTH) || expectedLength;

  // Check length
  if (code.length !== codeLength) {
    return false;
  }

  // Check if numeric (for default numeric codes)
  return /^\d+$/.test(code);
}

/**
 * Generate a tracking number
 * @returns {string} Tracking number
 */
function generateTrackingNumber() {
  const prefix = 'PKG';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();

  return `${prefix}${timestamp}${random}`;
}

/**
 * Generate a secure admin token
 * @returns {string} Admin token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = {
  generatePickupCode,
  validatePickupCodeFormat,
  generateTrackingNumber,
  generateSecureToken
};
