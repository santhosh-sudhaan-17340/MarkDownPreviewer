import axios from 'axios';
import { WorkoutGenerationRequest, Workout, FoodItem } from './types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const workoutAPI = {
  generateWorkout: async (request: WorkoutGenerationRequest): Promise<Workout> => {
    const response = await api.post('/workouts/generate', request);
    return response.data;
  },

  getWorkouts: async (userId: string) => {
    const response = await api.get(`/workouts/${userId}`);
    return response.data;
  },

  saveWorkout: async (workout: Workout) => {
    const response = await api.post('/workouts', workout);
    return response.data;
  },

  updateWorkout: async (id: string, workout: Partial<Workout>) => {
    const response = await api.put(`/workouts/${id}`, workout);
    return response.data;
  },

  deleteWorkout: async (id: string) => {
    const response = await api.delete(`/workouts/${id}`);
    return response.data;
  }
};

export const foodAPI = {
  searchFood: async (query: string): Promise<FoodItem[]> => {
    const response = await api.get(`/food/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  scanBarcode: async (barcode: string): Promise<FoodItem | null> => {
    const response = await api.get(`/food/barcode/${barcode}`);
    return response.data;
  },

  recognizeFood: async (imageBase64: string): Promise<FoodItem[]> => {
    const response = await api.post('/food/recognize', { image: imageBase64 });
    return response.data;
  },

  getFoodLogs: async (userId: string) => {
    const response = await api.get(`/food/logs/${userId}`);
    return response.data;
  },

  saveFoodLog: async (foodLog: any) => {
    const response = await api.post('/food/logs', foodLog);
    return response.data;
  }
};

export const progressAPI = {
  getProgress: async (userId: string) => {
    const response = await api.get(`/progress/${userId}`);
    return response.data;
  },

  saveProgress: async (progress: any) => {
    const response = await api.post('/progress', progress);
    return response.data;
  }
};

export const wearableAPI = {
  syncWearable: async (userId: string, device: string) => {
    const response = await api.post('/wearable/sync', { userId, device });
    return response.data;
  },

  getWearableData: async (userId: string) => {
    const response = await api.get(`/wearable/${userId}`);
    return response.data;
  }
};

export const userAPI = {
  getUser: async (userId: string) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  createUser: async (user: any) => {
    const response = await api.post('/users', user);
    return response.data;
  },

  updateUser: async (userId: string, user: any) => {
    const response = await api.put(`/users/${userId}`, user);
    return response.data;
  }
};
