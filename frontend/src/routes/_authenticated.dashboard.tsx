import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  Video,
  Scissors,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Play,
  FileVideo,
  Settings,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';

import { GlassButton } from '@/components/GlassButton';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/hooks/useAppQueries';

// helper function to format bytes to human readable
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

// helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // handle future dates or clock skew - show "Just now" instead of negative time
  if (diffMs < 0) {
    return 'Just now';
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    // handle edge case where diffMins is 0
    if (diffMins === 0) {
      return 'Just now';
    }
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

// helper function to format duration
const formatDuration = (seconds: number | null): string => {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function DashboardComponent({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const navigate = useNavigate();
  const { data: dashboardData, isLoading: loading, error: queryError } = useDashboard();
  const error = queryError ? 'Failed to load dashboard data. Please try again.' : null;

  // calculate percentage changes (comparing last 7 days to previous 7 days)
  const calculateChange = (last7d: number, last30d: number): string => {
    if (last30d === 0) return '+0%';
    const previous7d = last30d - last7d;
    if (previous7d === 0) return '+100%';
    const change = ((last7d - previous7d) / previous7d) * 100;
    return `${change > 0 ? '+' : ''}${Math.round(change)}%`;
  };

  // dynamic stats based on real data
  const stats = dashboardData
    ? [
        {
          label: 'Total Videos',
          value: dashboardData.stats.total_videos.toString(),
          change: calculateChange(
            dashboardData.stats.videos_last_7d,
            dashboardData.stats.videos_last_30d
          ),
          icon: Video,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
        },
        {
          label: 'Clips Generated',
          value: dashboardData.stats.total_clips.toString(),
          change: '+0%',
          icon: Scissors,
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/10',
        },
        {
          label: 'Processing',
          value: dashboardData.stats.processing.toString(),
          change: '',
          icon: Clock,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
        },
        {
          label: 'Completed',
          value: dashboardData.stats.completed.toString(),
          change: '',
          icon: TrendingUp,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
        },
      ]
    : [];

  const recentActivity = dashboardData?.recent_videos || [];

  const quickActions = [
    {
      title: 'Upload New Video',
      description: 'Start processing a new lecture',
      icon: Video,
      color: 'bg-primary',
      path: '/upload',
    },
    {
      title: 'Browse Library',
      description: 'View all your processed videos',
      icon: FileVideo,
      color: 'bg-purple-500',
      path: '/library',
    },
    {
      title: 'View Settings',
      description: 'Manage your preferences',
      icon: Settings,
      color: 'bg-blue-500',
      path: '/settings',
    },
  ];

  // loading state
  if (loading) {
    return (
      <div className="h-full overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // error state
  if (error) {
    return (
      <div className="h-full overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="glass-card"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
          <div>
            <h1 className="mb-2 font-bold">Dashboard Overview</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening with your videos.
            </p>
          </div>
          <Link to="/upload" className="w-full sm:w-auto">
            <GlassButton
              variant="primary"
              size="md"
              onClick={() => onNavigate?.('upload')}
              className="w-full sm:w-auto justify-center"
            >
              <Video className="w-4 h-4" />
              Upload Video
            </GlassButton>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="glass-card border border-border/50 rounded-xl p-6 hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl">{stat.value}</p>
                    {stat.change && (
                      <div className="flex items-center gap-1 text-sm">
                        <ArrowUpRight
                          className={`w-4 h-4 ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}
                        />
                        <span
                          className={
                            stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'
                          }
                        >
                          {stat.change}
                        </span>
                        <span className="text-muted-foreground">vs last week</span>
                      </div>
                    )}
                  </div>
                  <div
                    className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}
                  >
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="glass-card border border-border/50 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2>Recent Activity</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ to: '/library' })}
                  className="cursor-pointer"
                >
                  View All
                </Button>
              </div>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No videos yet. Upload your first video to get started!</p>
                  </div>
                ) : (
                  recentActivity.map((item, index) => (
                    <motion.div
                      key={item.job_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                      onClick={() => navigate({ to: `/library/${item.job_id}` })}
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Play className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm truncate mb-1">{item.filename}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Scissors className="w-3 h-3" />
                            {item.clips_count} clips
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(item.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                      </div>
                      <div>
                        {item.status === 'completed' ? (
                          <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs">
                            Completed
                          </span>
                        ) : item.status === 'failed' ? (
                          <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs">
                            Failed
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs">
                            Processing
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="glass-card border border-border/50 rounded-xl p-6">
              <h2 className="mb-4">Quick Actions</h2>
              <div className="space-y-3">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={action.title}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      navigate({ to: action.path });
                      onNavigate?.(action.path);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-lg glass-card border border-border/50 hover:border-primary/20 transition-all text-left cursor-pointer"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}
                    >
                      <action.icon className="w-5 h-5 text-white dark:text-black" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm mb-1">{action.title}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Usage Stats */}
            <div className="glass-card border border-border/50 rounded-xl p-6">
              <h2 className="mb-4">Storage Usage</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">Used</span>
                    <span>{formatBytes(dashboardData?.stats.total_storage_bytes || 0)} / 2 GB</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(((dashboardData?.stats.total_storage_bytes || 0) / (2 * 1024 * 1024 * 1024)) * 100, 100)}%`,
                      }}
                      transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
                <div className="pt-2 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Videos</span>
                    <span>{dashboardData?.stats.total_videos || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Clips</span>
                    <span>{dashboardData?.stats.total_clips || 0}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full glass-card" disabled>
                  Upgrade Plan (Coming Soon)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardComponent,
});
