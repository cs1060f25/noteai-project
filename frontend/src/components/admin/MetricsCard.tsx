import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  color?: string;
  isLoading?: boolean;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color = 'bg-primary',
  isLoading = false,
}) => {
  const isPositiveTrend = trend && trend.value > 0;
  const isNegativeTrend = trend && trend.value < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 bg-muted/50 rounded animate-pulse" />
              <div className="h-4 bg-muted/30 rounded w-2/3 animate-pulse" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold mb-1">{value}</div>
              {description && (
                <p className="text-xs text-muted-foreground mb-2">{description}</p>
              )}
              {trend && (
                <div className="flex items-center gap-1 text-xs">
                  {isPositiveTrend && (
                    <>
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-green-500 font-medium">+{trend.value}%</span>
                    </>
                  )}
                  {isNegativeTrend && (
                    <>
                      <TrendingDown className="w-3 h-3 text-destructive" />
                      <span className="text-destructive font-medium">{trend.value}%</span>
                    </>
                  )}
                  {!isPositiveTrend && !isNegativeTrend && (
                    <span className="text-muted-foreground font-medium">{trend.value}%</span>
                  )}
                  <span className="text-muted-foreground">{trend.label}</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
