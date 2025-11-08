import React, { useState, useEffect, useRef } from 'react';
import './ChatPanel.css';

function ChatPanel({ messages, onSendMessage, userName }) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.type}`}>
            {msg.type === 'system' ? (
              <div className="system-message">
                <span className="system-icon">ℹ️</span>
                {msg.message}
              </div>
            ) : (
              <div className="user-message">
                <div className="message-header">
                  <span className="message-user">{msg.userName}</span>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="message-content">{msg.message}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message..."
          className="chat-input"
        />
        <button type="submit" className="chat-send-btn">
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;
