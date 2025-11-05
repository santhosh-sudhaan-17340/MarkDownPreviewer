# Sourastra Matrimony

A comprehensive matrimony web application specifically designed for the Sourastra community. This platform helps community members find their perfect life partner with features like profile matching, interest requests, favorites, and more.

## Features

### User Features
- **User Registration & Authentication**: Secure JWT-based authentication system
- **Detailed Profile Creation**: Comprehensive profiles with community-specific fields like Gotra, Kuldevta, etc.
- **Advanced Search & Filters**: Search profiles by age, height, education, occupation, location, and more
- **Smart Recommendations**: AI-powered matching based on partner preferences
- **Interest Management**: Send, receive, accept, or reject interest requests
- **Favorites/Shortlist**: Save profiles for later review
- **Photo Upload**: Upload multiple photos with profile photo designation
- **Privacy Controls**: Control visibility of contact details and photos
- **Profile Views Tracking**: See how many people viewed your profile

### Sourastra Community Specific Features
- **Gotra Management**: Track and filter by Gotra
- **Kuldevta Information**: Store and display family deity information
- **Native Place**: Record ancestral place information
- **Manglik Status**: Include astrological compatibility information
- **Birth Details**: Store birth time, place, rashi, and nakshatra

### Admin Features
- **User Management**: View, verify, activate/deactivate users
- **Platform Statistics**: Track total users, interests, and engagement
- **Profile Verification**: Verify authentic profiles
- **User Moderation**: Delete or suspend user accounts

## Tech Stack

### Backend
- **Node.js** with **Express.js** - REST API server
- **MongoDB** with **Mongoose** - Database and ODM
- **JWT** - Secure authentication
- **Bcrypt.js** - Password hashing
- **Multer** - File upload handling
- **Express Validator** - Input validation
- **Helmet** - Security headers
- **Express Rate Limit** - API rate limiting

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Zustand** - State management
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **React Icons** - Icon library
- **React Hook Form** - Form handling

## Project Structure

```
sourastra-matrimony/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js               # Authentication middleware
│   │   └── upload.js             # File upload middleware
│   ├── models/
│   │   ├── User.js               # User/Profile model
│   │   ├── Interest.js           # Interest request model
│   │   └── Favorite.js           # Favorite model
│   ├── routes/
│   │   ├── auth.js               # Authentication routes
│   │   ├── profiles.js           # Profile routes
│   │   ├── interests.js          # Interest routes
│   │   ├── favorites.js          # Favorite routes
│   │   └── admin.js              # Admin routes
│   ├── uploads/                  # Uploaded files directory
│   ├── .env.example              # Environment variables template
│   ├── server.js                 # Express server entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx        # Navigation component
│   │   │   └── ProfileCard.jsx   # Profile card component
│   │   ├── pages/
│   │   │   ├── Home.jsx          # Landing page
│   │   │   ├── Login.jsx         # Login page
│   │   │   ├── Register.jsx      # Registration page
│   │   │   ├── Dashboard.jsx     # User dashboard
│   │   │   ├── Search.jsx        # Search profiles
│   │   │   ├── Profile.jsx       # View profile
│   │   │   ├── MyProfile.jsx     # Edit own profile
│   │   │   ├── Interests.jsx     # Manage interests
│   │   │   ├── Favorites.jsx     # View favorites
│   │   │   └── AdminDashboard.jsx # Admin panel
│   │   ├── store/
│   │   │   └── authStore.js      # Zustand auth store
│   │   ├── utils/
│   │   │   └── api.js            # API client and endpoints
│   │   ├── App.jsx               # Main app component
│   │   ├── main.jsx              # Entry point
│   │   └── index.css             # Global styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── package.json                  # Root package.json for scripts
└── README.md                     # This file
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd sourastra-matrimony
```

### Step 2: Install Dependencies
```bash
# Install all dependencies (root, backend, and frontend)
npm run install-all

# Or install individually:
npm install           # Root dependencies
cd backend && npm install
cd ../frontend && npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sourastra-matrimony
JWT_SECRET=your-very-secure-secret-key-change-this
JWT_EXPIRE=7d
NODE_ENV=development
UPLOAD_PATH=./uploads
```

