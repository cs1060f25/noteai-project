import { useEffect, useState } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';

import { getJobs } from '../services/uploadService';
import type { JobListResponse, JobResponse } from '../types/api';
import { AgentOutputsDetailView } from '@/components/AgentOutputsDetailView';

// ... (JobListView and helpers remain here)

interface JobListState {
  jobList: JobListResponse | null;
  loading: boolean;
  error: string | null;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'running':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'queued':
      return <Clock className="w-5 h-5 text-yellow-500" />;
    default:
      return <Clock className="w-5 h-5 text-muted-foreground" />;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'failed':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'running':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'queued':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const JobListView = () => {
  const navigate = useNavigate();
  const [jobListState, setJobListState] = useState<JobListState>({
    jobList: null,
    loading: true,
    error: null,
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getJobs(100, 0)
      .then((data) => {
        setJobListState({
          jobList: data,
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        setJobListState({
          jobList: null,
          loading: false,
          error: error.message,
        });
      });
  }, []);

  const handleJobClick = (jobId: string) => {
    navigate({ to: '/agent-outputs', search: { jobId } });
  };

  if (jobListState.loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (jobListState.error) {
    return (
      <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/10 rounded-lg">
        <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
        <p className="text-sm text-destructive">{jobListState.error}</p>
      </div>
    );
  }

  if (!jobListState.jobList || jobListState.jobList.jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Brain className="w-12 h-12 text-muted-foreground/60 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No jobs yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Upload a video to start processing and view agent outputs.
        </p>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors text-sm font-medium"
        >
          Upload Video
        </Link>
      </div>
    );
  }

  const allJobs = jobListState.jobList.jobs;

  // Filter jobs based on search query
  const filteredJobs = allJobs.filter((job) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.filename.toLowerCase().includes(query) ||
      job.job_id.toLowerCase().includes(query) ||
      job.status.toLowerCase().includes(query)
    );
  });

  const completedCount = allJobs.filter((job) => job.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search jobs by name, ID, or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-muted/30 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-muted-foreground">
          {filteredJobs.length} of {jobListState.jobList.total} job
          {jobListState.jobList.total !== 1 ? 's' : ''} · {completedCount} completed
        </p>
      </div>

      <div className="space-y-1">
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Search className="w-8 h-8 text-muted-foreground/60 mb-2" />
            <p className="text-sm text-muted-foreground">No jobs match your search</p>
          </div>
        ) : (
          filteredJobs.map((job: JobResponse) => {
            return (
              <button
                key={job.job_id}
                onClick={() => handleJobClick(job.job_id)}
                className="w-full group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left"
              >
                <div className="flex-shrink-0">{getStatusIcon(job.status)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {job.filename}
                    </h3>
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded ${getStatusColor(job.status)} flex-shrink-0`}
                    >
                      {job.status}
                    </span>
                  </div>

                  {job.error_message && (
                    <p className="text-xs text-destructive truncate mb-1">
                      Error: {job.error_message}
                    </p>
                  )}

                  {job.progress && !job.error_message && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${job.progress.percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {Math.round(job.progress.percent)}%
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">{formatDate(job.created_at)}</p>
                </div>

                <ArrowLeft className="w-4 h-4 rotate-180 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/agent-outputs')({
  component: () => {
    const { jobId } = Route.useSearch();
    return jobId ? <AgentOutputsDetailView jobId={jobId} /> : <JobListView />;
  },
  validateSearch: (search: Record<string, unknown>): { jobId?: string } => {
    return {
      jobId: (search.jobId as string) || undefined,
    };
  },
});
