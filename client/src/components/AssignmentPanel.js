import React, { useState } from 'react';
import axios from 'axios';
import './AssignmentPanel.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

function AssignmentPanel({ classId, role }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadMessage, setUploadMessage] = useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
      setUploadMessage('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('assignment', selectedFile);

    try {
      setUploading(true);
      setUploadMessage('');

      const response = await axios.post(`${SERVER_URL}/api/assignment/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setUploadedFiles([...uploadedFiles, {
          name: response.data.originalName,
          size: response.data.size,
          path: response.data.path,
          uploadedAt: new Date()
        }]);
        setUploadMessage('✓ File uploaded successfully!');
        setSelectedFile(null);

        // Clear file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadMessage('✗ Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="assignment-panel">
      <div className="assignment-header">
        <h3>Assignments</h3>
      </div>

      <div className="upload-section">
        <div className="file-input-wrapper">
          <input
            type="file"
            id="file-input"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.txt,.jpg,.png,.zip"
          />
          <label htmlFor="file-input" className="file-input-label">
            📎 Choose File
          </label>
          {selectedFile && (
            <span className="selected-file-name">{selectedFile.name}</span>
          )}
        </div>

        {selectedFile && (
          <div className="file-details">
            <p className="file-size">{formatFileSize(selectedFile.size)}</p>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-upload"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        )}

        {uploadMessage && (
          <div className={`upload-message ${uploadMessage.includes('✓') ? 'success' : 'error'}`}>
            {uploadMessage}
          </div>
        )}
      </div>

      <div className="uploaded-files-section">
        <h4>Uploaded Files</h4>
        {uploadedFiles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <p>No files uploaded yet</p>
          </div>
        ) : (
          <div className="files-list">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-icon">📄</div>
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-meta">
                    {formatFileSize(file.size)} • {formatTime(file.uploadedAt)}
                  </div>
                </div>
                <a
                  href={`${SERVER_URL}${file.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-download"
                >
                  ⬇
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="assignment-info">
        <p>
          <strong>Accepted formats:</strong> PDF, DOC, DOCX, TXT, JPG, PNG, ZIP
        </p>
        <p>
          <strong>Max file size:</strong> 50MB
        </p>
      </div>
    </div>
  );
}

export default AssignmentPanel;