### Step 4: Start MongoDB

Make sure MongoDB is running on your system:

```bash
# On macOS (using Homebrew)
brew services start mongodb-community

# On Linux (systemd)
sudo systemctl start mongod

# On Windows
# Start MongoDB from Services or run mongod.exe
```

### Step 5: Run the Application

#### Development Mode (Both Frontend and Backend)
```bash
# From root directory
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend dev server on http://localhost:3000

#### Run Separately

**Backend Only:**
```bash
cd backend
npm run dev
```

**Frontend Only:**
```bash
cd frontend
npm run dev
```

### Step 6: Create Admin User (Optional)

To create an admin user, you can either:

1. Register a normal user and manually update the database:
```javascript
// In MongoDB shell or Compass
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

2. Or register through the app and update via code

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### Profiles
- `GET /api/profiles/search` - Search profiles with filters
- `GET /api/profiles/recommendations` - Get recommended profiles
- `GET /api/profiles/:id` - Get profile by ID
- `PUT /api/profiles/me` - Update own profile
- `POST /api/profiles/upload-photo` - Upload profile photo
- `DELETE /api/profiles/photo` - Delete profile photo

### Interests
- `POST /api/interests/send` - Send interest request
- `GET /api/interests/sent` - Get sent interests
- `GET /api/interests/received` - Get received interests
- `GET /api/interests/accepted` - Get accepted interests
- `PUT /api/interests/:id/accept` - Accept interest
- `PUT /api/interests/:id/reject` - Reject interest
- `DELETE /api/interests/:id` - Cancel sent interest

### Favorites
- `POST /api/favorites` - Add to favorites
- `GET /api/favorites` - Get all favorites
- `PUT /api/favorites/:id` - Update favorite notes
- `DELETE /api/favorites/:id` - Remove from favorites

### Admin
- `GET /api/admin/users` - Get all users (paginated)
- `PUT /api/admin/users/:id/verify` - Verify user profile
- `PUT /api/admin/users/:id/activate` - Activate/deactivate user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/stats` - Get platform statistics

## User Profile Fields

The User model includes comprehensive fields for matrimony matching:

### Basic Information
- Profile For (Self, Son, Daughter, etc.)
- Name, Gender, Date of Birth
- Marital Status, Height, Weight
- Complexion, Blood Group

### Contact Information
- Email, Phone, Alternate Phone
- Address (Street, City, State, Country, Pincode)

### Sourastra Community Specific
- **Gotra** (Required)
- Kuldevta
- Native Place
- Manglik Status

### Birth Details
- Birth Time, Birth Place
- Rashi, Nakshatra

### Education & Career
- Education, Education Details
- Occupation, Occupation Details
- Annual Income

### Family Details
- Father Name, Father Occupation
- Mother Name, Mother Occupation
- Brothers (Total & Married)
- Sisters (Total & Married)
- Family Type (Joint/Nuclear)
- Family Values (Traditional/Moderate/Liberal)
- Family Income

### Lifestyle
- Diet (Vegetarian/Non-Vegetarian/Eggetarian)
- Smoking, Drinking
- Hobbies

### Partner Preferences
- Age Range, Height Range
- Marital Status Preferences
- Education, Occupation
- Location Preferences
- Gotra Preferences
- Description

## Building for Production

### Build Frontend
```bash
cd frontend
npm run build
```

This creates an optimized production build in `frontend/dist`.

### Run Production Server
```bash
# Set NODE_ENV to production in backend/.env
NODE_ENV=production

# Start backend server
cd backend
npm start
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- HTTP security headers with Helmet
- Rate limiting on API endpoints
- Input validation with express-validator
- Privacy controls for sensitive information
- File upload restrictions (images only, size limits)

## Future Enhancements

- Real-time messaging between matched users
- Email notifications for interests
- Advanced horoscope matching
- Payment gateway for premium features
- Mobile app (React Native)
- Video call integration
- Multi-language support
- Success stories section
- Blog/Articles section

## Support

For issues, questions, or contributions, please contact the development team or create an issue in the repository.

## License

MIT License - feel free to use this project for your community.

---

**Developed with ❤️ for the Sourastra Community**
