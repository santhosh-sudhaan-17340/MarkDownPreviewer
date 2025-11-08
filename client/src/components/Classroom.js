import React, { useState, useEffect, useRef } from 'react';
import './Classroom.css';
import socketService from '../services/socket';
import webrtcService from '../services/webrtc';
import VideoGrid from './VideoGrid';
import ChatPanel from './ChatPanel';
import QuizPanel from './QuizPanel';
import ControlBar from './ControlBar';
import AttendancePanel from './AttendancePanel';
import AssignmentPanel from './AssignmentPanel';
import BreakoutRoomsPanel from './BreakoutRoomsPanel';

function Classroom({ classInfo, onLeave }) {
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activePanel, setActivePanel] = useState('chat'); // chat, quiz, attendance, assignments, breakout
  const [chatMessages, setChatMessages] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [handRaised, setHandRaised] = useState(false);

  const localVideoRef = useRef(null);

  useEffect(() => {
    initializeClassroom();

    return () => {
      cleanup();
    };
  }, []);

  const initializeClassroom = async () => {
    try {
      // Connect to socket server
      const socket = socketService.connect();

      // Join the class
      socket.emit('join-class', {
        classId: classInfo.classId,
        userId: classInfo.userId,
        userName: classInfo.userName,
        role: classInfo.role
      });

      // Get user media
      const stream = await webrtcService.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Set up socket event listeners
      setupSocketListeners(socket);

      setIsConnected(true);
    } catch (error) {
      console.error('Error initializing classroom:', error);
      alert('Failed to access camera/microphone. Please check permissions.');
    }
  };

  const setupSocketListeners = (socket) => {
    // User joined
    socket.on('user-joined', ({ userId, userName, role }) => {
      setParticipants(prev => [...prev, { userId, userName, role }]);
      setChatMessages(prev => [...prev, {
        type: 'system',
        message: `${userName} joined the class`,
        timestamp: new Date()
      }]);

      // If we're the instructor, send offer to new participant
      if (classInfo.role === 'instructor') {
        handleNewParticipant(userId, socket);
      }
    });

    // User left
    socket.on('user-left', ({ userId, userName }) => {
      setParticipants(prev => prev.filter(p => p.userId !== userId));
      setChatMessages(prev => [...prev, {
        type: 'system',
        message: `${userName} left the class`,
        timestamp: new Date()
      }]);
      webrtcService.closePeerConnection(userId);
    });

    // WebRTC signaling
    socket.on('offer', async ({ offer, userId, socketId }) => {
      const answer = await webrtcService.handleOffer(userId, offer);
      socket.emit('answer', { answer, targetSocketId: socketId });

      setupPeerConnectionListeners(userId, socketId);
    });

    socket.on('answer', async ({ answer, socketId }) => {
      await webrtcService.handleAnswer(socketId, answer);
    });

    socket.on('ice-candidate', async ({ candidate, socketId }) => {
      await webrtcService.handleIceCandidate(socketId, candidate);
    });

    // Screen sharing
    socket.on('screen-share-started', ({ userId, socketId }) => {
      setChatMessages(prev => [...prev, {
        type: 'system',
        message: `Screen sharing started`,
        timestamp: new Date()
      }]);
    });

    socket.on('screen-share-stopped', ({ userId }) => {
      setChatMessages(prev => [...prev, {
        type: 'system',
        message: `Screen sharing stopped`,
        timestamp: new Date()
      }]);
    });

    // Chat messages
    socket.on('chat-message', ({ message, userName, userId, timestamp }) => {
      setChatMessages(prev => [...prev, {
        type: 'message',
        message,
        userName,
        userId,
        timestamp: new Date(timestamp)
      }]);
    });

    // Quiz events
    socket.on('quiz-started', (quiz) => {
      setActiveQuiz(quiz);
      setActivePanel('quiz');
    });

    socket.on('quiz-ended', (results) => {
      setActiveQuiz(null);
    });

    // Hand raised
    socket.on('hand-raised', ({ userId, userName }) => {
      setChatMessages(prev => [...prev, {
        type: 'system',
        message: `${userName} raised their hand`,
        timestamp: new Date()
      }]);
    });
  };

  const handleNewParticipant = async (userId, socket) => {
    try {
      const pc = webrtcService.createPeerConnection(userId, true);
      setupPeerConnectionListeners(userId, socket.id);

      const offer = await webrtcService.createOffer(userId);
      socket.emit('offer', { offer, classId: classInfo.classId, userId: classInfo.userId });
    } catch (error) {
      console.error('Error handling new participant:', error);
    }
  };

  const setupPeerConnectionListeners = (peerId, socketId) => {
    const pc = webrtcService.getPeerConnection(peerId);
    if (!pc) return;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('ice-candidate', {
          candidate: event.candidate,
          classId: classInfo.classId,
          targetSocketId: socketId
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(peerId, event.streams[0]);
        return newMap;
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        webrtcService.closePeerConnection(peerId);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(peerId);
          return newMap;
        });
      }
    };
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await webrtcService.getScreenStream();
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in all peer connections
        webrtcService.peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        // Update local display
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        socketService.emit('start-screen-share', {
          classId: classInfo.classId,
          userId: classInfo.userId
        });

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } else {
        stopScreenShare();
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  const stopScreenShare = () => {
    webrtcService.stopScreenStream();

    // Restore camera
    const videoTrack = localStream.getVideoTracks()[0];
    webrtcService.peerConnections.forEach((pc) => {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }

    socketService.emit('stop-screen-share', {
      classId: classInfo.classId,
      userId: classInfo.userId
    });

    setIsScreenSharing(false);
  };

  const raiseHand = () => {
    setHandRaised(!handRaised);
    if (!handRaised) {
      socketService.emit('raise-hand', {
        classId: classInfo.classId,
        userId: classInfo.userId,
        userName: classInfo.userName
      });
    }
  };

  const sendChatMessage = (message) => {
    socketService.emit('chat-message', {
      classId: classInfo.classId,
      message,
      userName: classInfo.userName,
      userId: classInfo.userId
    });
  };

  const startQuiz = (quiz) => {
    socketService.emit('start-quiz', {
      classId: classInfo.classId,
      quiz
    });
    setActiveQuiz(quiz);
    setActivePanel('quiz');
  };

  const submitQuizAnswer = (answers) => {
    socketService.emit('submit-quiz-answer', {
      classId: classInfo.classId,
      userId: classInfo.userId,
      userName: classInfo.userName,
      quizId: activeQuiz.id,
      answers
    });
  };

  const cleanup = () => {
    webrtcService.closeAllConnections();
    socketService.disconnect();
  };

  const handleLeave = () => {
    cleanup();
    onLeave();
  };

  return (
    <div className="classroom-container">
      <div className="classroom-header">
        <div className="class-info">
          <h2>{classInfo.userName} - {classInfo.role}</h2>
          <span className="class-id">Class ID: {classInfo.classId}</span>
        </div>
        <div className="header-actions">
          <button
            className={`btn-hand ${handRaised ? 'active' : ''}`}
            onClick={raiseHand}
            title="Raise hand"
          >
            ✋
          </button>
          <button className="btn-leave" onClick={handleLeave}>
            Leave Class
          </button>
        </div>
      </div>

      <div className="classroom-main">
        <div className="video-section">
          <VideoGrid
            localStream={localStream}
            localVideoRef={localVideoRef}
            remoteStreams={remoteStreams}
            participants={participants}
            isVideoOff={isVideoOff}
          />

          <ControlBar
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreenShare}
            role={classInfo.role}
          />
        </div>

        <div className="side-panel">
          <div className="panel-tabs">
            <button
              className={activePanel === 'chat' ? 'active' : ''}
              onClick={() => setActivePanel('chat')}
            >
              Chat
            </button>
            <button
              className={activePanel === 'quiz' ? 'active' : ''}
              onClick={() => setActivePanel('quiz')}
            >
              Quiz
            </button>
            {classInfo.role === 'instructor' && (
              <>
                <button
                  className={activePanel === 'attendance' ? 'active' : ''}
                  onClick={() => setActivePanel('attendance')}
                >
                  Attendance
                </button>
                <button
                  className={activePanel === 'breakout' ? 'active' : ''}
                  onClick={() => setActivePanel('breakout')}
                >
                  Breakout
                </button>
              </>
            )}
            <button
              className={activePanel === 'assignments' ? 'active' : ''}
              onClick={() => setActivePanel('assignments')}
            >
              Assignments
            </button>
          </div>

          <div className="panel-content">
            {activePanel === 'chat' && (
              <ChatPanel
                messages={chatMessages}
                onSendMessage={sendChatMessage}
                userName={classInfo.userName}
              />
            )}
            {activePanel === 'quiz' && (
              <QuizPanel
                activeQuiz={activeQuiz}
                onStartQuiz={startQuiz}
                onSubmitAnswer={submitQuizAnswer}
                role={classInfo.role}
              />
            )}
            {activePanel === 'attendance' && (
              <AttendancePanel
                classId={classInfo.classId}
                participants={participants}
              />
            )}
            {activePanel === 'assignments' && (
              <AssignmentPanel
                classId={classInfo.classId}
                role={classInfo.role}
              />
            )}
            {activePanel === 'breakout' && (
              <BreakoutRoomsPanel
                classId={classInfo.classId}
                participants={participants}
                socket={socketService.getSocket()}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Classroom;
