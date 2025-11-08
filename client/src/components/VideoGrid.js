import React from 'react';
import './VideoGrid.css';

function VideoGrid({ localStream, localVideoRef, remoteStreams, participants, isVideoOff }) {
  const allStreams = Array.from(remoteStreams.entries());

  return (
    <div className={`video-grid ${allStreams.length === 0 ? 'single' : ''}`}>
      {/* Local video */}
      <div className="video-item local">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className={isVideoOff ? 'video-off' : ''}
        />
        {isVideoOff && (
          <div className="video-placeholder">
            <div className="avatar">You</div>
          </div>
        )}
        <div className="video-label">You (Local)</div>
      </div>

      {/* Remote videos */}
      {allStreams.map(([peerId, stream]) => (
        <RemoteVideo key={peerId} stream={stream} peerId={peerId} participants={participants} />
      ))}
    </div>
  );
}

function RemoteVideo({ stream, peerId, participants }) {
  const videoRef = React.useRef(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      setIsPlaying(true);
    }
  }, [stream]);

  const participant = participants.find(p => p.userId === peerId);
  const name = participant ? participant.userName : 'Unknown';

  return (
    <div className="video-item remote">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={!isPlaying ? 'video-off' : ''}
      />
      {!isPlaying && (
        <div className="video-placeholder">
          <div className="avatar">{name[0]?.toUpperCase()}</div>
        </div>
      )}
      <div className="video-label">{name}</div>
    </div>
  );
}

export default VideoGrid;
