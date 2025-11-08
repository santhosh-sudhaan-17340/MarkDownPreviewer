import { create } from 'zustand';
import { User, Workout, FoodLog, Progress, WearableData, DailyStats } from './types';

interface AppState {
  user: User | null;
  workouts: Workout[];
  foodLogs: FoodLog[];
  progress: Progress[];
  wearableData: WearableData[];
  dailyStats: DailyStats[];

  // Actions
  setUser: (user: User | null) => void;
  addWorkout: (workout: Workout) => void;
  updateWorkout: (id: string, workout: Partial<Workout>) => void;
  deleteWorkout: (id: string) => void;
  addFoodLog: (foodLog: FoodLog) => void;
  updateFoodLog: (id: string, foodLog: Partial<FoodLog>) => void;
  deleteFoodLog: (id: string) => void;
  addProgress: (progress: Progress) => void;
  addWearableData: (data: WearableData) => void;
  setWorkouts: (workouts: Workout[]) => void;
  setFoodLogs: (foodLogs: FoodLog[]) => void;
  setProgress: (progress: Progress[]) => void;
  setWearableData: (data: WearableData[]) => void;
  calculateDailyStats: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  workouts: [],
  foodLogs: [],
  progress: [],
  wearableData: [],
  dailyStats: [],

  setUser: (user) => set({ user }),

  addWorkout: (workout) => set((state) => ({
    workouts: [...state.workouts, workout]
  })),

  updateWorkout: (id, workout) => set((state) => ({
    workouts: state.workouts.map(w => w.id === id ? { ...w, ...workout } : w)
  })),

  deleteWorkout: (id) => set((state) => ({
    workouts: state.workouts.filter(w => w.id !== id)
  })),

  addFoodLog: (foodLog) => set((state) => ({
    foodLogs: [...state.foodLogs, foodLog]
  })),

  updateFoodLog: (id, foodLog) => set((state) => ({
    foodLogs: state.foodLogs.map(f => f.id === id ? { ...f, ...foodLog } : f)
  })),

  deleteFoodLog: (id) => set((state) => ({
    foodLogs: state.foodLogs.filter(f => f.id !== id)
  })),

  addProgress: (progress) => set((state) => ({
    progress: [...state.progress, progress]
  })),

  addWearableData: (data) => set((state) => ({
    wearableData: [...state.wearableData, data]
  })),

  setWorkouts: (workouts) => set({ workouts }),
  setFoodLogs: (foodLogs) => set({ foodLogs }),
  setProgress: (progress) => set({ progress }),
  setWearableData: (data) => set({ wearableData: data }),

  calculateDailyStats: () => {
    const { foodLogs, workouts, wearableData } = get();
    const statsMap = new Map<string, DailyStats>();

    // Process food logs
    foodLogs.forEach(log => {
      const existing = statsMap.get(log.date) || {
        date: log.date,
        caloriesConsumed: 0,
        caloriesBurned: 0,
        proteinConsumed: 0,
        carbsConsumed: 0,
        fatConsumed: 0,
        workoutsCompleted: 0,
        steps: 0,
        waterIntake: 0,
      };

      existing.caloriesConsumed += log.totalCalories;
      existing.proteinConsumed += log.totalProtein;
      existing.carbsConsumed += log.totalCarbs;
      existing.fatConsumed += log.totalFat;

      statsMap.set(log.date, existing);
    });

    // Process workouts
    workouts.forEach(workout => {
      const existing = statsMap.get(workout.date) || {
        date: workout.date,
        caloriesConsumed: 0,
        caloriesBurned: 0,
        proteinConsumed: 0,
        carbsConsumed: 0,
        fatConsumed: 0,
        workoutsCompleted: 0,
        steps: 0,
        waterIntake: 0,
      };

      if (workout.completed) {
        existing.caloriesBurned += workout.caloriesBurned;
        existing.workoutsCompleted += 1;
      }

      statsMap.set(workout.date, existing);
    });

    // Process wearable data
    wearableData.forEach(data => {
      const existing = statsMap.get(data.date) || {
        date: data.date,
        caloriesConsumed: 0,
        caloriesBurned: 0,
        proteinConsumed: 0,
        carbsConsumed: 0,
        fatConsumed: 0,
        workoutsCompleted: 0,
        steps: 0,
        waterIntake: 0,
      };

      existing.steps = Math.max(existing.steps, data.steps);
      existing.caloriesBurned += data.caloriesBurned;

      statsMap.set(data.date, existing);
    });

    set({ dailyStats: Array.from(statsMap.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )});
  }
}));
