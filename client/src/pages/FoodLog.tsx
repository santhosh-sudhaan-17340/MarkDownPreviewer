import { useState, useRef } from 'react';
import { useStore } from '../store';
import { FoodLog as FoodLogType, FoodItem } from '../types';
import { format } from 'date-fns';
import { Plus, Camera, Barcode, Search, Trash2 } from 'lucide-react';
import './FoodLog.css';

const FoodLog = () => {
  const { user, foodLogs, addFoodLog, deleteFoodLog } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [recognizingFood, setRecognizingFood] = useState(false);
  const [selectedFoods, setSelectedFoods] = useState<FoodItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayLogs = foodLogs.filter(log => log.date === selectedDate);

  const totalNutrition = todayLogs.reduce((acc, log) => ({
    calories: acc.calories + log.totalCalories,
    protein: acc.protein + log.totalProtein,
    carbs: acc.carbs + log.totalCarbs,
    fat: acc.fat + log.totalFat
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const handleBarcodeScanner = () => {
    setScanningBarcode(true);
    // Simulate barcode scanning
    setTimeout(() => {
      const mockFood: FoodItem = {
        id: Date.now().toString(),
        name: 'Protein Bar',
        calories: 200,
        protein: 20,
        carbs: 24,
        fat: 7,
        serving: '1 bar',
        quantity: 1,
        barcode: '123456789'
      };
      setSelectedFoods([...selectedFoods, mockFood]);
      setScanningBarcode(false);
      alert('Barcode scanned successfully!');
    }, 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRecognizingFood(true);
      // Simulate ML food recognition
      setTimeout(() => {
        const mockFoods: FoodItem[] = [
          {
            id: Date.now().toString(),
            name: 'Grilled Chicken Breast',
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
        setSelectedFoods([...selectedFoods, ...mockFoods]);
        setRecognizingFood(false);
        alert('Food recognized from image!');
      }, 2000);
    }
  };

  const searchFoodDatabase = () => {
    // Simulate food database search
    const mockResults: FoodItem[] = [
      {
        id: Date.now().toString(),
        name: searchQuery || 'Apple',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        serving: '1 medium',
        quantity: 1
      }
    ];
    setSelectedFoods([...selectedFoods, ...mockResults]);
    setSearchQuery('');
  };

  const addFoodToLog = () => {
    if (selectedFoods.length === 0) return;

    const totalCalories = selectedFoods.reduce((sum, food) => sum + food.calories * food.quantity, 0);
    const totalProtein = selectedFoods.reduce((sum, food) => sum + food.protein * food.quantity, 0);
    const totalCarbs = selectedFoods.reduce((sum, food) => sum + food.carbs * food.quantity, 0);
    const totalFat = selectedFoods.reduce((sum, food) => sum + food.fat * food.quantity, 0);

    const newLog: FoodLogType = {
      id: Date.now().toString(),
      userId: user?.id || 'demo',
      date: selectedDate,
      mealType,
      foodItems: selectedFoods,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat
    };

    addFoodLog(newLog);
    setSelectedFoods([]);
    setShowAddModal(false);
  };

  const removeFoodFromSelection = (id: string) => {
    setSelectedFoods(selectedFoods.filter(f => f.id !== id));
  };

  return (
    <div className="food-log-page">
      <div className="page-header">
        <h1>Food Log</h1>
        <p>Track your nutrition with barcode scanning and AI food recognition</p>
      </div>

      <div className="food-log-controls">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="date-input"
        />
        <button onClick={() => setShowAddModal(true)} className="add-food-btn">
          <Plus size={20} />
          Add Food
        </button>
      </div>

      <div className="nutrition-summary">
        <div className="nutrition-card">
          <h3>Calories</h3>
          <p className="nutrition-value">{Math.round(totalNutrition.calories)}</p>
          <span>kcal</span>
        </div>
        <div className="nutrition-card">
          <h3>Protein</h3>
          <p className="nutrition-value">{Math.round(totalNutrition.protein)}</p>
          <span>g</span>
        </div>
        <div className="nutrition-card">
          <h3>Carbs</h3>
          <p className="nutrition-value">{Math.round(totalNutrition.carbs)}</p>
          <span>g</span>
        </div>
        <div className="nutrition-card">
          <h3>Fat</h3>
          <p className="nutrition-value">{Math.round(totalNutrition.fat)}</p>
          <span>g</span>
        </div>
      </div>

      <div className="meals-list">
        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(meal => {
          const mealLogs = todayLogs.filter(log => log.mealType === meal);
          const mealCalories = mealLogs.reduce((sum, log) => sum + log.totalCalories, 0);

          return (
            <div key={meal} className="meal-section">
              <div className="meal-header">
                <h2>{meal.charAt(0).toUpperCase() + meal.slice(1)}</h2>
                <span className="meal-calories">{Math.round(mealCalories)} cal</span>
              </div>

              {mealLogs.length > 0 ? (
                <div className="meal-items">
                  {mealLogs.map(log => (
                    <div key={log.id} className="meal-log">
                      {log.foodItems.map(item => (
                        <div key={item.id} className="food-item">
                          <div className="food-info">
                            <span className="food-name">
                              {item.name}
                              {item.barcode && <Barcode size={14} className="barcode-icon" />}
                              {item.imageRecognized && <Camera size={14} className="camera-icon" />}
                            </span>
                            <span className="food-serving">{item.quantity} × {item.serving}</span>
                          </div>
                          <div className="food-nutrition">
                            <span>{Math.round(item.calories * item.quantity)} cal</span>
                            <button onClick={() => deleteFoodLog(log.id)} className="delete-btn">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-meals">No items logged</p>
              )}
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Food</h2>

            <div className="meal-type-selector">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(meal => (
                <button
                  key={meal}
                  className={`meal-type-btn ${mealType === meal ? 'active' : ''}`}
                  onClick={() => setMealType(meal)}
                >
                  {meal.charAt(0).toUpperCase() + meal.slice(1)}
                </button>
              ))}
            </div>

            <div className="add-food-methods">
              <button onClick={handleBarcodeScanner} disabled={scanningBarcode} className="method-btn">
                <Barcode size={24} />
                <span>{scanningBarcode ? 'Scanning...' : 'Scan Barcode'}</span>
              </button>

              <button onClick={() => fileInputRef.current?.click()} disabled={recognizingFood} className="method-btn">
                <Camera size={24} />
                <span>{recognizingFood ? 'Recognizing...' : 'Scan Image'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />

              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search food..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchFoodDatabase()}
                  className="search-input"
                />
                <button onClick={searchFoodDatabase} className="search-btn">
                  <Search size={20} />
                </button>
              </div>
            </div>

            {selectedFoods.length > 0 && (
              <div className="selected-foods">
                <h3>Selected Foods</h3>
                {selectedFoods.map(food => (
                  <div key={food.id} className="selected-food-item">
                    <div className="food-details">
                      <span className="food-name">{food.name}</span>
                      <span className="food-nutrition-detail">
                        {food.calories} cal • {food.protein}g protein
                      </span>
                    </div>
                    <button onClick={() => removeFoodFromSelection(food.id)} className="remove-btn">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setShowAddModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button
                onClick={addFoodToLog}
                disabled={selectedFoods.length === 0}
                className="confirm-btn"
              >
                Add to Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodLog;
