import { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Maximize, MessageSquare, Users } from 'lucide-react';
import { cn, getNetworkQualityColor, getNetworkQualityLabel } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { Button } from './Button';

interface CallControlsProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  chatOpen: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleFullscreen: () => void;
  onLeave: () => void;
}

export function CallControls({
  audioEnabled,
  videoEnabled,
  screenSharing,
  chatOpen,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleFullscreen,
  onLeave,
}: CallControlsProps) {
  const { connectionStatus, roomId } = useAppStore();

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 glass-panel rounded-2xl">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-white/50">Room</span>
        <span className="font-mono font-semibold text-indigo-300">{roomId}</span>
        <span className={cn('flex items-center gap-1', getNetworkQualityColor(connectionStatus.networkQuality))}>
          <span className="h-2 w-2 rounded-full bg-current animate-pulse-glow" />
          {getNetworkQualityLabel(connectionStatus.networkQuality)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ControlButton active={audioEnabled} onClick={onToggleAudio} label="Microphone">
          {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </ControlButton>
        <ControlButton active={videoEnabled} onClick={onToggleVideo} label="Camera">
          {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </ControlButton>
        <ControlButton active={screenSharing} onClick={onToggleScreenShare} label="Share screen">
          <Monitor className="h-5 w-5" />
        </ControlButton>
        <ControlButton active={chatOpen} onClick={onToggleChat} label="Chat">
          <MessageSquare className="h-5 w-5" />
        </ControlButton>
        <ControlButton onClick={onToggleFullscreen} label="Fullscreen">
          <Maximize className="h-5 w-5" />
        </ControlButton>
        <Button variant="danger" size="sm" onClick={onLeave} className="ml-2">
          <PhoneOff className="h-4 w-4" />
          Leave
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-white/50">
        <Users className="h-4 w-4" />
        <ConnectionDot status={connectionStatus.websocket} label="WS" />
        <ConnectionDot status={connectionStatus.webrtc} label="RTC" />
      </div>
    </div>
  );
}

function ControlButton({
  children,
  active = true,
  onClick,
  label,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-xl transition-all',
        active
          ? 'bg-white/10 text-white hover:bg-white/20'
          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
      )}
    >
      {children}
    </button>
  );
}

function ConnectionDot({ status, label }: { status: string; label: string }) {
  const color =
    status === 'connected' ? 'bg-emerald-400' :
    status === 'connecting' ? 'bg-yellow-400' :
    'bg-red-400';
  return (
    <span className="flex items-center gap-1" title={`${label}: ${status}`}>
      <span className={cn('h-2 w-2 rounded-full', color)} />
      {label}
    </span>
  );
}

interface VideoTileProps {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  mirror?: boolean;
  className?: string;
  pip?: boolean;
}

export function VideoTile({ stream, label, muted, mirror, className, pip }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-black/40 border border-white/10',
        pip ? 'absolute bottom-4 right-4 z-20 h-36 w-48 shadow-2xl' : 'h-full w-full',
        className,
      )}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={cn('h-full w-full object-cover', mirror && 'scale-x-[-1]')}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-white/30">
          <VideoOff className="h-12 w-12" />
        </div>
      )}
      <div className="absolute bottom-2 left-2 rounded-lg bg-black/50 px-2 py-1 text-xs text-white/80 backdrop-blur-sm">
        {label}
      </div>
    </div>
  );
}
