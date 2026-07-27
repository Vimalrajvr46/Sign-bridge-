import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassPanelProps extends HTMLMotionProps<'div'> {
  glow?: boolean;
}

export function GlassPanel({ className, glow, children, ...props }: GlassPanelProps) {
  return (
    <motion.div
      className={cn('glass-panel p-6', glow && 'glow-accent', className)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
