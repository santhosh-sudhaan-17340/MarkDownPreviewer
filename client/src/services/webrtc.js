class WebRTCService {
  constructor() {
    this.peerConnections = new Map();
    this.localStream = null;
    this.screenStream = null;
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  // Get user media with adaptive bitrate
  async getUserMedia(constraints = { video: true, audio: true }) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  // Get screen sharing stream
  async getScreenStream() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: false
      });
      this.screenStream = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing screen:', error);
      throw error;
    }
  }

  // Create peer connection with adaptive bitrate
  createPeerConnection(peerId, isInitiator = false) {
    const pc = new RTCPeerConnection(this.configuration);
    this.peerConnections.set(peerId, pc);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Set up adaptive bitrate
    this.setupAdaptiveBitrate(pc);

    return pc;
  }

  // Adaptive bitrate streaming
  async setupAdaptiveBitrate(pc) {
    try {
      const senders = pc.getSenders();
      for (const sender of senders) {
        if (sender.track && sender.track.kind === 'video') {
          const parameters = sender.getParameters();

          if (!parameters.encodings) {
            parameters.encodings = [{}];
          }

          // Set multiple encoding layers for adaptive streaming
          parameters.encodings = [
            {
              rid: 'h',
              maxBitrate: 900000, // 900 kbps - High quality
              scaleResolutionDownBy: 1.0
            },
            {
              rid: 'm',
              maxBitrate: 450000, // 450 kbps - Medium quality
              scaleResolutionDownBy: 2.0
            },
            {
              rid: 'l',
              maxBitrate: 150000, // 150 kbps - Low quality
              scaleResolutionDownBy: 4.0
            }
          ];

          await sender.setParameters(parameters);
        }
      }
    } catch (error) {
      console.log('Adaptive bitrate not fully supported:', error);
      // Fallback to single encoding with dynamic bitrate adjustment
      this.setupDynamicBitrate(pc);
    }
  }

  // Dynamic bitrate adjustment based on network conditions
  setupDynamicBitrate(pc) {
    let lastBitrate = 0;

    setInterval(async () => {
      const stats = await pc.getStats();
      let currentBitrate = 0;

      stats.forEach(stat => {
        if (stat.type === 'outbound-rtp' && stat.mediaType === 'video') {
          const bytes = stat.bytesSent;
          if (lastBitrate > 0) {
            currentBitrate = (bytes - lastBitrate) * 8; // Convert to bits
          }
          lastBitrate = bytes;
        }
      });

      // Adjust quality based on available bandwidth
      const senders = pc.getSenders();
      for (const sender of senders) {
        if (sender.track && sender.track.kind === 'video') {
          const parameters = sender.getParameters();

          if (currentBitrate < 200000) {
            // Low bandwidth - reduce quality
            parameters.encodings[0].maxBitrate = 200000;
          } else if (currentBitrate < 500000) {
            // Medium bandwidth
            parameters.encodings[0].maxBitrate = 500000;
          } else {
            // High bandwidth
            parameters.encodings[0].maxBitrate = 1000000;
          }

          await sender.setParameters(parameters);
        }
      }
    }, 2000); // Check every 2 seconds
  }

  // Create and send offer
  async createOffer(peerId) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return null;

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  // Handle received offer
  async handleOffer(peerId, offer) {
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      pc = this.createPeerConnection(peerId);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  // Handle received answer
  async handleAnswer(peerId, answer) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(peerId, candidate) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  // Get peer connection
  getPeerConnection(peerId) {
    return this.peerConnections.get(peerId);
  }

  // Stop local stream
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  // Stop screen stream
  stopScreenStream() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
  }

  // Close peer connection
  closePeerConnection(peerId) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
  }

  // Close all connections
  closeAllConnections() {
    this.peerConnections.forEach((pc, peerId) => {
      pc.close();
    });
    this.peerConnections.clear();
    this.stopLocalStream();
    this.stopScreenStream();
  }
}

export default new WebRTCService();
