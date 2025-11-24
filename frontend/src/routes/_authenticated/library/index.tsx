import { useEffect, useState } from 'react';

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  LayoutGrid,
  List,
  Search,
  MoreVertical,
  Play,
  Calendar,
  Filter,
  SortAsc,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { ImageWithFallback } from '@/components/ImageWithFallback';
import * as badge from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { JobResponse } from '@/types/api';

import { getResults } from '../../../services/resultsService';
import { getJobs } from '../../../services/uploadService';

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Extended job type with thumbnail
interface JobWithThumbnail extends JobResponse {
  thumbnail_url?: string | null;
}

export function LibraryPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithThumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');

  // Fetch jobs on mount
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getJobs(100, 0); // Get up to 100 jobs
        setJobs(response.jobs);

        // Fetch thumbnails for completed jobs (in background)
        fetchThumbnailsForCompletedJobs(response.jobs);
      } catch (err) {
        setError('Failed to load videos. Please try again.');
        console.error('Error fetching jobs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Fetch thumbnails for completed jobs in the background
  const fetchThumbnailsForCompletedJobs = async (jobList: JobResponse[]) => {
    const completedJobs = jobList.filter((job) => job.status === 'completed');

    console.log(`[Library] Fetching thumbnails for ${completedJobs.length} completed jobs`);

    // Fetch thumbnails for each completed job (limit to first 20 for performance)
    const thumbnailPromises = completedJobs.slice(0, 20).map(async (job) => {
      try {
        const results = await getResults(job.job_id);
        const thumbnailUrl = results.clips[0]?.thumbnail_url || null;
        console.log(`[Library] Job ${job.job_id}: thumbnail =`, thumbnailUrl);
        return {
          job_id: job.job_id,
          thumbnail_url: thumbnailUrl,
        };
      } catch (err) {
        console.error(`[Library] Failed to fetch thumbnail for job ${job.job_id}:`, err);
        return { job_id: job.job_id, thumbnail_url: null };
      }
    });

    const thumbnails = await Promise.all(thumbnailPromises);
    console.log('[Library] All thumbnails fetched:', thumbnails);

    // Update jobs with thumbnails
    setJobs((prevJobs) => {
      const updated = prevJobs.map((job) => {
        const thumbnail = thumbnails.find((t) => t.job_id === job.job_id);
        return thumbnail ? { ...job, thumbnail_url: thumbnail.thumbnail_url } : job;
      });
      console.log('[Library] Updated jobs with thumbnails:', updated);
      return updated;
    });
  };

  const handleLectureClick = (jobId: string) => {
    navigate({ to: '/library/$lectureId', params: { lectureId: jobId } });
  };

  // Filter jobs
  let filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort jobs
  filteredJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'date-asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'title-asc':
        return a.filename.localeCompare(b.filename);
      case 'title-desc':
        return b.filename.localeCompare(a.filename);
      default:
        return 0;
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <badge.Badge className="bg-primary/10 text-primary border-0">Completed</badge.Badge>;
      case 'processing':
        return (
          <badge.Badge className="bg-blue-500/10 text-blue-500 border-0">Processing</badge.Badge>
        );
      case 'failed':
        return (
          <badge.Badge variant="destructive" className="bg-destructive/10 border-0">
            Failed
          </badge.Badge>
        );
      default:
        return null;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex flex-col p-8">
        <div className="mb-8">
          <h1 className="mb-2 font-bold">Library</h1>
          <p className="text-muted-foreground">Manage your uploaded lectures and generated clips</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your videos...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col p-8">
        <div className="mb-8">
          <h1 className="mb-2 font-bold">Library</h1>
          <p className="text-muted-foreground">Manage your uploaded lectures and generated clips</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="glass-card rounded-xl border border-border/50 p-8 max-w-md text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl mb-2">Unable to Load Videos</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => window.location.reload()} className="glass-button bg-primary">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8">
      <div className="mb-8">
        <h1 className="mb-2 font-bold">Library</h1>
        <p className="text-muted-foreground">Manage your uploaded lectures and generated clips</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search lectures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 glass-card border-border/50"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] glass-card border-border/50">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent className="glass-card border-border/50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] glass-card border-border/50">
                <SortAsc className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="glass-card border-border/50">
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="title-asc">Title A-Z</SelectItem>
                <SelectItem value="title-desc">Title Z-A</SelectItem>
                <SelectItem value="clips-desc">Most Clips</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'glass-button' : 'glass-card'}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'glass-button' : 'glass-card'}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{filteredJobs.length} videos</span>
          <span>•</span>
          <span>{filteredJobs.filter((j) => j.status === 'completed').length} completed</span>
          <span>•</span>
          <span>{filteredJobs.filter((j) => j.status === 'running').length} processing</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {filteredJobs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2">No videos found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Upload your first lecture to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button
                  className="glass-button bg-primary"
                  onClick={() => navigate({ to: '/upload' })}
                >
                  Upload Your First Video
                </Button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <div
                key={job.job_id}
                className="glass-card rounded-xl border border-border/50 overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
                onClick={() => job.status === 'completed' && handleLectureClick(job.job_id)}
              >
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {job.thumbnail_url ? (
                    <ImageWithFallback
                      src={job.thumbnail_url}
                      alt={job.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-muted-foreground text-6xl">🎬</div>
                    </div>
                  )}
                  {job.status === 'completed' && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <Play className="w-6 h-6 text-black ml-1" />
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">{getStatusBadge(job.status)}</div>
                </div>
                <div className="p-4">
                  <h3 className="mb-2 line-clamp-1">{job.filename}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(job.created_at)}</span>
                    </div>
                  </div>
                  {job.progress && job.status === 'running' && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="text-xs text-muted-foreground mb-1">
                        {job.progress.message}
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${job.progress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredJobs.map((job) => (
              <div
                key={job.job_id}
                className="glass-card rounded-lg border border-border/50 p-4 hover:shadow-md transition-all cursor-pointer"
                onClick={() => job.status === 'completed' && handleLectureClick(job.job_id)}
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {job.thumbnail_url ? (
                      <ImageWithFallback
                        src={job.thumbnail_url}
                        alt={job.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-muted-foreground text-4xl">🎬</div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-1 truncate">{job.filename}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(job.created_at)}</span>
                      </div>
                      {job.progress && job.status === 'running' && (
                        <span>{Math.round(job.progress.percent)}% complete</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(job.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:bg-accent">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Reprocess</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/library/')({
  component: LibraryPage,
});
