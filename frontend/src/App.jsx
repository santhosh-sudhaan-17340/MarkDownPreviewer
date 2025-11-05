import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import Profile from './pages/Profile';
import MyProfile from './pages/MyProfile';
import Interests from './pages/Interests';
import Favorites from './pages/Favorites';
import AdminDashboard from './pages/AdminDashboard';

function PrivateRoute({ children }) {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { token, user } = useAuthStore();
  return token && user?.role === 'admin' ? children : <Navigate to="/dashboard" />;
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />

          <Route path="/search" element={
            <PrivateRoute>
              <Search />
            </PrivateRoute>
          } />

          <Route path="/profile/:id" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />

          <Route path="/my-profile" element={
            <PrivateRoute>
              <MyProfile />
            </PrivateRoute>
          } />

          <Route path="/interests" element={
            <PrivateRoute>
              <Interests />
            </PrivateRoute>
          } />

          <Route path="/favorites" element={
            <PrivateRoute>
              <Favorites />
            </PrivateRoute>
          } />

          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
