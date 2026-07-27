import { useCallback, useEffect, useRef, useState } from 'react';
import { wsClient } from '@/services/websocket';
import { webrtcManager } from '@/services/webrtc';
import { useAppStore } from '@/store/useAppStore';

export function useWebSocket(roomId: string | null) {
  const {
    clientId,
    role,
    displayName,
    captionLanguage,
    avatarConfig,
    setConnectionStatus,
    addMessage,
    setCurrentAvatarMessage,
  } = useAppStore();

  const connectedRef = useRef(false);

  useEffect(() => {
    if (!roomId || connectedRef.current) return;

    setConnectionStatus({ websocket: 'connecting' });

    wsClient
      .connect(roomId, {
        clientId,
        role: role || 'hearing',
        displayName,
        language: captionLanguage,
        avatarConfig: avatarConfig as unknown as Record<string, unknown>,
      })
      .then(() => {
        connectedRef.current = true;
        setConnectionStatus({ websocket: 'connected' });
      })
      .catch(() => setConnectionStatus({ websocket: 'error' }));

    const unsubJoin = wsClient.on('join', (data) => {
      if (data.client_id && data.client_id !== clientId) {
        webrtcManager.createOffer(data.client_id as string).catch(console.error);
      }
    });

    const unsubSignal = wsClient.on('signal', (data) => {
      const from = data.from as string;
      const signal = data.signal as RTCSessionDescriptionInit | RTCIceCandidateInit;
      if (from && signal) {
        webrtcManager.handleSignal(from, signal).catch(console.error);
      }
    });

    const unsubCaption = wsClient.on('caption', (data) => {
      addMessage({
        id: `${Date.now()}`,
        from: (data.from as string) || 'unknown',
        displayName: (data.display_name as string) || 'User',
        text: (data.text as string) || '',
        translated: data.translated as string,
        timestamp: new Date().toISOString(),
        type: 'caption',
      });
    });

    const unsubAvatar = wsClient.on('avatar', (data) => {
      setCurrentAvatarMessage({
        gesture: (data.gesture as string) || null,
        animation: (data.animation as string) || null,
        animationUrl: (data.animation_url as string) || null,
        text: (data.text as string) || '',
        translatedText: (data.translated_text as string) || '',
        expressions: (data.expressions as Record<string, number>) || {},
        durationMs: (data.duration_ms as number) || 2500,
      });
    });

    const unsubChat = wsClient.on('chat', (data) => {
      addMessage({
        id: `${Date.now()}`,
        from: (data.from as string) || 'unknown',
        displayName: (data.display_name as string) || 'User',
        text: (data.text as string) || '',
        timestamp: new Date().toISOString(),
        type: 'chat',
      });
    });

    const unsubSign = wsClient.on('sign', (data) => {
      addMessage({
        id: `${Date.now()}`,
        from: (data.from as string) || 'unknown',
        displayName: (data.display_name as string) || 'Signer',
        text: (data.text as string) || '',
        translated: data.translated as string,
        timestamp: new Date().toISOString(),
        type: 'sign',
      });
    });

    webrtcManager.setSignalingHandler((target, signal) => {
      wsClient.sendSignal(target, signal);
    });
    webrtcManager.setClientId(clientId);

    return () => {
      unsubJoin();
      unsubSignal();
      unsubCaption();
      unsubAvatar();
      unsubChat();
      unsubSign();
      wsClient.disconnect();
      connectedRef.current = false;
      setConnectionStatus({ websocket: 'disconnected' });
    };
  }, [roomId, clientId, role, displayName, captionLanguage, avatarConfig, setConnectionStatus, addMessage, setCurrentAvatarMessage]);

  const sendChat = useCallback((text: string) => wsClient.sendChat(text), []);
  const sendSpeech = useCallback(
    (text: string, sourceLang: string, targetLang: string) =>
      wsClient.sendSpeech(text, sourceLang, targetLang),
    [],
  );

  return { sendChat, sendSpeech, wsClient };
}

export function useWebRTC() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const { setConnectionStatus } = useAppStore();

  useEffect(() => {
    webrtcManager.setCallbacks({
      onLocalStream: setLocalStream,
      onRemoteStream: (stream, peerId) => {
        setRemoteStreams((prev) => new Map(prev).set(peerId, stream));
      },
      onRemoteStreamRemoved: (peerId) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
      },
      onConnectionStateChange: (state) => {
        setConnectionStatus({
          webrtc: state as 'connecting' | 'connected' | 'failed' | 'closed',
        });
      },
      onNetworkQuality: (quality) => {
        setConnectionStatus({ networkQuality: quality });
      },
    });

    return () => webrtcManager.cleanup();
  }, [setConnectionStatus]);

  const startMedia = useCallback(async (video = true, audio = true) => {
    return webrtcManager.initLocalMedia(video, audio);
  }, []);

  const toggleAudio = useCallback((enabled: boolean) => webrtcManager.toggleAudio(enabled), []);
  const toggleVideo = useCallback((enabled: boolean) => webrtcManager.toggleVideo(enabled), []);
  const startScreenShare = useCallback(() => webrtcManager.startScreenShare(), []);
  const stopScreenShare = useCallback(() => webrtcManager.stopScreenShare(), []);

  return {
    localStream,
    remoteStreams,
    startMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
}
