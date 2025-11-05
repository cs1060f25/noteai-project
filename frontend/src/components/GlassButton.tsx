import { forwardRef } from 'react';

import { motion, type HTMLMotionProps } from 'framer-motion';

import { cn } from '@/lib/utils';

interface GlassButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ children, variant = 'primary', size = 'md', className, ...props }, ref) => {
    const baseStyles = 'glass-button font-medium rounded-lg transition-all duration-200';

    const variantStyles = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
      ghost: 'bg-transparent hover:bg-accent',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        whileHover={{
          scale: 1.02,
          boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.15)',
        }}
        whileTap={{
          scale: 0.98,
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
        {...props}
      >
        <motion.div
          className="flex items-center justify-center gap-2"
          initial={{ opacity: 1 }}
          whileHover={{ y: -1 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </motion.button>
    );
  }
);

GlassButton.displayName = 'GlassButton';
