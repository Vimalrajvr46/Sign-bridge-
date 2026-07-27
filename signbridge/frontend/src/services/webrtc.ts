/**
 * WebRTC peer connection manager for P2P video calling.
 * Uses WebSocket for signaling.
 */

export interface WebRTCCallbacks {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream, peerId: string) => void;
  onRemoteStreamRemoved?: (peerId: string) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState, peerId: string) => void;
  onNetworkQuality?: (quality: 'excellent' | 'good' | 'fair' | 'poor') => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export class WebRTCManager {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private callbacks: WebRTCCallbacks = {};
  private sendSignal: (
    target: string,
    signal: RTCSessionDescriptionInit | RTCIceCandidateInit,
  ) => void = () => {};
  private clientId = '';
  private qualityInterval: ReturnType<typeof setInterval> | null = null;

  setSignalingHandler(
    handler: (target: string, signal: RTCSessionDescriptionInit | RTCIceCandidateInit) => void,
  ) {
    this.sendSignal = handler;
  }

  setClientId(id: string) {
    this.clientId = id;
  }

  setCallbacks(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks;
  }

  async initLocalMedia(
    video = true,
    audio = true,
  ): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
    });
    this.callbacks.onLocalStream?.(this.localStream);
    this.startQualityMonitoring();
    return this.localStream;
  }

  async startScreenShare(): Promise<MediaStream> {
    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    const videoTrack = this.screenStream.getVideoTracks()[0];
    this.peers.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(videoTrack);
    });
    videoTrack.onended = () => this.stopScreenShare();
    return this.screenStream;
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    const videoTrack = this.localStream?.getVideoTracks()[0];
    if (videoTrack) {
      this.peers.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });
    }
  }

  toggleAudio(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  getLocalStream() {
    return this.localStream;
  }

  async createOffer(peerId: string) {
    const pc = this.createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.sendSignal(peerId, offer);
  }

  async handleSignal(from: string, signal: RTCSessionDescriptionInit | RTCIceCandidateInit) {
    if ('type' in signal) {
      let pc = this.peers.get(from);
      if (!pc) {
        pc = this.createPeerConnection(from);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(signal));

      if (signal.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal(from, answer);
      }
    } else {
      const pc = this.peers.get(from);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(signal));
    }
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    if (this.peers.has(peerId)) return this.peers.get(peerId)!;

    console.debug('Creating RTCPeerConnection for client:', this.clientId);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream!);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) this.callbacks.onRemoteStream?.(stream, peerId);
    };

    pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionStateChange?.(pc.connectionState, peerId);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(peerId);
      }
    };

    this.peers.set(peerId, pc);
    return pc;
  }

  removePeer(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
      this.callbacks.onRemoteStreamRemoved?.(peerId);
    }
  }

  private startQualityMonitoring() {
    this.qualityInterval = setInterval(async () => {
      let totalPacketLoss = 0;
      let count = 0;
      for (const pc of this.peers.values()) {
        const stats = await pc.getStats();
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            const loss = (report.packetsLost as number) || 0;
            totalPacketLoss += loss;
            count++;
          }
        });
      }
      const avgLoss = count > 0 ? totalPacketLoss / count : 0;
      const quality =
        avgLoss === 0 ? 'excellent' : avgLoss < 5 ? 'good' : avgLoss < 15 ? 'fair' : 'poor';
      this.callbacks.onNetworkQuality?.(quality);
    }, 5000);
  }

  cleanup() {
    if (this.qualityInterval) clearInterval(this.qualityInterval);
    this.peers.forEach((_, id) => this.removePeer(id));
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.screenStream = null;
  }
}

export const webrtcManager = new WebRTCManager();
