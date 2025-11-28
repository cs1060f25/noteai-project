import { motion } from 'motion/react';

import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-12 text-center"
    >
      <Icon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-xl mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">
        {description}
      </p>
    </motion.div>
  );
}
