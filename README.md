# E-Learning Live Class App

A full-featured, real-time e-learning platform with low-latency video streaming, interactive quizzes, breakout rooms, and comprehensive classroom management tools.

## Features

### 🎥 Low-Latency Live Streaming
- WebRTC-based peer-to-peer video streaming
- Support for multiple participants
- High-quality video and audio transmission
- Optimized for minimal latency

### 📺 Screen Sharing
- Instructor screen sharing capability
- Real-time screen broadcast to all participants
- Easy toggle between camera and screen share
- Automatic fallback to camera when screen sharing stops

### 📊 Adaptive Bitrate Streaming
- Multiple encoding layers (High, Medium, Low quality)
- Automatic quality adjustment based on network conditions
- Dynamic bitrate monitoring and optimization
- Smooth streaming experience across different network speeds

### 📝 Real-Time Quizzes
- Instructor can create and launch quizzes during class
- Multiple choice questions support
- Real-time answer submission tracking
- Instant feedback to students
- Quiz analytics for instructors

### 📋 Attendance Analytics
- Automatic attendance tracking
- Join/leave time stamps
- Session duration calculation
- Real-time participant status
- Exportable attendance reports

### 📎 Assignment Upload System
- File upload support (PDF, DOC, DOCX, TXT, JPG, PNG, ZIP)
- 50MB file size limit
- Secure file storage
- Download capability for instructors
- Upload history tracking

### 👥 Breakout Rooms
- Create multiple breakout rooms
- Automatic or manual participant assignment
- Dedicated chat for each breakout room
- Easy navigation between main room and breakout rooms
- Instructor control over breakout sessions

### 💬 Live Chat & Communication
- Real-time text chat
- System notifications for join/leave events
- Hand raise feature
- Message timestamps
- User identification in messages

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express** - Web server framework
- **Socket.io** - Real-time bidirectional communication
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### Frontend
- **React** - UI framework
- **WebRTC** - Real-time video/audio streaming
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client
- **CSS3** - Styling and animations

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Modern web browser with WebRTC support

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MarkDownPreviewer
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

3. **Environment Configuration**
   ```bash
   # Create .env file from example
   cp .env.example .env
   ```

   Edit `.env` and configure:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/elearning
   JWT_SECRET=your_jwt_secret_key_here
   CLIENT_URL=http://localhost:3000
   ```

4. **Start the application**

   **Development mode (runs both server and client):**
   ```bash
   npm run dev
   ```

   **Production mode:**
   ```bash
   # Build client
   npm run build

   # Start server
   npm start
   ```

## Usage

### For Students

1. **Join a Class**
   - Enter your name
   - Enter the class ID provided by instructor
   - Select "Student" role
   - Click "Join Class"

2. **During Class**
   - Enable/disable camera and microphone
   - Participate in chat discussions
   - Raise hand to get attention
   - Answer quizzes when launched
   - Upload assignments
   - Join breakout rooms when assigned

### For Instructors

1. **Create a Class**
   - Enter your name
   - Click "Create New" to generate a class ID
   - Select "Instructor" role
   - Click "Join Class"
   - Share the class ID with students

2. **Class Management**
   - Control your camera and microphone
   - Share your screen with students
   - Create and launch quizzes
   - Monitor attendance in real-time
   - Create and manage breakout rooms
   - Review uploaded assignments

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status

### Attendance
```
GET /api/attendance/:classId
```
Retrieve attendance records for a class

### Session Management
```
POST /api/session/start
Body: { classId, instructorId, title }
```
Start a new class session

```
POST /api/session/end
Body: { classId }
```
End a class session

### Assignment Upload
```
POST /api/assignment/upload
Content-Type: multipart/form-data
Body: { assignment: file }
```
Upload an assignment file

## Socket Events

### Connection Events
- `join-class` - Join a classroom
- `user-joined` - Notification of new participant
- `user-left` - Notification of participant leaving

### WebRTC Signaling
- `offer` - WebRTC offer
- `answer` - WebRTC answer
- `ice-candidate` - ICE candidate exchange

### Screen Sharing
- `start-screen-share` - Start screen sharing
- `stop-screen-share` - Stop screen sharing

### Quiz Events
- `start-quiz` - Start a quiz
- `submit-quiz-answer` - Submit quiz answers
- `end-quiz` - End a quiz

### Breakout Rooms
- `create-breakout-rooms` - Create breakout rooms
- `assign-to-breakout` - Assign user to breakout room
- `leave-breakout` - Leave breakout room

### Chat
- `chat-message` - Send/receive chat messages
- `raise-hand` - Raise hand notification

## Architecture

### Client-Side Architecture
```
src/
├── components/          # React components
│   ├── Home.js         # Landing page
│   ├── Classroom.js    # Main classroom component
│   ├── VideoGrid.js    # Video display grid
│   ├── ControlBar.js   # Media controls
│   ├── ChatPanel.js    # Chat interface
│   ├── QuizPanel.js    # Quiz interface
│   ├── AttendancePanel.js      # Attendance tracking
│   ├── AssignmentPanel.js      # Assignment uploads
│   └── BreakoutRoomsPanel.js   # Breakout rooms
├── services/           # Service layer
│   ├── socket.js      # Socket.io client
│   └── webrtc.js      # WebRTC handling
└── App.js             # Main app component
```

### Server-Side Architecture
```
server/
└── index.js           # Express server + Socket.io
```

## WebRTC Flow

1. **Peer Connection Establishment**
   - User A creates offer
   - User B receives offer and creates answer
   - ICE candidates exchanged
   - Connection established

2. **Media Stream Handling**
   - Local stream captured from camera/microphone
   - Tracks added to peer connections
   - Remote streams received and displayed

3. **Adaptive Bitrate**
   - Multiple encoding layers created
   - Network quality monitored
   - Bitrate adjusted automatically

## Browser Compatibility

- Chrome/Edge (Recommended)
- Firefox
- Safari
- Opera

**Note:** WebRTC features require HTTPS in production environments.

## Security Considerations

- Always use HTTPS in production
- Implement proper authentication
- Validate file uploads
- Sanitize user inputs
- Use secure WebSocket connections (WSS)
- Implement rate limiting
- Add CORS restrictions

## Performance Optimization

- Adaptive bitrate streaming reduces bandwidth usage
- Peer-to-peer connections minimize server load
- Efficient state management in React
- Lazy loading of components
- Optimized video encoding

## Troubleshooting

### Camera/Microphone Not Working
- Check browser permissions
- Ensure HTTPS connection (required for WebRTC)
- Try different browser
- Check device availability

### Connection Issues
- Verify firewall settings
- Check STUN/TURN server configuration
- Ensure WebSocket connection is established
- Verify server is running

### Poor Video Quality
- Check network bandwidth
- Reduce number of participants
- Lower video resolution
- Close other bandwidth-intensive applications

## Future Enhancements

- [ ] Recording capability
- [ ] Virtual backgrounds
- [ ] Polls and surveys
- [ ] Whiteboard feature
- [ ] Calendar integration
- [ ] Mobile app support
- [ ] AI-powered transcription
- [ ] Analytics dashboard
- [ ] Grade management
- [ ] Email notifications

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:
- Open an issue on GitHub
- Contact: [your-email@example.com]

## Acknowledgments

- WebRTC community
- Socket.io team
- React team
- All contributors

---

**Built with ❤️ for better online education**