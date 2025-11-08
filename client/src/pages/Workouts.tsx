import { useStore } from '../store';
import { format } from 'date-fns';
import { CheckCircle, Circle, Clock, Flame } from 'lucide-react';
import './Workouts.css';

const Workouts = () => {
  const { workouts, updateWorkout } = useStore();

  const sortedWorkouts = [...workouts].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const toggleWorkoutComplete = (id: string, completed: boolean) => {
    updateWorkout(id, { completed: !completed });
  };

  return (
    <div className="workouts-page">
      <div className="page-header">
        <h1>My Workouts</h1>
        <p>Track and manage your workout routines</p>
      </div>

      <div className="workouts-list">
        {sortedWorkouts.length > 0 ? (
          sortedWorkouts.map(workout => (
            <div key={workout.id} className={`workout-card ${workout.completed ? 'completed' : ''}`}>
              <div className="workout-header-section">
                <div className="workout-title">
                  <h3>{workout.type.charAt(0).toUpperCase() + workout.type.slice(1)} Workout</h3>
                  {workout.aiGenerated && <span className="ai-badge">AI Generated</span>}
                </div>
                <button
                  onClick={() => toggleWorkoutComplete(workout.id, workout.completed)}
                  className="complete-btn"
                >
                  {workout.completed ? <CheckCircle size={24} /> : <Circle size={24} />}
                </button>
              </div>

              <div className="workout-meta">
                <span className="workout-date">{format(new Date(workout.date), 'MMM dd, yyyy')}</span>
                <div className="workout-stats">
                  <span className="stat">
                    <Clock size={16} />
                    {workout.duration} min
                  </span>
                  <span className="stat">
                    <Flame size={16} />
                    {workout.caloriesBurned} cal
                  </span>
                </div>
              </div>

              <div className="exercises-section">
                <h4>Exercises ({workout.exercises.length})</h4>
                <div className="exercises-grid">
                  {workout.exercises.map((exercise, idx) => (
                    <div key={exercise.id} className="exercise-item">
                      <span className="exercise-num">{idx + 1}</span>
                      <div className="exercise-info">
                        <span className="exercise-name">{exercise.name}</span>
                        <span className="exercise-details">
                          {exercise.sets && exercise.reps && `${exercise.sets} × ${exercise.reps}`}
                          {exercise.duration && `${Math.floor(exercise.duration / 60)}:${String(exercise.duration % 60).padStart(2, '0')}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-workouts">
            <p>No workouts yet. Generate one using the AI Workout Generator!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workouts;
