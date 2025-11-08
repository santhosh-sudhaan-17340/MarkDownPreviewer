# Smart Expense Manager 💰

A comprehensive expense-tracking application with receipt OCR, auto-categorization, budgeting alerts, gamified savings, multi-currency support, and secure syncing.

## Features

### Core Features
- **Expense Tracking** - Track all your expenses with detailed information
- **Receipt OCR** - Scan receipts using your camera and auto-extract details using Tesseract.js
- **Auto-Categorization** - Automatically categorize expenses based on keywords and merchant names
- **Multi-Currency Support** - Track expenses in 20+ currencies with real-time exchange rates
- **Budgeting System** - Set budgets by category or overall, with customizable alert thresholds
- **Savings Goals** - Create and track savings goals with visual progress indicators
- **Gamification** - Unlock achievements and earn points for financial milestones
- **Responsive UI** - Beautiful, modern interface that works on all devices
- **Secure Authentication** - JWT-based authentication with encrypted passwords

### Dashboard
- Visual spending analytics with pie charts and line graphs
- Budget overview with progress indicators
- Monthly spending summaries
- Category-wise breakdown

### Expense Management
- Add, edit, and delete expenses
- Scan receipts with OCR technology
- Search and filter expenses
- Multiple payment methods
- Tag system for better organization

### Budget Tracking
- Create budgets for specific categories or overall spending
- Daily, weekly, monthly, or yearly budget periods
- Customizable alert thresholds (default 80%)
- Real-time spending vs budget comparison
- Visual indicators (green = good, yellow = warning, red = exceeded)

### Savings Goals
- Create custom savings goals with icons and colors
- Track progress visually
- Set deadlines for goals
- Update progress easily
- Achievement unlocks on goal completion

### Achievements System
- First Step - Add your first expense (10 pts)
- Getting Started - Track 10 expenses (25 pts)
- Tracking Master - Track 100 expenses (100 pts)
- Goal Achieved! - Complete a savings goal (50 pts)
- Week Warrior - Track expenses for 7 days straight (30 pts)
- Budget Master - Stay under budget for a month (75 pts)
- Scanner Pro - Scan 10 receipts (40 pts)

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Better-SQLite3** - Fast, embedded database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **Axios** - HTTP client for exchange rates
- **Crypto-JS** - Encryption for secure syncing

### Frontend
- **React** - UI framework
- **React Router** - Navigation
- **Recharts** - Data visualization
- **Tesseract.js** - OCR for receipt scanning
- **Lucide React** - Beautiful icons
- **Date-fns** - Date formatting

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup Instructions

1. Clone the repository:
```bash
git clone <repository-url>
cd MarkDownPreviewer
```

2. Install server dependencies:
```bash
npm install
```

3. Install client dependencies:
```bash
cd client
npm install
cd ..
```

4. Create environment file:
```bash
cp .env.example .env
```

5. Edit `.env` file with your configuration:
```
PORT=5000
JWT_SECRET=your_secure_jwt_secret_key_here
ENCRYPTION_KEY=your_encryption_key_here
EXCHANGE_RATE_API_KEY=optional_api_key
NODE_ENV=development
```

6. Start the application:

**Development mode (runs both server and client):**
```bash
npm run dev
```

**Or run separately:**

Server only:
```bash
npm run server
```

Client only:
```bash
npm run client
```

7. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/expenses/stats` - Get spending statistics

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Budgets
- `GET /api/budgets` - Get all budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

### Savings Goals
- `GET /api/savings` - Get all savings goals
- `POST /api/savings` - Create savings goal
- `PUT /api/savings/:id` - Update savings goal
- `DELETE /api/savings/:id` - Delete savings goal

### Achievements
- `GET /api/achievements` - Get unlocked achievements
- `GET /api/achievements/available` - Get locked achievements

### Utilities
- `GET /api/currencies` - Get supported currencies
- `POST /api/ocr/upload` - Upload receipt image
- `GET /api/health` - Health check

## Database Schema

The application uses SQLite with the following tables:
- **users** - User accounts
- **categories** - Expense categories
- **expenses** - Expense records
- **budgets** - Budget configurations
- **savings_goals** - Savings goal tracking
- **achievements** - Unlocked achievements
- **exchange_rates** - Currency rate cache
- **sync_metadata** - Sync tracking

## Usage Guide

### Getting Started
1. Register a new account or login
2. Your account comes with default categories
3. Start adding expenses manually or scan receipts

### Adding Expenses
1. Click "Add Expense" or "Scan Receipt"
2. For manual entry: Fill in amount, description, date, etc.
3. For OCR: Take/upload receipt photo, review extracted data
4. Category is auto-detected based on description/merchant
5. Click "Add Expense" to save

### Creating Budgets
1. Navigate to "Budgets" page
2. Click "Create Budget"
3. Select category (or leave empty for overall budget)
4. Set amount, period, and alert threshold
5. Click "Create Budget"

### Setting Savings Goals
1. Navigate to "Savings" page
2. Click "New Goal"
3. Enter goal name and target amount
4. Choose icon and color
5. Optionally set deadline
6. Update progress as you save

### Tracking Progress
- Dashboard shows overall statistics
- Charts visualize spending patterns
- Budget cards show progress with color indicators
- Achievements unlock automatically

## Security Features

- Password hashing with bcrypt (10 rounds)
- JWT token-based authentication
- SQL injection prevention with prepared statements
- File upload validation and size limits
- CORS configuration
- Environment variable protection

## Multi-Currency Support

Supported currencies:
- USD, EUR, GBP, JPY, CNY, INR, CAD, AUD, CHF, SEK
- NZD, MXN, SGD, HKD, NOK, KRW, TRY, RUB, BRL, ZAR

Exchange rates are cached for 24 hours and auto-refresh from free API.

## Deployment

### Production Build

1. Build the client:
```bash
cd client
npm run build
```

2. Set environment to production:
```bash
export NODE_ENV=production
```

3. Start server:
```bash
npm start
```

The server will serve the built React app from the `client/build` directory.

### Environment Variables for Production
```
PORT=5000
JWT_SECRET=very_secure_random_string_min_32_chars
ENCRYPTION_KEY=another_secure_random_string_32_chars
NODE_ENV=production
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues, questions, or feature requests, please open an issue on the GitHub repository.

## Roadmap

Future enhancements:
- [ ] Cloud sync across devices
- [ ] Export to CSV/PDF
- [ ] Recurring expense automation
- [ ] Bill reminders
- [ ] Split expenses with friends
- [ ] Investment tracking
- [ ] Tax category tagging
- [ ] Mobile apps (React Native)
- [ ] Bank account integration
- [ ] Advanced analytics and insights

## Screenshots

The application features:
- Modern gradient design
- Responsive layout for mobile and desktop
- Interactive charts and graphs
- Smooth animations and transitions
- Intuitive navigation
- Color-coded budget indicators
- Visual achievement badges
- Progress bars and statistics

---

Built with ❤️ using React, Node.js, and SQLite
