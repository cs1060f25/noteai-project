import React, { useEffect, useState } from 'react';
import {
  Users,
  Briefcase,
  HardDrive,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

import { MetricsCard } from './MetricsCard';
import { getSystemMetrics, AdminError } from '@/services/adminService';
import type { SystemMetrics } from '@/types/admin';

export const SystemMetricsGrid: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getSystemMetrics();
        setMetrics(data);
      } catch (err) {
        const errorMessage =
          err instanceof AdminError ? err.message : 'Failed to fetch system metrics';
        setError(errorMessage);
        toast.error('Failed to load metrics', {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  if (error) {
    return (
      <div className="glass-card rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-destructive mb-1">Failed to Load Metrics</h3>
            <p className="text-xs text-destructive/80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Metrics */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">User Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricsCard
            title="Total Users"
            value={metrics ? formatNumber(metrics.total_users) : '-'}
            description="Registered accounts"
            icon={Users}
            color="bg-blue-500"
            isLoading={isLoading}
          />
          <MetricsCard
            title="Active Users (30d)"
            value={metrics ? formatNumber(metrics.active_users_30d) : '-'}
            description="Users with activity in last 30 days"
            icon={Activity}
            color="bg-green-500"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Job Metrics */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Job Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricsCard
            title="Total Jobs"
            value={metrics ? formatNumber(metrics.total_jobs) : '-'}
            description="All time"
            icon={Briefcase}
            color="bg-indigo-500"
            isLoading={isLoading}
          />
          <MetricsCard
            title="Completed"
            value={metrics ? formatNumber(metrics.jobs_by_status.completed) : '-'}
            description="Successfully processed"
            icon={CheckCircle2}
            color="bg-green-500"
            isLoading={isLoading}
          />
          <MetricsCard
            title="Failed"
            value={metrics ? formatNumber(metrics.jobs_by_status.failed) : '-'}
            description="Processing errors"
            icon={XCircle}
            color="bg-red-500"
            isLoading={isLoading}
          />
          <MetricsCard
            title="Running"
            value={metrics ? formatNumber(metrics.jobs_by_status.running) : '-'}
            description="Currently processing"
            icon={Loader2}
            color="bg-blue-500"
            isLoading={isLoading}
          />
          <MetricsCard
            title="Queued"
            value={metrics ? formatNumber(metrics.jobs_by_status.queued) : '-'}
            description="Waiting to process"
            icon={Clock}
            color="bg-orange-500"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Storage Metrics */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Storage Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <MetricsCard
            title="Total Storage"
            value={metrics ? formatBytes(metrics.total_storage_bytes) : '-'}
            description="All uploaded files"
            icon={HardDrive}
            color="bg-cyan-500"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Activity Metrics */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricsCard
            title="Last 24 Hours"
            value={metrics ? formatNumber(metrics.jobs_last_24h) : '-'}
            description="Jobs created"
            icon={Activity}
            color="bg-green-500"
            isLoading={isLoading}
          />
          <MetricsCard
            title="Last 7 Days"
            value={metrics ? formatNumber(metrics.jobs_last_7d) : '-'}
            description="Jobs created"
            icon={Activity}
            color="bg-blue-500"
            isLoading={isLoading}
          />
          <MetricsCard
            title="Last 30 Days"
            value={metrics ? formatNumber(metrics.jobs_last_30d) : '-'}
            description="Jobs created"
            icon={Activity}
            color="bg-purple-500"
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};
