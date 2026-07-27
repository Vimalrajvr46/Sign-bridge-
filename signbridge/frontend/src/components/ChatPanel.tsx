import { useState } from 'react';
import { Send } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { Button } from './Button';

interface ChatPanelProps {
  onSend: (text: string) => void;
}

export function ChatPanel({ onSend }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const { messages } = useAppStore();

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex h-full flex-col glass-panel">
      <h3 className="mb-3 text-sm font-semibold text-white/70">Chat</h3>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {messages.filter((m) => m.type === 'chat').map((msg) => (
          <div key={msg.id} className="rounded-xl bg-white/5 px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-indigo-300">{msg.displayName}</span>
              <span className="text-[10px] text-white/30">{formatTimestamp(msg.timestamp)}</span>
            </div>
            <p className="mt-0.5 text-sm text-white/80">{msg.text}</p>
          </div>
        ))}
        {messages.filter((m) => m.type === 'chat').length === 0 && (
          <p className="text-center text-sm text-white/30 py-8">No messages yet</p>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
        />
        <Button size="sm" onClick={handleSend}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface CaptionPanelProps {
  interimText?: string;
}

export function CaptionPanel({ interimText }: CaptionPanelProps) {
  const { messages, role, currentAvatarMessage } = useAppStore();
  const captions = messages.filter((m) => m.type === 'caption' || m.type === 'sign');

  return (
    <div className="glass-panel space-y-3">
      <h3 className="text-sm font-semibold text-white/70">
        {role === 'deaf' ? 'Sign Recognition' : 'Live Captions'}
      </h3>

      {currentAvatarMessage && role === 'deaf' && (
        <div className="rounded-xl bg-indigo-500/10 border border-indigo-400/20 p-3">
          <p className="text-lg font-medium text-white">{currentAvatarMessage.translatedText}</p>
          {currentAvatarMessage.gesture && (
            <span className="mt-1 inline-block rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
              Gesture: {currentAvatarMessage.gesture}
            </span>
          )}
        </div>
      )}

      <div className="max-h-48 space-y-2 overflow-y-auto">
        {captions.slice(-10).map((cap) => (
          <div key={cap.id} className="border-l-2 border-indigo-400/50 pl-3">
            <p className="text-sm text-white/90">{cap.text}</p>
            {cap.translated && cap.translated !== cap.text && (
              <p className="text-xs text-indigo-300/80 mt-0.5">→ {cap.translated}</p>
            )}
          </div>
        ))}
      </div>

      {interimText && (
        <p className="text-sm text-white/40 italic animate-pulse">{interimText}</p>
      )}
    </div>
  );
}
