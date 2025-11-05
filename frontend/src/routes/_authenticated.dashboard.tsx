import { createFileRoute } from '@tanstack/react-router';
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
} from 'lucide-react';
import { motion } from 'motion/react';

import { GlassButton } from '@/components/GlassButton';
import { Button } from '@/components/ui/button';

export function DashboardComponent({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const stats = [
    {
      label: 'Total Videos',
      value: '24',
      change: '+12%',
      icon: Video,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Clips Generated',
      value: '156',
      change: '+23%',
      icon: Scissors,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Processing Time',
      value: '2.4h',
      change: '-18%',
      icon: Clock,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Total Views',
      value: '8.2K',
      change: '+34%',
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  const recentActivity = [
    {
      id: 1,
      title: 'Introduction to Machine Learning',
      clips: 8,
      duration: '45:23',
      date: '2 hours ago',
      status: 'completed',
    },
    {
      id: 2,
      title: 'Advanced React Patterns',
      clips: 12,
      duration: '1:15:42',
      date: '5 hours ago',
      status: 'completed',
    },
    {
      id: 3,
      title: 'Database Design Fundamentals',
      clips: 6,
      duration: '38:15',
      date: 'Yesterday',
      status: 'processing',
    },
    {
      id: 4,
      title: 'UI/UX Design Principles',
      clips: 10,
      duration: '52:30',
      date: '2 days ago',
      status: 'completed',
    },
  ];

  const quickActions = [
    {
      title: 'Upload New Video',
      description: 'Start processing a new lecture',
      icon: Video,
      color: 'bg-primary',
      page: 'upload',
    },
    {
      title: 'Browse Library',
      description: 'View all your processed videos',
      icon: FileVideo,
      color: 'bg-purple-500',
      page: 'library',
    },
    {
      title: 'View Settings',
      description: 'Manage your preferences',
      icon: Settings,
      color: 'bg-blue-500',
      page: 'settings',
    },
  ];

  return (
    <div className="h-full overflow-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 font-bold">Dashboard Overview</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening with your videos.
            </p>
          </div>
          <GlassButton variant="primary" size="md" onClick={() => onNavigate?.('upload')}>
            <Video className="w-4 h-4" />
            Upload Video
          </GlassButton>
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
                    <div className="flex items-center gap-1 text-sm">
                      <ArrowUpRight
                        className={`w-4 h-4 ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}
                      />
                      <span
                        className={stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}
                      >
                        {stat.change}
                      </span>
                      <span className="text-muted-foreground">vs last month</span>
                    </div>
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
            <div className="glass-card border border-border/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2>Recent Activity</h2>
                <Button variant="ghost" size="sm" onClick={() => onNavigate?.('library')}>
                  View All
                </Button>
              </div>
              <div className="space-y-4">
                {recentActivity.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Play className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm truncate mb-1">{item.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Scissors className="w-3 h-3" />
                          {item.clips} clips
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {item.date}
                        </span>
                      </div>
                    </div>
                    <div>
                      {item.status === 'completed' ? (
                        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs">
                          Completed
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs">
                          Processing
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
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
                    onClick={() => onNavigate?.(action.page)}
                    className="w-full flex items-center gap-3 p-4 rounded-lg glass-card border border-border/50 hover:border-primary/20 transition-all text-left"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}
                    >
                      <action.icon className="w-5 h-5 text-white" />
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
                    <span>12.4 GB / 50 GB</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: '24.8%' }}
                      transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
                <div className="pt-2 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Videos</span>
                    <span>8.2 GB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Clips</span>
                    <span>4.2 GB</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full glass-card">
                  Upgrade Plan
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
