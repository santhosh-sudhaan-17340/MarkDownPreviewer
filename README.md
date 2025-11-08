# 🔗 URL Shortener

A comprehensive, feature-rich URL shortener application built with Node.js, Express, and SQLite. Shorten your long URLs into concise, shareable links with powerful analytics and customization options.

![URL Shortener](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-v14+-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

## ✨ Features

### Core Functionality
- **🚀 Instant URL Shortening** - Convert long URLs into short, memorable links in seconds
- **🎨 Custom Short Codes** - Create personalized short URLs with your own custom codes
- **📊 Detailed Analytics** - Track clicks, referrers, user agents, and timestamps
- **📱 QR Code Generation** - Automatically generate QR codes for every shortened URL
- **⏰ Link Expiration** - Set expiration dates for temporary links (1, 7, 30, or 90 days)
- **🔍 URL Validation** - Robust validation to ensure only valid URLs are shortened
- **📈 Dashboard** - Comprehensive dashboard to manage all your shortened URLs
- **🗑️ Link Management** - View, copy, and delete shortened URLs
- **📉 Global Statistics** - Track total URLs, clicks, and average performance

### Technical Features
- **💾 SQLite Database** - Lightweight, serverless database for data persistence
- **⚡ RESTful API** - Well-structured API endpoints for all operations
- **🎯 Click Tracking** - Detailed analytics for each URL click
- **🔒 Safe & Secure** - URL sanitization and validation
- **📱 Responsive Design** - Beautiful UI that works on all devices
- **🌈 Modern UI** - Gradient backgrounds, smooth animations, and intuitive interface

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd url-shortener
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   ```
   Navigate to: http://localhost:3000
   ```

That's it! Your URL shortener is now running! 🎉

## 📖 Usage Guide

### Shortening a URL

1. Navigate to the homepage
2. Enter your long URL in the input field
3. (Optional) Add a custom short code
4. (Optional) Set an expiration date
5. Click "Shorten URL"
6. Copy your shortened URL or download the QR code

### Dashboard

View all your shortened URLs with:
- Short code
- Original URL
- Click count
- Creation date
- Quick actions (copy, view analytics, delete)

### Analytics

Get detailed insights for any shortened URL:
- Total clicks
- Last clicked timestamp
- Recent click history with referrer and user agent data

## 🎯 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. Create Short URL
```http
POST /api/shorten
Content-Type: application/json

{
  "url": "https://example.com/very/long/url",
  "customCode": "my-link",  // Optional
  "expiresIn": 7            // Optional, days until expiration
}
```

**Response:**
```json
{
  "success": true,
  "originalUrl": "https://example.com/very/long/url",
  "shortCode": "my-link",
  "shortUrl": "http://localhost:3000/my-link",
  "qrCode": "http://localhost:3000/api/qr/my-link",
  "expiresAt": "2024-01-15T10:30:00.000Z",
  "id": 1
}
```

#### 2. Get All URLs
```http
GET /api/urls
```

**Response:**
```json
{
  "success": true,
  "urls": [
    {
      "id": 1,
      "original_url": "https://example.com",
      "short_code": "abc123",
      "clicks": 42,
      "created_at": "2024-01-08T10:30:00.000Z",
      "shortUrl": "http://localhost:3000/abc123"
    }
  ]
}
```

#### 3. Get Analytics
```http
GET /api/analytics/:shortCode
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "id": 1,
    "original_url": "https://example.com",
    "short_code": "abc123",
    "clicks": 42,
    "total_clicks": 42,
    "last_clicked": "2024-01-08T15:30:00.000Z",
    "clickHistory": [
      {
        "id": 1,
        "clicked_at": "2024-01-08T15:30:00.000Z",
        "user_agent": "Mozilla/5.0...",
        "referrer": "Direct",
        "ip_address": "127.0.0.1"
      }
    ]
  }
}
```

#### 4. Get Statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_urls": 10,
    "total_clicks": 420,
    "avg_clicks": 42.0
  }
}
```

#### 5. Delete URL
```http
DELETE /api/urls/:id
```

**Response:**
```json
{
  "success": true,
  "message": "URL deleted successfully"
}
```

#### 6. Get QR Code
```http
GET /api/qr/:shortCode
```

**Response:**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,..."
}
```

### URL Redirection

Access any shortened URL directly:
```
GET /:shortCode
```
This will redirect to the original URL and track the click.

## 🗄️ Database Schema

### URLs Table
```sql
CREATE TABLE urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_url TEXT NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  custom_code BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  clicks INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1
);
```

### Clicks Table
```sql
CREATE TABLE clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url_id INTEGER NOT NULL,
  clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  referrer TEXT,
  ip_address TEXT,
  FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE
);
```

## 🏗️ Project Structure

```
url-shortener/
├── server.js           # Main server file with Express routes
├── database.js         # Database initialization and queries
├── package.json        # Dependencies and scripts
├── public/            # Frontend files
│   ├── index.html     # Main HTML file
│   ├── style.css      # Styles and animations
│   └── app.js         # Frontend JavaScript
└── README.md          # This file
```

## 🛠️ Technologies Used

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **better-sqlite3** - SQLite database driver
- **nanoid** - Unique ID generator for short codes
- **qrcode** - QR code generation
- **valid-url** - URL validation
- **cors** - Cross-Origin Resource Sharing

### Frontend
- **HTML5** - Markup
- **CSS3** - Styling with modern features (Grid, Flexbox, Animations)
- **Vanilla JavaScript** - Frontend logic (no frameworks!)
- **Font Awesome** - Icons

## 🎨 Customization

### Change Port
Edit the PORT in `server.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

### Short Code Length
Modify the nanoid alphabet and length in `server.js`:
```javascript
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 6);
```

### Custom Colors
Update CSS variables in `public/style.css`:
```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  /* ... */
}
```

## 📊 Performance

- **Database**: SQLite with indexed queries for fast lookups
- **Prepared Statements**: All queries use prepared statements for better performance
- **Caching**: Browser caching enabled for static files
- **Responsive**: Optimized for both desktop and mobile devices

## 🔒 Security Features

- ✅ URL validation before shortening
- ✅ SQL injection protection (prepared statements)
- ✅ XSS protection (HTML escaping)
- ✅ Custom code validation (alphanumeric only)
- ✅ URL length limits (max 2048 characters)
- ✅ CORS enabled for API access

## 🐛 Troubleshooting

### Port Already in Use
If port 3000 is already in use, change the PORT in `server.js` or set an environment variable:
```bash
PORT=8080 npm start
```

### Database Errors
Delete the `urls.db` file and restart the server to recreate the database:
```bash
rm urls.db
npm start
```

### Missing Dependencies
Reinstall all dependencies:
```bash
rm -rf node_modules
npm install
```

## 📝 License

This project is licensed under the MIT License - feel free to use it for personal or commercial projects!

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 🌟 Features Roadmap

Future enhancements planned:
- [ ] User authentication and accounts
- [ ] Bulk URL shortening
- [ ] API rate limiting
- [ ] Link editing
- [ ] Custom domains
- [ ] Advanced analytics with charts
- [ ] Export data to CSV
- [ ] Password-protected links
- [ ] Link previews

## 📞 Support

If you encounter any issues or have questions, please:
1. Check the troubleshooting section
2. Review the API documentation
3. Open an issue on GitHub

---

**Made with ❤️ using Node.js and modern web technologies**

Happy URL shortening! 🚀
