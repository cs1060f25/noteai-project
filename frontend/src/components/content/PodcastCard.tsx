import {
  Mic,
  Play,
  Download,
  Clock,
  Calendar,
  MoreVertical,
  Trash2,
  Share2,
  Pause,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePlayer } from '@/context/PlayerContext';

import type { Podcast } from './types';

interface PodcastCardProps {
  podcast: Podcast;
  index: number;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
  formatDate: (date: string) => string;
}

export function PodcastCard({ podcast, index, onPlay, onDelete, formatDate }: PodcastCardProps) {
  const { playTrack, currentTrack, isPlaying, pauseTrack, resumeTrack } = usePlayer();

  const isCurrentTrack = currentTrack?.id === podcast.id;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;

  const handlePlay = () => {
    if (isCurrentTrack) {
      if (isPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    } else {
      if (podcast.audioUrl) {
        playTrack({
          id: podcast.id,
          title: podcast.lectureTitle,
          url: podcast.audioUrl,
          duration: podcast.duration,
        });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'generating':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
      case 'failed':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  const handleDownload = async () => {
    if (!podcast.audioUrl) return;

    try {
      const response = await fetch(podcast.audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `podcast-${podcast.lectureTitle}.mp3`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(podcast.audioUrl, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="glass-card border-border/50 p-6 hover:border-primary/20 transition-all">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mic className="w-6 h-6 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg mb-1 truncate">{podcast.lectureTitle}</h3>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(podcast.createdAt)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {podcast.duration}
                  </span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-card border-border/50">
                  {podcast.status === 'ready' && (
                    <>
                      <DropdownMenuItem onClick={() => onPlay(podcast.id)}>
                        <Play className="w-4 h-4 mr-2" />
                        Play
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(podcast.id)}
                    className="text-red-500 focus:text-red-500"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge className={getStatusColor(podcast.status)}>
                {podcast.status === 'generating' && 'Generating...'}
                {podcast.status === 'ready' && 'Ready'}
                {podcast.status === 'failed' && 'Failed'}
              </Badge>
              <Badge variant="outline" className="border-border/50">
                {podcast.narrator}
              </Badge>
            </div>

            {podcast.status === 'ready' ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={handlePlay}
                    className="gap-2"
                    variant={isCurrentlyPlaying ? 'secondary' : 'default'}
                  >
                    {isCurrentlyPlaying ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        {isCurrentTrack ? 'Resume' : 'Play Podcast'}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 border-border/50"
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
            ) : podcast.status === 'failed' ? (
              <div className="glass-card rounded-lg p-4 border border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <div className="text-sm text-red-600 dark:text-red-400">
                    Podcast generation failed. Please try again.
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-lg p-4 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <div className="text-sm text-muted-foreground">
                    Generating podcast... This may take a few minutes.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
