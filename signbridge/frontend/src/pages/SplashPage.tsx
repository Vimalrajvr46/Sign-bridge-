import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Hand, Sparkles } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';

export function SplashPage() {
  const navigate = useNavigate();

  return (
    <PageTransition className="gradient-bg flex min-h-full flex-col items-center justify-center p-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-indigo-500/20 glow-accent">
          <Hand className="h-12 w-12 text-indigo-400" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
          SignBridge
        </h1>
        <p className="mt-4 max-w-md text-lg text-white/60">
          AI-powered real-time communication that bridges Deaf and hearing worlds
        </p>
        <div className="mt-2 flex items-center justify-center gap-2 text-sm text-indigo-300/80">
          <Sparkles className="h-4 w-4" />
          <span>Speech · Sign Language · 3D Avatar · Translation</span>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        onClick={() => navigate('/role')}
        className="mt-12 rounded-2xl bg-indigo-500 px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/40 hover:bg-indigo-400 transition-colors"
      >
        Get Started
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-8 text-xs text-white/30"
      >
        Breaking communication barriers with AI
      </motion.p>
    </PageTransition>
  );
}
