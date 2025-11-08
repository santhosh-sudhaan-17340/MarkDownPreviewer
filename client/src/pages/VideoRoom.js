import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from 'react-icons/fa';

const VideoRoom = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stream, setStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [remotePeer, setRemotePeer] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();

  useEffect(() => {
    // Get user media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(currentStream => {
        setStream(currentStream);
        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
        }
      })
      .catch(error => {
        console.error('Error accessing media devices:', error);
        alert('Failed to access camera/microphone');
      });

    // Connect to socket
    socket.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');

    socket.current.emit('join-room', { roomId, userId: user._id });

    socket.current.on('user-joined', ({ userId, socketId }) => {
      // Create peer and send offer
      const newPeer = createPeer(socketId, stream);
      setPeer(newPeer);
    });

    socket.current.on('offer', ({ offer, from }) => {
      // Receive offer and send answer
      const newPeer = addPeer(offer, from, stream);
      setRemotePeer(newPeer);
    });

    socket.current.on('answer', ({ answer }) => {
      if (peer) {
        peer.signal(answer);
      }
    });

    socket.current.on('ice-candidate', ({ candidate }) => {
      if (peer) {
        peer.signal(candidate);
      }
    });

    socket.current.on('user-left', () => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = null;
      }
    });

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (socket.current) {
        socket.current.disconnect();
      }
      if (peer) {
        peer.destroy();
      }
    };
  }, [roomId, user._id]);

  const createPeer = (socketId, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream
    });

    peer.on('signal', signal => {
      socket.current.emit('offer', { roomId, offer: signal, to: socketId });
    });

    peer.on('stream', stream => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
    });

    return peer;
  };

  const addPeer = (offer, socketId, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream
    });

    peer.on('signal', signal => {
      socket.current.emit('answer', { roomId, answer: signal, to: socketId });
    });

    peer.on('stream', stream => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
    });

    peer.signal(offer);

    return peer;
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
    }
  };

  const endCall = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (socket.current) {
      socket.current.emit('session-ended', { roomId });
      socket.current.disconnect();
    }
    navigate('/sessions');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 grid md:grid-cols-2 gap-4 p-4">
        {/* Partner Video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={partnerVideo}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded">
            Partner
          </div>
        </div>

        {/* User Video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={userVideo}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded">
            You
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-6">
        <div className="max-w-md mx-auto flex justify-center gap-4">
          <button
            onClick={toggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              audioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            } text-white transition-colors`}
          >
            {audioEnabled ? <FaMicrophone className="text-xl" /> : <FaMicrophoneSlash className="text-xl" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            } text-white transition-colors`}
          >
            {videoEnabled ? <FaVideo className="text-xl" /> : <FaVideoSlash className="text-xl" />}
          </button>

          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <FaPhoneSlash className="text-xl" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoRoom;
