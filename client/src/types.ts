export interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  height: number; // cm
  weight: number; // kg
  gender: 'male' | 'female' | 'other';
  fitnessGoal: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_endurance';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export interface Workout {
  id: string;
  userId: string;
  date: string;
  type: 'strength' | 'cardio' | 'flexibility' | 'mixed';
  duration: number; // minutes
  caloriesBurned: number;
  exercises: Exercise[];
  completed: boolean;
  aiGenerated: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  duration?: number; // seconds
  weight?: number; // kg
  category: 'strength' | 'cardio' | 'flexibility';
  muscleGroup?: string;
}

export interface FoodLog {
  id: string;
  userId: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodItems: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  serving: string;
  quantity: number;
  barcode?: string;
  imageRecognized?: boolean;
}

export interface Progress {
  id: string;
  userId: string;
  date: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    arms?: number;
    thighs?: number;
  };
}

export interface WearableData {
  id: string;
  userId: string;
  date: string;
  steps: number;
  heartRate: number[];
  sleepHours: number;
  activeMinutes: number;
  caloriesBurned: number;
  distance: number; // km
  source: 'fitbit' | 'apple_watch' | 'garmin' | 'samsung' | 'manual';
}

export interface DailyStats {
  date: string;
  caloriesConsumed: number;
  caloriesBurned: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatConsumed: number;
  workoutsCompleted: number;
  steps: number;
  waterIntake: number; // ml
}

export interface WorkoutGenerationRequest {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goal: string;
  duration: number;
  equipment: string[];
  preferences?: string;
}
