import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// In-memory data storage (for demo purposes)
let workouts: any[] = [];
let foodLogs: any[] = [];
let progress: any[] = [];
let wearableData: any[] = [];
let users: any[] = [];

// ===== Workout Routes =====

app.post('/api/workouts/generate', async (req: Request, res: Response) => {
  try {
    const { fitnessLevel, goal, duration, equipment, preferences } = req.body;

    // In production, this would call OpenAI API to generate personalized workouts
    // For demo, return a mock workout
    const mockWorkout = {
      id: Date.now().toString(),
      userId: 'demo',
      date: new Date().toISOString().split('T')[0],
      type: goal.toLowerCase().includes('cardio') ? 'cardio' : 'strength',
      duration,
      caloriesBurned: Math.round(duration * 8),
      exercises: generateMockExercises(goal, fitnessLevel, equipment),
      completed: false,
      aiGenerated: true
    };

    res.json(mockWorkout);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate workout' });
  }
});

app.get('/api/workouts/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const userWorkouts = workouts.filter(w => w.userId === userId);
  res.json(userWorkouts);
});

app.post('/api/workouts', (req: Request, res: Response) => {
  const workout = req.body;
  workouts.push(workout);
  res.json({ success: true, workout });
});

app.put('/api/workouts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = workouts.findIndex(w => w.id === id);
  if (index !== -1) {
    workouts[index] = { ...workouts[index], ...req.body };
    res.json({ success: true, workout: workouts[index] });
  } else {
    res.status(404).json({ error: 'Workout not found' });
  }
});

app.delete('/api/workouts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  workouts = workouts.filter(w => w.id !== id);
  res.json({ success: true });
});

// ===== Food Routes =====

app.get('/api/food/search', (req: Request, res: Response) => {
  const { q } = req.query;

  // Mock food database search
  const mockResults = [
    {
      id: Date.now().toString(),
      name: q || 'Unknown Food',
      calories: Math.floor(Math.random() * 300) + 50,
      protein: Math.floor(Math.random() * 30),
      carbs: Math.floor(Math.random() * 50),
      fat: Math.floor(Math.random() * 20),
      serving: '100g',
      quantity: 1
    }
  ];

  res.json(mockResults);
});

app.get('/api/food/barcode/:barcode', (req: Request, res: Response) => {
  const { barcode } = req.params;

  // Mock barcode lookup
  const mockFood = {
    id: Date.now().toString(),
    name: 'Scanned Product',
    calories: 200,
    protein: 10,
    carbs: 30,
    fat: 5,
    serving: '1 serving',
    quantity: 1,
    barcode
  };

  res.json(mockFood);
});

app.post('/api/food/recognize', async (req: Request, res: Response) => {
  try {
    const { image } = req.body;

    // In production, this would use ML/AI to recognize food from image
    // For demo, return mock recognized foods
    const mockFoods = [
      {
        id: Date.now().toString(),
        name: 'Grilled Chicken',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        serving: '100g',
        quantity: 1,
        imageRecognized: true
      },
      {
        id: (Date.now() + 1).toString(),
        name: 'Brown Rice',
        calories: 112,
        protein: 2.3,
        carbs: 24,
        fat: 0.9,
        serving: '100g',
        quantity: 1,
        imageRecognized: true
      }
    ];

    res.json(mockFoods);
  } catch (error) {
    res.status(500).json({ error: 'Failed to recognize food' });
  }
});

app.get('/api/food/logs/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const userLogs = foodLogs.filter(f => f.userId === userId);
  res.json(userLogs);
});

app.post('/api/food/logs', (req: Request, res: Response) => {
  const log = req.body;
  foodLogs.push(log);
  res.json({ success: true, log });
});

// ===== Progress Routes =====

app.get('/api/progress/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const userProgress = progress.filter(p => p.userId === userId);
  res.json(userProgress);
});

app.post('/api/progress', (req: Request, res: Response) => {
  const progressEntry = req.body;
  progress.push(progressEntry);
  res.json({ success: true, progress: progressEntry });
});

// ===== Wearable Routes =====

app.post('/api/wearable/sync', async (req: Request, res: Response) => {
  try {
    const { userId, device } = req.body;

    // Mock wearable sync - in production, this would connect to device APIs
    const mockData = {
      id: Date.now().toString(),
      userId,
      date: new Date().toISOString().split('T')[0],
      steps: Math.floor(Math.random() * 5000) + 5000,
      heartRate: Array.from({ length: 24 }, () => Math.floor(Math.random() * 40) + 60),
      sleepHours: Math.random() * 3 + 6,
      activeMinutes: Math.floor(Math.random() * 60) + 30,
      caloriesBurned: Math.floor(Math.random() * 500) + 300,
      distance: parseFloat((Math.random() * 5 + 3).toFixed(1)),
      source: device
    };

    wearableData.push(mockData);
    res.json({ success: true, data: mockData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync wearable' });
  }
});

app.get('/api/wearable/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const userData = wearableData.filter(w => w.userId === userId);
  res.json(userData);
});

// ===== User Routes =====

app.get('/api/users/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = users.find(u => u.id === userId);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

app.post('/api/users', (req: Request, res: Response) => {
  const user = req.body;
  users.push(user);
  res.json({ success: true, user });
});

app.put('/api/users/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const index = users.findIndex(u => u.id === userId);
  if (index !== -1) {
    users[index] = { ...users[index], ...req.body };
    res.json({ success: true, user: users[index] });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// ===== Helper Functions =====

function generateMockExercises(goal: string, level: string, equipment: string[]) {
  const exercises = [];
  const hasWeights = equipment.some(e => ['Dumbbells', 'Barbell', 'Kettlebell'].includes(e));

  if (goal.toLowerCase().includes('strength') || goal.toLowerCase().includes('muscle')) {
    exercises.push(
      {
        id: '1',
        name: hasWeights ? 'Barbell Squats' : 'Bodyweight Squats',
        sets: level === 'beginner' ? 3 : 4,
        reps: level === 'beginner' ? 10 : 12,
        category: 'strength',
        muscleGroup: 'legs'
      },
      {
        id: '2',
        name: hasWeights ? 'Dumbbell Bench Press' : 'Push-ups',
        sets: level === 'beginner' ? 3 : 4,
        reps: level === 'beginner' ? 8 : 12,
        category: 'strength',
        muscleGroup: 'chest'
      },
      {
        id: '3',
        name: 'Pull-ups',
        sets: 3,
        reps: level === 'beginner' ? 5 : 10,
        category: 'strength',
        muscleGroup: 'back'
      }
    );
  } else if (goal.toLowerCase().includes('cardio')) {
    exercises.push(
      {
        id: '1',
        name: 'Running',
        duration: 600,
        category: 'cardio'
      },
      {
        id: '2',
        name: 'Burpees',
        sets: 3,
        reps: 15,
        category: 'cardio'
      }
    );
  } else {
    exercises.push(
      {
        id: '1',
        name: 'Push-ups',
        sets: 3,
        reps: 15,
        category: 'strength',
        muscleGroup: 'chest'
      },
      {
        id: '2',
        name: 'Squats',
        sets: 3,
        reps: 20,
        category: 'strength',
        muscleGroup: 'legs'
      }
    );
  }

  return exercises;
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Fitness Coach API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});
