import { Outlet, NavLink } from 'react-router-dom';
import { Home, Dumbbell, Utensils, TrendingUp, Watch, User, Zap } from 'lucide-react';
import './Layout.css';

const Layout = () => {
  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="logo">
          <Zap size={32} />
          <h1>FitCoach</h1>
        </div>

        <ul className="nav-links">
          <li>
            <NavLink to="/" end>
              <Home size={20} />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/workouts">
              <Dumbbell size={20} />
              <span>Workouts</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/workout-generator">
              <Zap size={20} />
              <span>AI Workout</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/food">
              <Utensils size={20} />
              <span>Food Log</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/progress">
              <TrendingUp size={20} />
              <span>Progress</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/wearables">
              <Watch size={20} />
              <span>Wearables</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile">
              <User size={20} />
              <span>Profile</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
