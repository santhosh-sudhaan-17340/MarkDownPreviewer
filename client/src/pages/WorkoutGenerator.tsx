import { useState } from 'react';
import { useStore } from '../store';
import { workoutAPI } from '../api';
import { Workout, Exercise } from '../types';
import { Zap, Clock, Target, Dumbbell } from 'lucide-react';
import './WorkoutGenerator.css';

const WorkoutGenerator = () => {
  const { user, addWorkout } = useStore();
  const [loading, setLoading] = useState(false);
  const [generatedWorkout, setGeneratedWorkout] = useState<Workout | null>(null);

  const [formData, setFormData] = useState({
    fitnessLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    goal: '',
    duration: 30,
    equipment: [] as string[],
    preferences: ''
  });

  const equipmentOptions = [
    'None (Bodyweight)',
    'Dumbbells',
    'Barbell',
    'Resistance Bands',
    'Pull-up Bar',
    'Bench',
    'Kettlebell',
    'Medicine Ball'
  ];

  const handleEquipmentToggle = (equipment: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(equipment)
        ? prev.equipment.filter(e => e !== equipment)
        : [...prev.equipment, equipment]
    }));
  };

  const generateWorkout = async () => {
    setLoading(true);
    try {
      // Simulate AI workout generation
      const mockWorkout: Workout = {
        id: Date.now().toString(),
        userId: user?.id || 'demo',
        date: new Date().toISOString().split('T')[0],
        type: formData.goal.toLowerCase().includes('cardio') ? 'cardio' : 'strength',
        duration: formData.duration,
        caloriesBurned: Math.round(formData.duration * 8),
        exercises: generateExercises(formData),
        completed: false,
        aiGenerated: true
      };

      // In production, this would call the API
      // const workout = await workoutAPI.generateWorkout(formData);

      setTimeout(() => {
        setGeneratedWorkout(mockWorkout);
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error generating workout:', error);
      setLoading(false);
    }
  };

  const generateExercises = (data: typeof formData): Exercise[] => {
    const exercises: Exercise[] = [];
    const hasWeights = data.equipment.some(e =>
      ['Dumbbells', 'Barbell', 'Kettlebell'].includes(e)
    );

    if (data.goal.toLowerCase().includes('strength') || data.goal.toLowerCase().includes('muscle')) {
      exercises.push(
        {
          id: '1',
          name: hasWeights ? 'Barbell Squats' : 'Bodyweight Squats',
          sets: data.fitnessLevel === 'beginner' ? 3 : 4,
          reps: data.fitnessLevel === 'beginner' ? 10 : 12,
          category: 'strength',
          muscleGroup: 'legs'
        },
        {
          id: '2',
          name: hasWeights ? 'Dumbbell Bench Press' : 'Push-ups',
          sets: data.fitnessLevel === 'beginner' ? 3 : 4,
          reps: data.fitnessLevel === 'beginner' ? 8 : 12,
          category: 'strength',
          muscleGroup: 'chest'
        },
        {
          id: '3',
          name: 'Pull-ups',
          sets: 3,
          reps: data.fitnessLevel === 'beginner' ? 5 : 10,
          category: 'strength',
          muscleGroup: 'back'
        },
        {
          id: '4',
          name: hasWeights ? 'Dumbbell Shoulder Press' : 'Pike Push-ups',
          sets: 3,
          reps: 10,
          category: 'strength',
          muscleGroup: 'shoulders'
        }
      );
    } else if (data.goal.toLowerCase().includes('cardio')) {
      exercises.push(
        {
          id: '1',
          name: 'Running',
          duration: 600,
          category: 'cardio'
        },
        {
          id: '2',
          name: 'Jump Rope',
          duration: 300,
          category: 'cardio'
        },
        {
          id: '3',
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
        },
        {
          id: '3',
          name: 'Plank',
          duration: 60,
          category: 'strength',
          muscleGroup: 'core'
        }
      );
    }

    return exercises;
  };

  const saveWorkout = () => {
    if (generatedWorkout) {
      addWorkout(generatedWorkout);
      alert('Workout saved successfully!');
      setGeneratedWorkout(null);
    }
  };

  return (
    <div className="workout-generator">
      <div className="page-header">
        <h1><Zap size={32} /> AI Workout Generator</h1>
        <p>Get a personalized workout plan powered by AI</p>
      </div>

      <div className="generator-container">
        <div className="generator-form">
          <h2>Tell us about your workout</h2>

          <div className="form-group">
            <label>Fitness Level</label>
            <div className="radio-group">
              {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                <label key={level} className="radio-label">
                  <input
                    type="radio"
                    name="fitnessLevel"
                    value={level}
                    checked={formData.fitnessLevel === level}
                    onChange={(e) => setFormData({ ...formData, fitnessLevel: e.target.value as any })}
                  />
                  <span>{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>What's your goal?</label>
            <input
              type="text"
              placeholder="e.g., Build muscle, Lose weight, Improve endurance"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label>Workout Duration (minutes)</label>
            <input
              type="range"
              min="15"
              max="90"
              step="15"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              className="range-input"
            />
            <span className="range-value">{formData.duration} minutes</span>
          </div>

          <div className="form-group">
            <label>Available Equipment</label>
            <div className="equipment-grid">
              {equipmentOptions.map(equipment => (
                <button
                  key={equipment}
                  type="button"
                  className={`equipment-btn ${formData.equipment.includes(equipment) ? 'active' : ''}`}
                  onClick={() => handleEquipmentToggle(equipment)}
                >
                  {equipment}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Additional Preferences (optional)</label>
            <textarea
              placeholder="e.g., Focus on upper body, avoid jumping exercises"
              value={formData.preferences}
              onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
              className="textarea-input"
              rows={3}
            />
          </div>

          <button
            onClick={generateWorkout}
            disabled={loading || !formData.goal}
            className="generate-btn"
          >
            {loading ? 'Generating...' : 'Generate Workout'}
          </button>
        </div>

        {generatedWorkout && (
          <div className="generated-workout">
            <h2>Your AI-Generated Workout</h2>

            <div className="workout-overview">
              <div className="overview-item">
                <Clock size={20} />
                <span>{generatedWorkout.duration} min</span>
              </div>
              <div className="overview-item">
                <Target size={20} />
                <span>{generatedWorkout.caloriesBurned} cal</span>
              </div>
              <div className="overview-item">
                <Dumbbell size={20} />
                <span>{generatedWorkout.exercises.length} exercises</span>
              </div>
            </div>

            <div className="exercises-list">
              {generatedWorkout.exercises.map((exercise, index) => (
                <div key={exercise.id} className="exercise-card">
                  <div className="exercise-number">{index + 1}</div>
                  <div className="exercise-details">
                    <h3>{exercise.name}</h3>
                    <p>
                      {exercise.sets && exercise.reps && `${exercise.sets} sets × ${exercise.reps} reps`}
                      {exercise.duration && `${Math.floor(exercise.duration / 60)} min ${exercise.duration % 60} sec`}
                      {exercise.muscleGroup && ` • ${exercise.muscleGroup}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={saveWorkout} className="save-btn">
              Save Workout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutGenerator;
