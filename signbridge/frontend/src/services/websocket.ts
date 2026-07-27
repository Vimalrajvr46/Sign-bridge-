import type { AvatarMessage, ChatMessage } from '@/types';

export type WSMessageHandler = (data: Record<string, unknown>) => void;

const WS_BASE = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8000`;

export class SignBridgeWebSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, WSMessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnect = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  connect(
    roomId: string,
    init: {
      clientId: string;
      role: string;
      displayName: string;
      language: string;
      avatarConfig?: Record<string, unknown>;
    },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${WS_BASE}/ws/${roomId}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.ws!.send(
          JSON.stringify({
            type: 'join',
            client_id: init.clientId,
            role: init.role,
            display_name: init.displayName,
            language: init.language,
            avatar_config: init.avatarConfig || {},
          }),
        );
        this.startPing();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.dispatch(data.type, data);
          this.dispatch('*', data);
        } catch {
          console.error('Invalid WebSocket message');
        }
      };

      this.ws.onerror = () => reject(new Error('WebSocket connection failed'));

      this.ws.onclose = () => {
        this.stopPing();
        this.dispatch('close', {});
        if (this.reconnectAttempts < this.maxReconnect) {
          this.reconnectAttempts++;
          this.reconnectTimer = setTimeout(() => {
            this.connect(roomId, init).catch(console.error);
          }, 2000 * this.reconnectAttempts);
        }
      };
    });
  }

  on(event: string, handler: WSMessageHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: WSMessageHandler) {
    const list = this.handlers.get(event);
    if (list) {
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  private dispatch(event: string, data: Record<string, unknown>) {
    this.handlers.get(event)?.forEach((h) => h(data));
  }

  send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendSignal(target: string, signal: RTCSessionDescriptionInit | RTCIceCandidateInit) {
    this.send({ type: 'signal', target, signal });
  }

  sendSpeech(text: string, sourceLang: string, targetLang: string) {
    this.send({ type: 'speech', text, source_lang: sourceLang, target_lang: targetLang });
  }

  sendSignFrame(frameBase64: string, targetLang: string) {
    this.send({ type: 'sign', frame_base64: frameBase64, target_lang: targetLang });
  }

  sendChat(text: string) {
    this.send({ type: 'chat', text });
  }

  sendCaption(text: string, translated?: string) {
    this.send({ type: 'caption', text, translated });
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  private stopPing() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }

  disconnect() {
    this.maxReconnect = 0;
    this.stopPing();
    this.ws?.close();
    this.ws = null;
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export function parseAvatarMessage(data: Record<string, unknown>): AvatarMessage {
  return {
    gesture: (data.gesture as string) || null,
    animation: (data.animation as string) || null,
    animationUrl: (data.animation_url as string) || null,
    text: (data.text as string) || '',
    translatedText: (data.translated_text as string) || (data.text as string) || '',
    expressions: (data.expressions as Record<string, number>) || {},
    durationMs: (data.duration_ms as number) || 2500,
  };
}

export function parseChatMessage(
  data: Record<string, unknown>,
  displayName = 'Unknown',
): ChatMessage {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    from: (data.from as string) || 'system',
    displayName,
    text: (data.text as string) || '',
    translated: data.translated as string | undefined,
    timestamp: (data.timestamp as string) || new Date().toISOString(),
    type: (data.type as ChatMessage['type']) || 'chat',
  };
}

export const wsClient = new SignBridgeWebSocket();
