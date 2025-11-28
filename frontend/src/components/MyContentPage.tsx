import { useState, useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Mic, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { useJobs } from '@/hooks/useAppQueries';
import { deletePodcast } from '@/services/uploadService';
import { api } from '@/types/api';

import { EmptyState } from './content/EmptyState';
import { PodcastCard } from './content/PodcastCard';
import { QuizCard } from './content/QuizCard';

import type { Podcast } from './content/types';

interface MyContentPageProps {
  onStartQuiz?: (quizId: string, lectureId: string | number) => void;
  onPlayPodcast?: (podcastId: string) => void;
}

export function MyContentPage({ onStartQuiz, onPlayPodcast }: MyContentPageProps) {
  const { data: jobsData } = useJobs();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'quizzes' | 'podcasts'>('quizzes');
  const [searchQuery, setSearchQuery] = useState('');

  const [podcasts, setPodcasts] = useState<Podcast[]>([]);

  // Helper to format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: api.getQuizzes,
  });

  useEffect(() => {
    if (jobsData?.jobs) {
      const realPodcasts: Podcast[] = jobsData.jobs
        .filter((job) => job.podcast_status)
        .map((job) => ({
          id: job.job_id,
          lectureTitle: job.filename,
          lectureId: 0, // Not used
          duration: job.podcast_duration ? formatDuration(job.podcast_duration) : '--:--',
          narrator: 'AI Voice', // Static for now
          createdAt: job.created_at,
          status:
            job.podcast_status === 'completed'
              ? 'ready'
              : job.podcast_status === 'failed'
                ? 'failed'
                : 'generating',
          audioUrl: job.podcast_url || undefined,
        }));
      setPodcasts(realPodcasts);
    }
  }, [jobsData]);

  const handleDeleteQuiz = async (_quizId: string) => {
    try {
      // TODO: Implement delete quiz API endpoint
      // await api.deleteQuiz(quizId);
      // refetchQuizzes();
      toast.error('Delete functionality not yet implemented in backend');
    } catch (error) {
      console.error('Failed to delete quiz:', error);
      toast.error('Failed to delete quiz');
    }
  };

  const handleDeletePodcast = async (podcastId: string) => {
    try {
      await deletePodcast(podcastId);
      toast.success('Podcast deleted successfully');
      // Invalidate jobs query to refresh the list from backend
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (error) {
      console.error('Failed to delete podcast:', error);
      toast.error('Failed to delete podcast');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const filteredQuizzes = quizzes.filter((quiz) =>
    quiz.lectureTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPodcasts = podcasts.filter((podcast) =>
    podcast.lectureTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl">My Generated Content</h1>
          <p className="text-muted-foreground">
            View and manage all your generated quizzes and podcasts
          </p>
        </div>

        {/* Tabs and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="glass-card rounded-lg p-1 inline-flex">
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`px-6 py-2 rounded-md transition-all ${
                activeTab === 'quizzes'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Quizzes ({quizzes.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('podcasts')}
              className={`px-6 py-2 rounded-md transition-all ${
                activeTab === 'podcasts'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                <span>Podcasts ({podcasts.length})</span>
              </div>
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 glass-card border-border/50"
            />
          </div>
        </div>

        {/* Content Grid */}
        {activeTab === 'quizzes' ? (
          <div className="space-y-4">
            {filteredQuizzes.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No quizzes yet"
                description="Generate your first quiz from any lecture video"
              />
            ) : (
              filteredQuizzes.map((quiz, index) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  index={index}
                  onStart={(id, lectureId) => onStartQuiz?.(id, lectureId)}
                  onDelete={handleDeleteQuiz}
                  formatDate={formatDate}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPodcasts.length === 0 ? (
              <EmptyState
                icon={Mic}
                title="No podcasts yet"
                description="Generate your first podcast from any lecture video"
              />
            ) : (
              filteredPodcasts.map((podcast, index) => (
                <PodcastCard
                  key={podcast.id}
                  podcast={podcast}
                  index={index}
                  onPlay={(id) => onPlayPodcast?.(id)}
                  onDelete={handleDeletePodcast}
                  formatDate={formatDate}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
