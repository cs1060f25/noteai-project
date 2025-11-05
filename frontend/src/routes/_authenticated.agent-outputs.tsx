import { useEffect, useState } from 'react';

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
  VolumeX,
  XCircle,
} from 'lucide-react';

import {
  getContentSegments,
  getSilenceRegions,
  getTranscripts,
} from '../services/agentOutputsService';
import { getJobStatus, getJobs } from '../services/uploadService';

import type {
  ContentSegment,
  ContentSegmentsResponse,
  JobListResponse,
  JobResponse,
  SilenceRegion,
  SilenceRegionsResponse,
  TranscriptSegment,
  TranscriptsResponse,
} from '../types/api';

interface AgentOutputsState {
  transcripts: TranscriptsResponse | null;
  silenceRegions: SilenceRegionsResponse | null;
  contentSegments: ContentSegmentsResponse | null;
  loading: {
    transcripts: boolean;
    silenceRegions: boolean;
    contentSegments: boolean;
  };
  errors: {
    transcripts: string | null;
    silenceRegions: string | null;
    contentSegments: string | null;
  };
}

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
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (jobListState.error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <p className="fluent-body text-sm text-red-500">{jobListState.error}</p>
      </div>
    );
  }

  if (!jobListState.jobList || jobListState.jobList.jobs.length === 0) {
    return (
      <div className="fluent-layer-2 p-8 rounded-xl text-center fluent-reveal">
        <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="fluent-subtitle text-xl text-foreground mb-2">No Jobs Found</h3>
        <p className="fluent-body text-muted-foreground mb-6">
          Upload a video to start processing and view agent outputs.
        </p>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors fluent-focus"
        >
          Upload Video
        </Link>
      </div>
    );
  }

  const allJobs = jobListState.jobList.jobs;
  const completedCount = allJobs.filter((job) => job.status === 'completed').length;

  return (
    <div className="space-y-4">
      <p className="fluent-body text-muted-foreground mb-4">
        Showing {jobListState.jobList.total} job{jobListState.jobList.total !== 1 ? 's' : ''} (
        {completedCount} completed)
      </p>

      <div className="grid gap-4">
        {allJobs.map((job: JobResponse) => {
          const canViewOutputs = true; // allow viewing outputs for all jobs

          return (
            <button
              key={job.job_id}
              onClick={() => handleJobClick(job.job_id)}
              className="fluent-layer-2 p-6 rounded-xl fluent-reveal hover:bg-accent/50 transition-colors text-left w-full group cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(job.status)}
                    <h3
                      className={`fluent-subtitle text-lg text-foreground ${
                        canViewOutputs ? 'group-hover:text-primary transition-colors' : ''
                      }`}
                    >
                      {job.filename}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded border ${getStatusColor(job.status)}`}
                    >
                      {job.status}
                    </span>
                  </div>

                  {job.error_message && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-2">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="fluent-body text-sm text-red-500 font-medium mb-1">Error:</p>
                        <p className="fluent-body text-xs text-red-500">{job.error_message}</p>
                      </div>
                    </div>
                  )}

                  {job.progress && (
                    <div className="mb-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="fluent-body text-xs text-blue-500 font-medium">
                          {job.progress.message}
                        </p>
                        <span className="fluent-caption text-xs text-blue-500">
                          {Math.round(job.progress.percent)}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-500/20 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${job.progress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 fluent-caption text-xs">
                    <span>Created: {formatDate(job.created_at)}</span>
                    <span>Updated: {formatDate(job.updated_at)}</span>
                  </div>
                  <p className="fluent-caption text-xs mt-1 text-muted-foreground">
                    Job ID: {job.job_id}
                  </p>
                </div>
                <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const AgentOutputsDetailView = ({ jobId }: { jobId: string }) => {
  const navigate = useNavigate();
  const [jobInfo, setJobInfo] = useState<JobResponse | null>(null);
  const [state, setState] = useState<AgentOutputsState>({
    transcripts: null,
    silenceRegions: null,
    contentSegments: null,
    loading: {
      transcripts: true,
      silenceRegions: true,
      contentSegments: true,
    },
    errors: {
      transcripts: null,
      silenceRegions: null,
      contentSegments: null,
    },
  });

  useEffect(() => {
    // fetch job info for status warning
    getJobStatus(jobId)
      .then((data) => {
        setJobInfo(data);
      })
      .catch((error) => {
        console.error('Failed to fetch job info:', error);
      });

    // fetch transcripts
    getTranscripts(jobId)
      .then((data) => {
        setState((prev) => ({
          ...prev,
          transcripts: data,
          loading: { ...prev.loading, transcripts: false },
        }));
      })
      .catch((error) => {
        const errorMessage =
          error.statusCode === 400
            ? 'Not available yet - transcription may still be in progress'
            : error.message;
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, transcripts: false },
          errors: { ...prev.errors, transcripts: errorMessage },
        }));
      });

    // fetch silence regions
    getSilenceRegions(jobId)
      .then((data) => {
        setState((prev) => ({
          ...prev,
          silenceRegions: data,
          loading: { ...prev.loading, silenceRegions: false },
        }));
      })
      .catch((error) => {
        const errorMessage =
          error.statusCode === 400
            ? 'Not available yet - silence detection may still be in progress'
            : error.message;
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, silenceRegions: false },
          errors: { ...prev.errors, silenceRegions: errorMessage },
        }));
      });

    // fetch content segments
    getContentSegments(jobId)
      .then((data) => {
        setState((prev) => ({
          ...prev,
          contentSegments: data,
          loading: { ...prev.loading, contentSegments: false },
        }));
      })
      .catch((error) => {
        const errorMessage =
          error.statusCode === 400
            ? 'Not available yet - content analysis may still be in progress'
            : error.message;
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, contentSegments: false },
          errors: { ...prev.errors, contentSegments: errorMessage },
        }));
      });
  }, [jobId]);

  return (
    <div className="space-y-8">
      {/* back button */}
      <button
        onClick={() => navigate({ to: '/agent-outputs' })}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors fluent-focus"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="fluent-body text-sm">Back to jobs list</span>
      </button>

      {/* job id header */}
      <div className="fluent-layer-2 p-4 rounded-xl">
        <p className="fluent-caption text-xs text-muted-foreground mb-1">Viewing outputs for:</p>
        <p className="fluent-body text-sm font-mono">{jobId}</p>
      </div>

      {/* warning for non-completed jobs */}
      {jobInfo && jobInfo.status !== 'completed' && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="fluent-body text-sm text-yellow-500 font-medium mb-1">Job In Progress</p>
            <p className="fluent-body text-xs text-yellow-500">
              This job is still processing (status: {jobInfo.status}). Some agent outputs may not be
              available yet. Data shown below is what has been generated so far.
            </p>
            {jobInfo.progress && (
              <p className="fluent-caption text-xs text-yellow-500 mt-2">
                Current stage: {jobInfo.progress.message} ({Math.round(jobInfo.progress.percent)}%)
              </p>
            )}
          </div>
        </div>
      )}

      {/* silence regions section */}
      <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal">
        <div className="flex items-center gap-3 mb-4">
          <VolumeX className="w-5 h-5 text-primary" />
          <h2 className="fluent-subtitle text-xl text-foreground">Silence Regions</h2>
          {state.loading.silenceRegions && (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          )}
        </div>

        {state.errors.silenceRegions ? (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="fluent-body text-sm text-red-500">{state.errors.silenceRegions}</p>
          </div>
        ) : state.silenceRegions ? (
          <div className="space-y-3">
            <p className="fluent-caption mb-3">Total regions: {state.silenceRegions.total}</p>
            {state.silenceRegions.regions.map((region: SilenceRegion) => (
              <div key={region.region_id} className="p-3 bg-accent/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="fluent-caption text-xs text-primary">
                    {formatTime(region.start_time)} - {formatTime(region.end_time)}
                  </span>
                  <span className="px-2 py-1 text-xs rounded bg-primary/20 text-primary">
                    {region.silence_type.replace('_', ' ')}
                  </span>
                </div>
                <p className="fluent-body text-sm text-muted-foreground">
                  Duration: {region.duration.toFixed(2)}s
                </p>
                {region.amplitude_threshold && (
                  <p className="fluent-caption text-xs text-muted-foreground">
                    Amplitude threshold: {region.amplitude_threshold.toFixed(2)} dBFS
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          !state.loading.silenceRegions && (
            <p className="fluent-body text-muted-foreground">No silence regions available</p>
          )
        )}
      </div>

      {/* transcripts section */}
      <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="fluent-subtitle text-xl text-foreground">Transcripts</h2>
          {state.loading.transcripts && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        </div>

        {state.errors.transcripts ? (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="fluent-body text-sm text-red-500">{state.errors.transcripts}</p>
          </div>
        ) : state.transcripts ? (
          <div className="space-y-3">
            <p className="fluent-caption mb-3">Total segments: {state.transcripts.total}</p>
            {state.transcripts.segments.map((segment: TranscriptSegment, idx: number) => (
              <div key={idx} className="p-3 bg-accent/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="fluent-caption text-xs text-primary">
                    {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                  </span>
                  {segment.confidence && (
                    <span className="fluent-caption text-xs text-muted-foreground">
                      ({Math.round(segment.confidence * 100)}% confidence)
                    </span>
                  )}
                </div>
                <p className="fluent-body text-sm text-foreground">{segment.text}</p>
              </div>
            ))}
          </div>
        ) : (
          !state.loading.transcripts && (
            <p className="fluent-body text-muted-foreground">No transcripts available</p>
          )
        )}
      </div>

      {/* content segments section */}
      <div className="fluent-layer-2 p-6 rounded-xl fluent-reveal">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="fluent-subtitle text-xl text-foreground">Content Segments</h2>
          {state.loading.contentSegments && (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          )}
        </div>

        {state.errors.contentSegments ? (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="fluent-body text-sm text-red-500">{state.errors.contentSegments}</p>
          </div>
        ) : state.contentSegments ? (
          <div className="space-y-4">
            <p className="fluent-caption mb-3">Total segments: {state.contentSegments.total}</p>
            {state.contentSegments.segments.map((segment: ContentSegment) => (
              <div key={segment.segment_id} className="p-4 bg-accent/30 rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="fluent-subtitle text-base text-foreground">{segment.topic}</h3>
                    </div>
                    {segment.description && (
                      <p className="fluent-body text-sm text-muted-foreground mb-2">
                        {segment.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span className="fluent-body text-sm font-medium">
                      {Math.round(segment.importance_score * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="fluent-caption text-xs text-primary">
                    {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                  </span>
                  <span className="fluent-caption text-xs text-muted-foreground">
                    ({segment.duration.toFixed(2)}s)
                  </span>
                </div>

                {segment.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {segment.keywords.map((keyword: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs rounded bg-primary/10 text-primary border border-primary/20"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}

                {segment.concepts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {segment.concepts.map((concept: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs rounded bg-accent/50 text-foreground border border-border"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          !state.loading.contentSegments && (
            <p className="fluent-body text-muted-foreground">No content segments available</p>
          )
        )}
      </div>
    </div>
  );
};

const AgentOutputsComponent = () => {
  const { jobId } = Route.useSearch();

  return (
    <div className="space-y-8">
      {/* page header */}
      <div>
        <h1 className="fluent-title text-3xl text-foreground mb-2">Agent Outputs</h1>
        <p className="fluent-body text-muted-foreground">
          {jobId
            ? 'Detailed processing results from AI agents'
            : 'Select a completed job to view detailed processing results'}
        </p>
      </div>

      {/* content */}
      {jobId ? <AgentOutputsDetailView jobId={jobId} /> : <JobListView />}
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/agent-outputs')({
  component: AgentOutputsComponent,
  validateSearch: (search: Record<string, unknown>): { jobId?: string } => {
    return {
      jobId: typeof search.jobId === 'string' ? search.jobId : undefined,
    };
  },
});
