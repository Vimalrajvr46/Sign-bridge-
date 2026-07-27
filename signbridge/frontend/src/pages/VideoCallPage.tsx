import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Settings, Download, BookOpen } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { CallControls, VideoTile } from '@/components/CallControls';
import { ChatPanel, CaptionPanel } from '@/components/ChatPanel';
import { AvatarScene } from '@/components/AvatarScene';
import { useWebSocket, useWebRTC } from '@/hooks/useWebRTC';
import { useSpeechRecognition, useTextToSpeech } from '@/hooks/useSpeechRecognition';
import { useSignDetection } from '@/hooks/useSignDetection';
import { useAppStore } from '@/store/useAppStore';
import { downloadTranscript } from '@/lib/utils';

export function VideoCallPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { role, clearSession, exportTranscript, messages } = useAppStore();

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const { sendChat } = useWebSocket(roomId || null);
  const {
    localStream,
    remoteStreams,
    startMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC();

  const { interimTranscript } = useSpeechRecognition(mediaReady && audioEnabled);
  const { speak } = useTextToSpeech();

  useSignDetection(localVideoRef, mediaReady && videoEnabled);

  // Speak translated sign messages for hearing users
  useEffect(() => {
    if (role !== 'hearing') return;
    const lastSign = [...messages].reverse().find((m) => m.type === 'sign');
    if (lastSign?.translated) speak(lastSign.translated);
  }, [messages, role, speak]);

  useEffect(() => {
    startMedia(videoEnabled, audioEnabled)
      .then(() => setMediaReady(true))
      .catch((err) => {
        console.error('Media access denied:', err);
        setMediaReady(true);
      });
  }, [startMedia, videoEnabled, audioEnabled]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleToggleAudio = useCallback(() => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    toggleAudio(next);
  }, [audioEnabled, toggleAudio]);

  const handleToggleVideo = useCallback(() => {
    const next = !videoEnabled;
    setVideoEnabled(next);
    toggleVideo(next);
  }, [videoEnabled, toggleVideo]);

  const handleToggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      stopScreenShare();
      setScreenSharing(false);
    } else {
      await startScreenShare();
      setScreenSharing(true);
    }
  }, [screenSharing, startScreenShare, stopScreenShare]);

  const handleFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.();
  }, []);

  const handleLeave = useCallback(() => {
    clearSession();
    navigate('/role');
  }, [clearSession, navigate]);

  const remoteEntries = Array.from(remoteStreams.entries());

  return (
    <PageTransition className="gradient-bg flex h-full flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white/80">SignBridge Call</h1>
        <div className="flex gap-2">
          <button
            onClick={() => downloadTranscript(exportTranscript())}
            className="rounded-lg bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            title="Export transcript"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/dictionary')}
            className="rounded-lg bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            title="Sign dictionary"
          >
            <BookOpen className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="rounded-lg bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Main video area */}
        <div className="flex flex-1 flex-col gap-4 min-w-0">
          <div className="relative flex-1 min-h-[300px]">
            {remoteEntries.length > 0 ? (
              <div className="grid h-full gap-2 grid-cols-1 md:grid-cols-2">
                {remoteEntries.map(([peerId, stream]) => (
                  <VideoTile key={peerId} stream={stream} label={`Participant ${peerId.slice(0, 6)}`} />
                ))}
              </div>
            ) : (
              <VideoTile stream={localStream} label="You" muted mirror className="h-full" />
            )}

            {/* PiP local video when remote present */}
            {remoteEntries.length > 0 && (
              <VideoTile stream={localStream} label="You" muted mirror pip />
            )}

            {/* Hidden video ref for sign detection */}
            <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
          </div>

          {/* Avatar panel for deaf users */}
          {role === 'deaf' && (
            <div className="h-64 rounded-2xl overflow-hidden border border-white/10">
              <AvatarScene className="h-full w-full" />
            </div>
          )}

          <CaptionPanel interimText={interimTranscript} />
        </div>

        {/* Side panels */}
        <div className="hidden lg:flex w-80 flex-col gap-4">
          {role === 'hearing' && (
            <div className="h-64 rounded-2xl overflow-hidden border border-white/10">
              <AvatarScene className="h-full w-full" />
            </div>
          )}
          {chatOpen && (
            <div className="flex-1 min-h-0">
              <ChatPanel onSend={sendChat} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile chat drawer */}
      {chatOpen && (
        <div className="lg:hidden fixed inset-x-4 bottom-24 z-30 h-64">
          <ChatPanel onSend={sendChat} />
        </div>
      )}

      <CallControls
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        screenSharing={screenSharing}
        chatOpen={chatOpen}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={() => setChatOpen(!chatOpen)}
        onToggleFullscreen={handleFullscreen}
        onLeave={handleLeave}
      />
    </PageTransition>
  );
}
