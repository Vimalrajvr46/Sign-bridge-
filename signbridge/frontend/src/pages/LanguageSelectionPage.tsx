import { useNavigate } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { PageTransition } from '@/components/PageTransition';
import { useAppStore } from '@/store/useAppStore';
import { SUPPORTED_LANGUAGES } from '@/types';

export function LanguageSelectionPage() {
  const navigate = useNavigate();
  const { captionLanguage, setCaptionLanguage } = useAppStore();

  const selectLanguage = (code: string) => {
    setCaptionLanguage(code);
    navigate('/room');
  };

  return (
    <PageTransition className="gradient-bg flex min-h-full items-center justify-center p-8">
      <GlassPanel glow className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="h-6 w-6 text-indigo-400" />
          <h2 className="text-2xl font-bold text-white">Caption Language</h2>
        </div>
        <p className="text-white/50">
          What language would you like captions in during the call?
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => selectLanguage(lang.code)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                captionLanguage === lang.code
                  ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                  : 'border-white/10 bg-white/5 text-white/70 hover:border-indigo-400/30 hover:bg-indigo-500/10'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </GlassPanel>
    </PageTransition>
  );
}
