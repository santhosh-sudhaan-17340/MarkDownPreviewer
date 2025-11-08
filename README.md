# FitCoach - AI Fitness & Diet Coaching App

A comprehensive fitness and diet coaching application powered by AI, featuring workout generation, food logging with barcode/ML recognition, progress analytics, and wearable device integration.

## Features

### 1. AI-Based Workout Generation
- Generate personalized workout plans based on fitness level, goals, and available equipment
- Customize workout duration, intensity, and preferences
- AI-powered exercise selection and programming
- Save and track generated workouts

### 2. Food Logging with Advanced Recognition
- **Barcode Scanning**: Quickly log food by scanning product barcodes
- **ML Food Recognition**: Identify foods from images using machine learning
- **Manual Search**: Search from a comprehensive food database
- Track calories, protein, carbs, and fats
- Organize meals by type (breakfast, lunch, dinner, snacks)

### 3. Progress Analytics Dashboard
- Interactive charts and visualizations
- Track weight, body fat, and muscle mass over time
- Monitor body measurements (chest, waist, hips, arms, thighs)
- View trends and progress statistics
- Calculate BMI and BMR automatically

### 4. Wearable Device Integration
- Sync data from popular fitness trackers:
  - Fitbit
  - Apple Watch
  - Garmin
  - Samsung Galaxy Watch
- Track steps, heart rate, sleep, and active minutes
- Visualize daily activity and health metrics
- Automatic calorie burn calculations

### 5. User Profile & Settings
- Manage personal information
- Set fitness goals (lose weight, gain muscle, maintain, improve endurance)
- Configure activity levels
- Calculate daily calorie and protein targets
- Track BMI and metabolic rate

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **Zustand** for state management
- **Recharts** for data visualization
- **Lucide React** for icons
- **date-fns** for date formatting

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **CORS** for cross-origin requests
- RESTful API architecture

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utility functions and mock data
│   │   ├── api.ts         # API service layer
│   │   ├── store.ts       # Zustand state management
│   │   ├── types.ts       # TypeScript type definitions
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── server/                # Backend Express API
│   ├── src/
│   │   └── server.ts      # Main server file
│   ├── tsconfig.json
│   └── package.json
├── package.json           # Root package.json
└── README.md
```

## Installation

### Prerequisites
- Node.js 16+ and npm

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MarkDownPreviewer
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start both the backend (port 5000) and frontend (port 3000) servers concurrently.

### Alternative: Start Individually

**Backend:**
```bash
cd server
npm install
npm run dev
```

**Frontend:**
```bash
cd client
npm install
npm run dev
```

## API Endpoints

### Workouts
- `POST /api/workouts/generate` - Generate AI workout
- `GET /api/workouts/:userId` - Get user workouts
- `POST /api/workouts` - Save workout
- `PUT /api/workouts/:id` - Update workout
- `DELETE /api/workouts/:id` - Delete workout

### Food
- `GET /api/food/search?q=query` - Search food database
- `GET /api/food/barcode/:barcode` - Scan barcode
- `POST /api/food/recognize` - Recognize food from image
- `GET /api/food/logs/:userId` - Get food logs
- `POST /api/food/logs` - Save food log

### Progress
- `GET /api/progress/:userId` - Get progress entries
- `POST /api/progress` - Save progress entry

### Wearable
- `POST /api/wearable/sync` - Sync wearable device
- `GET /api/wearable/:userId` - Get wearable data

### Users
- `GET /api/users/:userId` - Get user profile
- `POST /api/users` - Create user
- `PUT /api/users/:userId` - Update user

## Features in Detail

### Dashboard
- Overview of daily stats (calories, workouts, steps, protein)
- Weight progress chart
- Calorie consumption vs. burn chart
- Recent workouts list

### AI Workout Generator
- Select fitness level (beginner, intermediate, advanced)
- Set workout duration (15-90 minutes)
- Choose available equipment
- Add custom preferences
- Generate personalized workout plan

### Food Logging
- Three ways to add food:
  1. Scan barcode (simulated)
  2. Upload food image for ML recognition (simulated)
  3. Manual search
- View daily nutrition breakdown
- Organize by meal type
- Track macronutrients

### Progress Tracking
- Log weight, body fat, muscle mass
- Record body measurements
- View historical data in tables
- Interactive charts for trends
- Calculate weight changes

### Wearable Integration
- Sync from multiple device types
- View today's activity summary
- 7-day step trends
- 24-hour heart rate monitoring
- Sleep and active minutes tracking

## Demo Data

The application comes pre-loaded with mock data for demonstration purposes:
- Sample user profile
- 4 workout entries
- Multiple food logs across different meals
- 30 days of progress data
- 14 days of wearable data

## Building for Production

```bash
npm run build
```

This will build both the client and server for production deployment.

## Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=5000
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key_here
```

## Future Enhancements

- Real AI integration with OpenAI for workout generation
- Actual ML food recognition using TensorFlow.js or similar
- Real barcode scanning using device camera
- Database integration (MongoDB/PostgreSQL)
- User authentication and authorization
- Social features (share progress, challenges)
- Mobile app (React Native)
- Push notifications
- Meal planning and recipes
- Water intake tracking
- Integration with more wearable devices

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Built with ❤️ using React, TypeScript, and Node.js
