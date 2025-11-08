import React, { useState } from 'react';
import './BreakoutRoomsPanel.css';

function BreakoutRoomsPanel({ classId, participants, socket }) {
  const [rooms, setRooms] = useState([]);
  const [numRooms, setNumRooms] = useState(2);
  const [currentRoom, setCurrentRoom] = useState(null);

  const createBreakoutRooms = () => {
    const newRooms = [];
    for (let i = 0; i < numRooms; i++) {
      newRooms.push({
        id: `room_${i + 1}`,
        name: `Room ${i + 1}`,
        participants: []
      });
    }

    // Automatically assign participants to rooms
    participants.forEach((participant, index) => {
      const roomIndex = index % numRooms;
      newRooms[roomIndex].participants.push(participant);
    });

    setRooms(newRooms);

    if (socket) {
      socket.emit('create-breakout-rooms', {
        classId,
        rooms: newRooms
      });
    }
  };

  const assignToRoom = (roomId) => {
    if (socket) {
      socket.emit('assign-to-breakout', {
        classId,
        roomId
      });
      setCurrentRoom(roomId);
    }
  };

  const leaveBreakoutRoom = () => {
    if (socket && currentRoom) {
      socket.emit('leave-breakout', {
        classId,
        roomId: currentRoom
      });
      setCurrentRoom(null);
    }
  };

  const moveParticipant = (participant, fromRoomId, toRoomId) => {
    const updatedRooms = rooms.map(room => {
      if (room.id === fromRoomId) {
        return {
          ...room,
          participants: room.participants.filter(p => p.userId !== participant.userId)
        };
      }
      if (room.id === toRoomId) {
        return {
          ...room,
          participants: [...room.participants, participant]
        };
      }
      return room;
    });

    setRooms(updatedRooms);
  };

  const closeBreakoutRooms = () => {
    setRooms([]);
    setCurrentRoom(null);
    if (socket) {
      socket.emit('close-breakout-rooms', { classId });
    }
  };

  return (
    <div className="breakout-panel">
      <div className="breakout-header">
        <h3>Breakout Rooms</h3>
      </div>

      {rooms.length === 0 ? (
        <div className="breakout-creator">
          <div className="creator-content">
            <div className="icon">👥</div>
            <p>Create breakout rooms to split participants into smaller groups for discussions.</p>

            <div className="form-group">
              <label>Number of Rooms</label>
              <input
                type="number"
                min="2"
                max="10"
                value={numRooms}
                onChange={(e) => setNumRooms(parseInt(e.target.value))}
                className="room-input"
              />
            </div>

            <button
              onClick={createBreakoutRooms}
              className="btn-create-rooms"
              disabled={participants.length < 2}
            >
              Create Breakout Rooms
            </button>

            {participants.length < 2 && (
              <p className="warning-text">
                Need at least 2 participants to create breakout rooms
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="breakout-active">
          {currentRoom ? (
            <div className="in-breakout-room">
              <div className="current-room-info">
                <h4>You are in {rooms.find(r => r.id === currentRoom)?.name}</h4>
                <button onClick={leaveBreakoutRoom} className="btn-leave-room">
                  Return to Main Room
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="rooms-list">
                {rooms.map((room) => (
                  <div key={room.id} className="room-card">
                    <div className="room-header">
                      <h4>{room.name}</h4>
                      <span className="participant-count">
                        {room.participants.length} participants
                      </span>
                    </div>

                    <div className="room-participants">
                      {room.participants.length === 0 ? (
                        <p className="empty-room">No participants</p>
                      ) : (
                        room.participants.map((participant) => (
                          <div key={participant.userId} className="participant-item">
                            <span className="participant-name">
                              {participant.userName}
                            </span>
                            <span className="participant-role">
                              {participant.role}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => assignToRoom(room.id)}
                      className="btn-join-room"
                    >
                      Join Room
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={closeBreakoutRooms} className="btn-close-rooms">
                Close All Breakout Rooms
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default BreakoutRoomsPanel;
