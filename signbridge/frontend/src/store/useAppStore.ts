import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AIModelSettings,
  AvatarConfig,
  AvatarMessage,
  ChatMessage,
  ConnectionStatus,
  Theme,
  UserProfile,
  UserRole,
} from '@/types';
import { DEFAULT_AVATAR_URL } from '@/types';

interface AppState {
  // User session
  role: UserRole | null;
  captionLanguage: string;
  displayName: string;
  clientId: string;
  theme: Theme;
  profile: UserProfile;
  avatarConfig: AvatarConfig;
  aiSettings: AIModelSettings;

  // Room
  roomId: string | null;
  isHost: boolean;

  // Call state
  messages: ChatMessage[];
  currentAvatarMessage: AvatarMessage | null;
  connectionStatus: ConnectionStatus;
  conversationHistory: ChatMessage[];
  isRecording: boolean;
  offlineMode: boolean;

  // Actions
  setRole: (role: UserRole) => void;
  setCaptionLanguage: (lang: string) => void;
  setDisplayName: (name: string) => void;
  setClientId: (id: string) => void;
  setTheme: (theme: Theme) => void;
  setProfile: (profile: Partial<UserProfile>) => void;
  setAvatarConfig: (config: Partial<AvatarConfig>) => void;
  setAISettings: (settings: Partial<AIModelSettings>) => void;
  setRoomId: (id: string | null) => void;
  setIsHost: (host: boolean) => void;
  addMessage: (msg: ChatMessage) => void;
  setCurrentAvatarMessage: (msg: AvatarMessage | null) => void;
  setConnectionStatus: (status: Partial<ConnectionStatus>) => void;
  setIsRecording: (recording: boolean) => void;
  setOfflineMode: (offline: boolean) => void;
  clearSession: () => void;
  exportTranscript: () => string;
}

const generateClientId = () =>
  `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      role: null,
      captionLanguage: 'en',
      displayName: 'Guest',
      clientId: generateClientId(),
      theme: 'dark',
      profile: { displayName: 'Guest' },
      avatarConfig: {
        gender: 'female',
        skinTone: 'medium',
        outfit: 'casual',
        avatarUrl: DEFAULT_AVATAR_URL,
      },
      aiSettings: {
        whisperModel: 'base',
        translationModel: 'facebook/nllb-200-distilled-600M',
        useGpu: false,
        signDetectionEnabled: true,
        ttsEnabled: true,
        sentencePrediction: true,
        gestureAutocorrect: true,
      },
      roomId: null,
      isHost: false,
      messages: [],
      currentAvatarMessage: null,
      connectionStatus: {
        websocket: 'disconnected',
        webrtc: 'new',
        networkQuality: 'good',
      },
      conversationHistory: [],
      isRecording: false,
      offlineMode: false,

      setRole: (role) => set({ role }),
      setCaptionLanguage: (lang) => set({ captionLanguage: lang }),
      setDisplayName: (name) => set({ displayName: name, profile: { ...get().profile, displayName: name } }),
      setClientId: (id) => set({ clientId: id }),
      setTheme: (theme) => {
        document.body.classList.toggle('light', theme === 'light');
        set({ theme });
      },
      setProfile: (profile) => set({ profile: { ...get().profile, ...profile } }),
      setAvatarConfig: (config) =>
        set({ avatarConfig: { ...get().avatarConfig, ...config } }),
      setAISettings: (settings) =>
        set({ aiSettings: { ...get().aiSettings, ...settings } }),
      setRoomId: (id) => set({ roomId: id }),
      setIsHost: (host) => set({ isHost: host }),
      addMessage: (msg) =>
        set((state) => ({
          messages: [...state.messages, msg],
          conversationHistory: [...state.conversationHistory, msg],
        })),
      setCurrentAvatarMessage: (msg) => set({ currentAvatarMessage: msg }),
      setConnectionStatus: (status) =>
        set({ connectionStatus: { ...get().connectionStatus, ...status } }),
      setIsRecording: (recording) => set({ isRecording: recording }),
      setOfflineMode: (offline) => set({ offlineMode: offline }),
      clearSession: () =>
        set({
          roomId: null,
          isHost: false,
          messages: [],
          currentAvatarMessage: null,
          connectionStatus: {
            websocket: 'disconnected',
            webrtc: 'new',
            networkQuality: 'good',
          },
        }),
      exportTranscript: () => {
        const history = get().conversationHistory;
        return history
          .map(
            (m) =>
              `[${m.timestamp}] ${m.displayName}: ${m.text}${m.translated ? ` → ${m.translated}` : ''}`,
          )
          .join('\n');
      },
    }),
    {
      name: 'signbridge-store',
      partialize: (state) => ({
        theme: state.theme,
        displayName: state.displayName,
        profile: state.profile,
        avatarConfig: state.avatarConfig,
        aiSettings: state.aiSettings,
        captionLanguage: state.captionLanguage,
      }),
    },
  ),
);
