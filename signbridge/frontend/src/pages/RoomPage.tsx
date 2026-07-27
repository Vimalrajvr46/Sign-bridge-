import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn } from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/Button';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import { generateRoomId } from '@/lib/utils';

export function RoomPage() {
  const navigate = useNavigate();
  const { setRoomId, setIsHost, displayName, setDisplayName } = useAppStore();
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const room = await api.createRoom(displayName);
      setRoomId(room.room_id);
      setIsHost(true);
      navigate(`/call/${room.room_id}`);
    } catch {
      // Fallback: create local room ID if backend unavailable
      const localId = generateRoomId();
      setRoomId(localId);
      setIsHost(true);
      navigate(`/call/${localId}`);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!joinId.trim()) {
      setError('Enter a room ID');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.joinRoom(joinId.trim().toUpperCase());
      setRoomId(joinId.trim().toUpperCase());
      setIsHost(false);
      navigate(`/call/${joinId.trim().toUpperCase()}`);
    } catch {
      // Allow joining even if backend check fails (offline mode)
      setRoomId(joinId.trim().toUpperCase());
      setIsHost(false);
      navigate(`/call/${joinId.trim().toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="gradient-bg flex min-h-full items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <GlassPanel glow>
          <h2 className="text-2xl font-bold text-white">Join a Call</h2>
          <p className="mt-1 text-white/50">Create a new room or join an existing one</p>

          <div className="mt-4">
            <label className="text-sm text-white/60">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
              placeholder="Your name"
            />
          </div>

          <Button className="mt-6 w-full" size="lg" loading={loading} onClick={createRoom}>
            <Plus className="h-5 w-5" />
            Create New Room
          </Button>
        </GlassPanel>

        <GlassPanel>
          <h3 className="font-semibold text-white">Join Existing Room</h3>
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value.toUpperCase())}
            placeholder="Enter Room ID"
            className="mt-3 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 font-mono text-white tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
            maxLength={8}
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <Button
            className="mt-4 w-full"
            variant="secondary"
            loading={loading}
            onClick={joinRoom}
          >
            <LogIn className="h-4 w-4" />
            Join Room
          </Button>
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
