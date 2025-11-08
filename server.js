const express = require('express');
const cors = require('cors');
const path = require('path');
const validUrl = require('valid-url');
const { customAlphabet } = require('nanoid');
const QRCode = require('qrcode');
const { statements } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Generate short codes (alphanumeric, 6 characters)
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 6);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== API ENDPOINTS ====================

// 1. CREATE SHORT URL
app.post('/api/shorten', (req, res) => {
  try {
    const { url, customCode, expiresIn } = req.body;

    // Validate URL
    if (!url || !validUrl.isUri(url)) {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }

    // Check URL length
    if (url.length > 2048) {
      return res.status(400).json({ error: 'URL is too long (max 2048 characters)' });
    }

    let shortCode;
    let isCustom = false;

    // Handle custom code
    if (customCode) {
      // Validate custom code
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(customCode)) {
        return res.status(400).json({
          error: 'Custom code must be 3-20 characters (letters, numbers, hyphens, underscores only)'
        });
      }

      // Check if custom code is available
      const exists = statements.codeExists.get(customCode);
      if (exists.count > 0) {
        return res.status(409).json({ error: 'Custom code already taken' });
      }

      shortCode = customCode;
      isCustom = true;
    } else {
      // Generate unique short code
      let attempts = 0;
      do {
        shortCode = nanoid();
        attempts++;
        if (attempts > 10) {
          return res.status(500).json({ error: 'Failed to generate unique code' });
        }
      } while (statements.codeExists.get(shortCode).count > 0);
    }

    // Calculate expiration
    let expiresAt = null;
    if (expiresIn && expiresIn > 0) {
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + expiresIn);
      expiresAt = expireDate.toISOString();
    }

    // Insert into database
    const result = statements.insertUrl.run(url, shortCode, isCustom ? 1 : 0, expiresAt);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const shortUrl = `${baseUrl}/${shortCode}`;

    res.json({
      success: true,
      originalUrl: url,
      shortCode,
      shortUrl,
      qrCode: `${baseUrl}/api/qr/${shortCode}`,
      expiresAt,
      id: result.lastInsertRowid
    });

  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. GET ALL URLs
app.get('/api/urls', (req, res) => {
  try {
    const urls = statements.getAllUrls.all();
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const urlsWithShortUrl = urls.map(url => ({
      ...url,
      shortUrl: `${baseUrl}/${url.short_code}`,
      qrCode: `${baseUrl}/api/qr/${url.short_code}`
    }));

    res.json({ success: true, urls: urlsWithShortUrl });
  } catch (error) {
    console.error('Error fetching URLs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. GET URL ANALYTICS
app.get('/api/analytics/:shortCode', (req, res) => {
  try {
    const { shortCode } = req.params;

    const analytics = statements.getUrlAnalytics.get(shortCode);
    if (!analytics) {
      return res.status(404).json({ error: 'URL not found' });
    }

    const clickHistory = statements.getClickHistory.all(analytics.id);

    res.json({
      success: true,
      analytics: {
        ...analytics,
        clickHistory
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. GET GLOBAL STATISTICS
app.get('/api/stats', (req, res) => {
  try {
    const stats = statements.getStats.get();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. DELETE URL
app.delete('/api/urls/:id', (req, res) => {
  try {
    const { id } = req.params;

    const url = statements.getUrlById.get(id);
    if (!url) {
      return res.status(404).json({ error: 'URL not found' });
    }

    statements.deleteUrl.run(id);
    res.json({ success: true, message: 'URL deleted successfully' });
  } catch (error) {
    console.error('Error deleting URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. GENERATE QR CODE
app.get('/api/qr/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const shortUrl = `${baseUrl}/${shortCode}`;

    // Check if URL exists
    const url = statements.getUrlByCode.get(shortCode);
    if (!url) {
      return res.status(404).json({ error: 'URL not found' });
    }

    // Generate QR code
    const qrCodeImage = await QRCode.toDataURL(shortUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({ success: true, qrCode: qrCodeImage });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== URL REDIRECTION ====================

// Redirect short URL to original URL
app.get('/:shortCode', (req, res) => {
  try {
    const { shortCode } = req.params;

    // Skip API routes and static files
    if (shortCode.startsWith('api') || shortCode.includes('.')) {
      return res.status(404).send('Not found');
    }

    const url = statements.getUrlByCode.get(shortCode);

    if (!url) {
      return res.status(404).send('URL not found');
    }

    // Check expiration
    if (url.expires_at) {
      const expirationDate = new Date(url.expires_at);
      if (expirationDate < new Date()) {
        return res.status(410).send('This link has expired');
      }
    }

    // Record click analytics
    const userAgent = req.get('user-agent') || 'Unknown';
    const referrer = req.get('referrer') || 'Direct';
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';

    statements.incrementClicks.run(url.id);
    statements.recordClick.run(url.id, userAgent, referrer, ip);

    // Redirect to original URL
    res.redirect(url.original_url);
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).send('Internal server error');
  }
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║        🔗  URL Shortener Server Running! 🚀          ║
  ║                                                       ║
  ║        Server:  http://localhost:${PORT}                ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
  console.log('  Features:');
  console.log('  ✓ URL Shortening with custom codes');
  console.log('  ✓ Click Analytics & Tracking');
  console.log('  ✓ QR Code Generation');
  console.log('  ✓ Link Management (View/Delete)');
  console.log('  ✓ Link Expiration');
  console.log('  ✓ Detailed Statistics\n');
});

module.exports = app;
