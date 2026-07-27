import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Search, HelpCircle } from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { PageTransition } from '@/components/PageTransition';
import { api } from '@/services/api';

export function DictionaryPage() {
  const navigate = useNavigate();
  const [vocab, setVocab] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSignVocabulary()
      .then((data) => {
        setVocab(data.vocabulary);
      })
      .catch((err) => {
        console.error('Failed to fetch vocabulary:', err);
        // Fallback vocabulary
        setVocab({
          "hello": "Hello",
          "thank_you": "Thank you",
          "yes": "Yes",
          "no": "No",
          "help": "Help",
          "good": "Good",
          "please": "Please",
          "sorry": "Sorry",
          "love": "I love you",
          "water": "Water",
          "eat": "Eat",
          "more": "More",
          "stop": "Stop",
          "wait": "Wait",
          "understand": "I understand",
          "name": "What is your name?",
          "how_are_you": "How are you?",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredVocab = Object.entries(vocab).filter(([key, val]) =>
    key.toLowerCase().includes(search.toLowerCase()) ||
    val.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageTransition className="gradient-bg flex min-h-full flex-col p-6">
      <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col">
        <header className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg bg-white/5 p-2.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-indigo-400" />
              Sign Dictionary
            </h1>
            <p className="text-sm text-white/50">Browse vocabulary recognized by SignBridge</p>
          </div>
        </header>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sign words..."
            className="w-full rounded-2xl bg-white/5 border border-white/10 pl-12 pr-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all"
          />
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <GlassPanel className="flex-1 p-6">
            {filteredVocab.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {filteredVocab.map(([gesture, label]) => (
                  <div
                    key={gesture}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4 hover:border-indigo-400/30 hover:bg-indigo-500/5 transition-all group"
                  >
                    <span className="font-mono text-xs text-indigo-300/80 mb-2">{gesture}</span>
                    <span className="text-lg font-semibold text-white group-hover:text-indigo-200 transition-colors">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-white/40">
                <HelpCircle className="h-12 w-12 mb-3" />
                <p>No signs matched your search</p>
              </div>
            )}
          </GlassPanel>
        )}
      </div>
    </PageTransition>
  );
}
