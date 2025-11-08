# AI Study Partner

A comprehensive web-based learning management system that helps students track progress, manage study sessions, and maximize learning efficiency through AI-powered features.

## Features

### 1. Progress Tracking Across Subjects
- Track study time and progress for multiple subjects
- Visual progress indicators and completion percentages
- Set weekly study hour targets per subject
- Monitor daily streaks and study habits
- View comprehensive statistics and analytics

### 2. Micro-Learning Task Suggestions
- AI-powered task generation based on available time (5-20 minutes)
- Personalized suggestions tailored to each subject
- Different task types: review, practice, quizzes, creative exercises
- Built-in timer and task completion tracking
- Difficulty adaptation based on progress level

### 3. Camera-Based Doubt Capture
- Capture questions/problems using your device camera
- Automatic image capture and storage
- AI-powered analysis and solution generation (simulated)
- OCR text extraction from captured images
- Convert doubts directly into flashcards
- Organized doubt history with status tracking

### 4. Spaced Repetition Scheduling
- Scientific flashcard system using SM-2 algorithm
- Automatic scheduling based on performance
- Card difficulty ratings (Hard, Good, Easy)
- Review sessions with performance analytics
- Progress tracking and retention statistics
- Smart review queue prioritization

### 5. Study Group Matchmaking
- Find study partners based on:
  - Shared subjects and interests
  - Preferred study times
  - Study style compatibility (collaborative, competitive, teaching-focused, quiet)
- Compatibility scoring algorithm
- View detailed partner profiles
- Track study connections and partnerships
- Mock student database for demonstration

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Custom CSS with CSS Grid and Flexbox
- **Storage**: localStorage for data persistence
- **Icons**: Font Awesome 6
- **Fonts**: Inter font family

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd MarkDownPreviewer
```

2. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge)

No build process or server required - it's a pure client-side application!

### Usage

1. **Add Subjects**: Start by adding your subjects with target study hours
2. **Set Your Profile**: Configure your study preferences in the Study Groups section
3. **Generate Tasks**: Use the Micro-Learning feature to get quick study tasks
4. **Capture Doubts**: Use your camera to capture problems or questions
5. **Create Flashcards**: Add flashcards manually or from captured doubts
6. **Review Regularly**: Use the spaced repetition system to review flashcards
7. **Find Study Partners**: Match with other students based on your preferences

## File Structure

```
MarkDownPreviewer/
├── index.html              # Main HTML structure
├── styles.css              # Complete styling
├── app.js                  # Core application logic & data management
├── study-tracker.js        # Progress tracking functionality
├── micro-learning.js       # Task suggestion engine
├── doubt-capture.js        # Camera integration & doubt management
├── spaced-repetition.js    # Flashcard system with SM-2 algorithm
├── group-matching.js       # Study partner matchmaking
└── README.md              # Documentation
```

## Features in Detail

### Dashboard
- Real-time statistics: streak, study time, tasks completed, cards reviewed
- Today's tasks overview
- Subject progress summary
- Quick access to all features

### Subject Management
- Create subjects with categories
- Set weekly study hour targets
- Track hours studied and tasks completed
- Visual progress bars

### Micro-Learning Engine
- Intelligent task generation based on:
  - Available time
  - Subject progress
  - Task type variety
- Timer-based task completion
- Automatic study session tracking

### Doubt Capture System
- Real-time camera access
- Photo capture with flash effect
- Simulated AI analysis (demonstrates the concept)
- Solution generation with explanations
- Convert to flashcards for spaced repetition

### Spaced Repetition
- SM-2 algorithm implementation
- Three difficulty levels
- Automatic interval calculation
- Performance analytics
- Session summaries
- Retention rate tracking

### Study Group Matching
- 30 mock student profiles
- Multi-factor compatibility scoring:
  - Study time alignment (30 points)
  - Study style match (20 points)
  - Subject overlap (40 points)
  - Activity level (10 points)
- Detailed profile views
- Connection management

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 11+)
- Opera: ✅ Full support

### Required Browser Features
- localStorage API
- getUserMedia API (for camera)
- ES6 JavaScript support
- CSS Grid and Flexbox

## Privacy & Data

All data is stored locally in your browser using localStorage. No data is sent to external servers. This means:
- ✅ Complete privacy
- ✅ Works offline
- ✅ No registration required
- ⚠️ Data is device-specific (not synced across devices)
- ⚠️ Clearing browser data will delete your progress

## Future Enhancements

Potential features for future versions:
- Real AI integration for doubt analysis
- Cloud sync across devices
- Real-time study group collaboration
- Advanced analytics and insights
- Mobile app version
- Integration with calendar apps
- Export/import study data
- Dark/light theme toggle
- Custom notification system

## Contributing

This is a demonstration project. Feel free to fork and enhance!

## License

MIT License - feel free to use and modify as needed.

## Credits

Created as a comprehensive AI Study Partner solution featuring:
- Progress tracking
- Micro-learning
- Camera-based doubt capture
- Spaced repetition
- Study group matchmaking

---

**Note**: The AI features in this version use simulated responses for demonstration purposes. For production use, integrate with real AI APIs like OpenAI GPT-4 Vision for actual image analysis and solution generation.
