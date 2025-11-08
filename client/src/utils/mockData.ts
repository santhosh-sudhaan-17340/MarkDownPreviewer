import { User, Workout, FoodLog, Progress, WearableData } from '../types';

export const loadMockData = () => {
  const today = new Date();
  const getDateString = (daysAgo: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  const user: User = {
    id: 'demo-user',
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    age: 28,
    height: 175,
    weight: 75,
    gender: 'male',
    fitnessGoal: 'gain_muscle',
    activityLevel: 'active'
  };

  const workouts: Workout[] = [
    {
      id: '1',
      userId: user.id,
      date: getDateString(0),
      type: 'strength',
      duration: 45,
      caloriesBurned: 350,
      completed: true,
      aiGenerated: true,
      exercises: [
        { id: 'e1', name: 'Bench Press', sets: 4, reps: 10, category: 'strength', muscleGroup: 'chest' },
        { id: 'e2', name: 'Squats', sets: 4, reps: 12, category: 'strength', muscleGroup: 'legs' },
        { id: 'e3', name: 'Pull-ups', sets: 3, reps: 8, category: 'strength', muscleGroup: 'back' },
        { id: 'e4', name: 'Overhead Press', sets: 3, reps: 10, category: 'strength', muscleGroup: 'shoulders' }
      ]
    },
    {
      id: '2',
      userId: user.id,
      date: getDateString(1),
      type: 'cardio',
      duration: 30,
      caloriesBurned: 280,
      completed: true,
      aiGenerated: false,
      exercises: [
        { id: 'e5', name: 'Running', duration: 1200, category: 'cardio' },
        { id: 'e6', name: 'Jump Rope', duration: 600, category: 'cardio' }
      ]
    },
    {
      id: '3',
      userId: user.id,
      date: getDateString(3),
      type: 'strength',
      duration: 50,
      caloriesBurned: 400,
      completed: true,
      aiGenerated: true,
      exercises: [
        { id: 'e7', name: 'Deadlifts', sets: 4, reps: 8, category: 'strength', muscleGroup: 'back' },
        { id: 'e8', name: 'Lunges', sets: 3, reps: 12, category: 'strength', muscleGroup: 'legs' },
        { id: 'e9', name: 'Dumbbell Rows', sets: 4, reps: 10, category: 'strength', muscleGroup: 'back' }
      ]
    },
    {
      id: '4',
      userId: user.id,
      date: getDateString(5),
      type: 'mixed',
      duration: 60,
      caloriesBurned: 450,
      completed: true,
      aiGenerated: true,
      exercises: [
        { id: 'e10', name: 'Push-ups', sets: 3, reps: 20, category: 'strength', muscleGroup: 'chest' },
        { id: 'e11', name: 'Cycling', duration: 1800, category: 'cardio' },
        { id: 'e12', name: 'Plank', duration: 180, category: 'strength', muscleGroup: 'core' }
      ]
    }
  ];

  const foodLogs: FoodLog[] = [
    {
      id: 'f1',
      userId: user.id,
      date: getDateString(0),
      mealType: 'breakfast',
      totalCalories: 450,
      totalProtein: 25,
      totalCarbs: 55,
      totalFat: 12,
      foodItems: [
        { id: 'fi1', name: 'Oatmeal', calories: 150, protein: 5, carbs: 27, fat: 3, serving: '1 cup', quantity: 1 },
        { id: 'fi2', name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0.4, serving: '1 medium', quantity: 1 },
        { id: 'fi3', name: 'Greek Yogurt', calories: 100, protein: 17, carbs: 6, fat: 0.4, serving: '150g', quantity: 1 },
        { id: 'fi4', name: 'Almonds', calories: 95, protein: 2, carbs: 3, fat: 8, serving: '15g', quantity: 1 }
      ]
    },
    {
      id: 'f2',
      userId: user.id,
      date: getDateString(0),
      mealType: 'lunch',
      totalCalories: 620,
      totalProtein: 48,
      totalCarbs: 65,
      totalFat: 18,
      foodItems: [
        { id: 'fi5', name: 'Grilled Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving: '100g', quantity: 2, imageRecognized: true },
        { id: 'fi6', name: 'Brown Rice', calories: 112, protein: 2.3, carbs: 24, fat: 0.9, serving: '100g', quantity: 1.5 },
        { id: 'fi7', name: 'Mixed Vegetables', calories: 65, protein: 3, carbs: 13, fat: 0.5, serving: '150g', quantity: 1 }
      ]
    },
    {
      id: 'f3',
      userId: user.id,
      date: getDateString(0),
      mealType: 'dinner',
      totalCalories: 580,
      totalProtein: 42,
      totalCarbs: 58,
      totalFat: 16,
      foodItems: [
        { id: 'fi8', name: 'Salmon Fillet', calories: 280, protein: 25, carbs: 0, fat: 12, serving: '150g', quantity: 1 },
        { id: 'fi9', name: 'Sweet Potato', calories: 180, protein: 4, carbs: 42, fat: 0.3, serving: '200g', quantity: 1 },
        { id: 'fi10', name: 'Broccoli', calories: 55, protein: 4, carbs: 11, fat: 0.6, serving: '150g', quantity: 1 },
        { id: 'fi11', name: 'Olive Oil', calories: 119, protein: 0, carbs: 0, fat: 14, serving: '1 tbsp', quantity: 1 }
      ]
    },
    {
      id: 'f4',
      userId: user.id,
      date: getDateString(0),
      mealType: 'snack',
      totalCalories: 200,
      totalProtein: 20,
      totalCarbs: 24,
      totalFat: 7,
      foodItems: [
        { id: 'fi12', name: 'Protein Bar', calories: 200, protein: 20, carbs: 24, fat: 7, serving: '1 bar', quantity: 1, barcode: '123456789' }
      ]
    },
    {
      id: 'f5',
      userId: user.id,
      date: getDateString(1),
      mealType: 'breakfast',
      totalCalories: 380,
      totalProtein: 22,
      totalCarbs: 48,
      totalFat: 10,
      foodItems: [
        { id: 'fi13', name: 'Scrambled Eggs', calories: 180, protein: 13, carbs: 2, fat: 12, serving: '2 eggs', quantity: 1 },
        { id: 'fi14', name: 'Whole Wheat Toast', calories: 140, protein: 6, carbs: 26, fat: 2, serving: '2 slices', quantity: 1 },
        { id: 'fi15', name: 'Avocado', calories: 120, protein: 1.5, carbs: 6, fat: 11, serving: '1/2 medium', quantity: 1 }
      ]
    }
  ];

  const progress: Progress[] = [];
  for (let i = 30; i >= 0; i--) {
    progress.push({
      id: `p${i}`,
      userId: user.id,
      date: getDateString(i),
      weight: 75 + (Math.random() - 0.5) * 2,
      bodyFat: 18 + (Math.random() - 0.5) * 1,
      muscleMass: 32 + (Math.random() - 0.5) * 0.5,
      measurements: {
        chest: 100,
        waist: 82,
        hips: 95,
        arms: 35,
        thighs: 58
      }
    });
  }

  const wearableData: WearableData[] = [];
  for (let i = 14; i >= 0; i--) {
    const baseSteps = 8000;
    const steps = baseSteps + Math.floor(Math.random() * 4000);
    wearableData.push({
      id: `w${i}`,
      userId: user.id,
      date: getDateString(i),
      steps: steps,
      heartRate: Array.from({ length: 24 }, () => Math.floor(Math.random() * 40) + 60),
      sleepHours: 7 + Math.random() * 1.5,
      activeMinutes: 45 + Math.floor(Math.random() * 45),
      caloriesBurned: Math.floor(steps * 0.04) + Math.floor(Math.random() * 200),
      distance: parseFloat((steps / 1300).toFixed(1)),
      source: ['fitbit', 'apple_watch', 'garmin'][Math.floor(Math.random() * 3)] as any
    });
  }

  return {
    user,
    workouts,
    foodLogs,
    progress,
    wearableData
  };
};
