import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Workouts from './pages/Workouts';
import WorkoutGenerator from './pages/WorkoutGenerator';
import FoodLog from './pages/FoodLog';
import Progress from './pages/Progress';
import Wearables from './pages/Wearables';
import Profile from './pages/Profile';
import { useStore } from './store';
import { loadMockData } from './utils/mockData';

function App() {
  const { setUser, setWorkouts, setFoodLogs, setProgress, setWearableData, calculateDailyStats } = useStore();

  useEffect(() => {
    // Load mock data for demo purposes
    const mockData = loadMockData();
    setUser(mockData.user);
    setWorkouts(mockData.workouts);
    setFoodLogs(mockData.foodLogs);
    setProgress(mockData.progress);
    setWearableData(mockData.wearableData);
    calculateDailyStats();
  }, [setUser, setWorkouts, setFoodLogs, setProgress, setWearableData, calculateDailyStats]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="workouts" element={<Workouts />} />
          <Route path="workout-generator" element={<WorkoutGenerator />} />
          <Route path="food" element={<FoodLog />} />
          <Route path="progress" element={<Progress />} />
          <Route path="wearables" element={<Wearables />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
