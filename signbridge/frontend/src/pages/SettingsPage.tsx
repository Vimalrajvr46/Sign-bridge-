import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Cpu, Sparkles, Volume2 } from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/Button';
import { useAppStore } from '@/store/useAppStore';

export function SettingsPage() {
  const navigate = useNavigate();
  const { aiSettings, setAISettings } = useAppStore();

  const updateSetting = (key: keyof typeof aiSettings, value: string | boolean) => {
    setAISettings({ [key]: value });
  };

  return (
    <PageTransition className="gradient-bg flex min-h-full flex-col p-6">
      <div className="mx-auto w-full max-w-2xl flex-1 flex flex-col">
        <header className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg bg-white/5 p-2.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="h-6 w-6 text-indigo-400" />
              Settings
            </h1>
            <p className="text-sm text-white/50">Manage your AI and performance settings</p>
          </div>
        </header>

        <GlassPanel glow className="space-y-6">
          <section className="border-b border-white/10 pb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Cpu className="h-5 w-5 text-indigo-400" />
              AI Speech & Language
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/60 block mb-1">Whisper Transcription Model</label>
                <select
                  value={aiSettings.whisperModel}
                  onChange={(e) => updateSetting('whisperModel', e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                >
                  <option className="bg-slate-900" value="tiny">Tiny (Fastest, low accuracy)</option>
                  <option className="bg-slate-900" value="base">Base (Balanced)</option>
                  <option className="bg-slate-900" value="small">Small (Better translation)</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-white/60 block mb-1">Translation Model</label>
                <select
                  value={aiSettings.translationModel}
                  onChange={(e) => updateSetting('translationModel', e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                >
                  <option className="bg-slate-900" value="facebook/nllb-200-distilled-600M">NLLB-200 (Meta, Multi-lingual)</option>
                  <option className="bg-slate-900" value="passthrough">Passthrough (No translation)</option>
                </select>
              </div>
            </div>
          </section>

          <section className="border-b border-white/10 pb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              Features & Optimizations
            </h2>
            <div className="space-y-3">
              <ToggleOption
                title="Sign Detection"
                description="Enable hand landmark tracking and sign recognition"
                value={aiSettings.signDetectionEnabled}
                onChange={(val) => updateSetting('signDetectionEnabled', val)}
              />
              <ToggleOption
                title="Text-To-Speech (TTS)"
                description="Speak out translated signs automatically"
                value={aiSettings.ttsEnabled}
                onChange={(val) => updateSetting('ttsEnabled', val)}
              />
              <ToggleOption
                title="Sentence Prediction"
                description="Suggest common continuation phrases dynamically"
                value={aiSettings.sentencePrediction}
                onChange={(val) => updateSetting('sentencePrediction', val)}
              />
              <ToggleOption
                title="Gesture Autocorrect"
                description="Automatically correct recognized signs using conversation context"
                value={aiSettings.gestureAutocorrect}
                onChange={(val) => updateSetting('gestureAutocorrect', val)}
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Volume2 className="h-5 w-5 text-indigo-400" />
              Hardware Acceleration
            </h2>
            <ToggleOption
              title="Use GPU Acceleration"
              description="Offloads transcription and translation computation to CUDA GPU"
              value={aiSettings.useGpu}
              onChange={(val) => updateSetting('useGpu', val)}
            />
          </section>

          <div className="pt-4">
            <Button className="w-full" onClick={() => navigate(-1)}>
              Save & Return
            </Button>
          </div>
        </GlassPanel>
      </div>
    </PageTransition>
  );
}

interface ToggleOptionProps {
  title: string;
  description: string;
  value: boolean;
  onChange: (val: boolean) => void;
}

function ToggleOption({
  title,
  description,
  value,
  onChange,
}: ToggleOptionProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="pr-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-white/50 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
          value ? 'bg-indigo-500' : 'bg-white/10'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
