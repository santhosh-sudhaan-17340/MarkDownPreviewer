import React from 'react';
import './ControlBar.css';

function ControlBar({ isMuted, isVideoOff, isScreenSharing, onToggleMute, onToggleVideo, onToggleScreenShare, role }) {
  return (
    <div className="control-bar">
      <button
        className={`control-btn ${isMuted ? 'active' : ''}`}
        onClick={onToggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🎤'}
        <span>{isMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      <button
        className={`control-btn ${isVideoOff ? 'active' : ''}`}
        onClick={onToggleVideo}
        title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
      >
        {isVideoOff ? '📹' : '📷'}
        <span>{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
      </button>

      {role === 'instructor' && (
        <button
          className={`control-btn ${isScreenSharing ? 'active' : ''}`}
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          🖥️
          <span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
        </button>
      )}
    </div>
  );
}

export default ControlBar;
