export type UserRole = 'hearing' | 'deaf';

export type Theme = 'dark' | 'light';

export interface Language {
  code: string;
  name: string;
}

export interface AvatarConfig {
  gender: 'male' | 'female';
  skinTone: 'light' | 'medium' | 'dark' | 'olive';
  outfit: 'casual' | 'business' | 'formal';
  avatarUrl: string;
}

export interface Participant {
  clientId: string;
  displayName: string;
  role: UserRole;
  language: string;
  avatarConfig?: AvatarConfig;
}

export interface ChatMessage {
  id: string;
  from: string;
  displayName: string;
  text: string;
  timestamp: string;
  type: 'chat' | 'caption' | 'sign' | 'system';
  translated?: string;
}

export interface AvatarMessage {
  gesture: string | null;
  animation: string | null;
  animationUrl: string | null;
  text: string;
  translatedText: string;
  expressions: Record<string, number>;
  durationMs: number;
}

export interface ConnectionStatus {
  websocket: 'connecting' | 'connected' | 'disconnected' | 'error';
  webrtc: 'new' | 'connecting' | 'connected' | 'failed' | 'closed';
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface SignResult {
  gesture: string | null;
  confidence: number;
  text: string;
}

export interface UserProfile {
  id?: string;
  email?: string;
  displayName: string;
}

export interface AIModelSettings {
  whisperModel: string;
  translationModel: string;
  useGpu: boolean;
  signDetectionEnabled: boolean;
  ttsEnabled: boolean;
  sentencePrediction: boolean;
  gestureAutocorrect: boolean;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'Tamil' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'te', name: 'Telugu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
];

export const DEFAULT_AVATAR_URL =
  'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb';

export const GESTURE_ANIMATIONS: Record<string, string> = {
  hello: '/animations/hello.glb',
  thank_you: '/animations/thank_you.glb',
  yes: '/animations/yes.glb',
  no: '/animations/no.glb',
  help: '/animations/help.glb',
  good: '/animations/good.glb',
};
