import { useNavigate } from 'react-router-dom';
import { Ear, Hand } from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { PageTransition } from '@/components/PageTransition';
import { useAppStore } from '@/store/useAppStore';
import type { UserRole } from '@/types';

export function RoleSelectionPage() {
  const navigate = useNavigate();
  const setRole = useAppStore((s) => s.setRole);

  const selectRole = (role: UserRole) => {
    setRole(role);
    if (role === 'hearing') {
      navigate('/language');
    } else {
      navigate('/avatar');
    }
  };

  return (
    <PageTransition className="gradient-bg flex min-h-full items-center justify-center p-8">
      <GlassPanel glow className="w-full max-w-lg text-center">
        <h2 className="text-2xl font-bold text-white">Select your role</h2>
        <p className="mt-2 text-white/50">How will you communicate in this session?</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <RoleCard
            icon={<Ear className="h-8 w-8" />}
            title="Hearing User"
            description="Speak naturally — AI translates to sign language avatar"
            onClick={() => selectRole('hearing')}
          />
          <RoleCard
            icon={<Hand className="h-8 w-8" />}
            title="Deaf / Mute User"
            description="Sign naturally — AI recognizes and captions for others"
            onClick={() => selectRole('deaf')}
          />
        </div>
      </GlassPanel>
    </PageTransition>
  );
}

function RoleCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-all hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:shadow-lg hover:shadow-indigo-500/10"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-500/30 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-white/50">{description}</p>
    </button>
  );
}
