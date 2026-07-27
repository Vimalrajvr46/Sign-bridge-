import { useNavigate } from 'react-router-dom';
import { User, UserRound } from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/Button';
import { useAppStore } from '@/store/useAppStore';
import { DEFAULT_AVATAR_URL } from '@/types';

const SKIN_TONES = ['light', 'medium', 'dark', 'olive'] as const;
const OUTFITS = ['casual', 'business', 'formal'] as const;

const AVATAR_URLS = {
  male: {
    light: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
    medium: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
    dark: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
    olive: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
  },
  female: {
    light: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
    medium: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
    dark: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
    olive: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
  },
};

export function AvatarSelectionPage() {
  const navigate = useNavigate();
  const { avatarConfig, setAvatarConfig } = useAppStore();

  const updateConfig = (updates: Partial<typeof avatarConfig>) => {
    const next = { ...avatarConfig, ...updates };
    if (updates.gender || updates.skinTone) {
      const gender = updates.gender || next.gender;
      const skin = updates.skinTone || next.skinTone;
      next.avatarUrl = AVATAR_URLS[gender][skin] || DEFAULT_AVATAR_URL;
    }
    setAvatarConfig(next);
  };

  return (
    <PageTransition className="gradient-bg flex min-h-full items-center justify-center p-8">
      <GlassPanel glow className="w-full max-w-xl">
        <h2 className="text-2xl font-bold text-white">Customize Avatar</h2>
        <p className="mt-1 text-white/50">Choose how the sign language interpreter appears</p>

        <div className="mt-6 space-y-6">
          <section>
            <label className="text-sm font-medium text-white/70">Gender</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {(['male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => updateConfig({ gender: g })}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 capitalize transition-all ${
                    avatarConfig.gender === g
                      ? 'border-indigo-400 bg-indigo-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {g === 'male' ? <User className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                  {g}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="text-sm font-medium text-white/70">Skin Tone</label>
            <div className="mt-2 flex gap-2">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone}
                  onClick={() => updateConfig({ skinTone: tone })}
                  className={`flex-1 rounded-xl border py-2 text-xs capitalize transition-all ${
                    avatarConfig.skinTone === tone
                      ? 'border-indigo-400 bg-indigo-500/20'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="text-sm font-medium text-white/70">Outfit</label>
            <div className="mt-2 flex gap-2">
              {OUTFITS.map((outfit) => (
                <button
                  key={outfit}
                  onClick={() => updateConfig({ outfit })}
                  className={`flex-1 rounded-xl border py-2 text-xs capitalize transition-all ${
                    avatarConfig.outfit === outfit
                      ? 'border-indigo-400 bg-indigo-500/20'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  {outfit}
                </button>
              ))}
            </div>
          </section>
        </div>

        <Button className="mt-8 w-full" size="lg" onClick={() => navigate('/room')}>
          Continue to Room
        </Button>
      </GlassPanel>
    </PageTransition>
  );
}
