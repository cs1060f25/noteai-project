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
  Scissors,
  Search,
  Sparkles,
  VolumeX,
  XCircle,
} from 'lucide-react';

import {
  getClips,
  getContentSegments,
  getSilenceRegions,
  getTranscripts,
} from '../services/agentOutputsService';
import { getJobStatus, getJobs } from '../services/uploadService';

import type {
  Clip,
  ClipsResponse,
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
  clips: ClipsResponse | null;
  loading: {
    transcripts: boolean;
    silenceRegions: boolean;
    contentSegments: boolean;
    clips: boolean;
  };
  errors: {
    transcripts: string | null;
    silenceRegions: string | null;
    contentSegments: string | null;
    clips: string | null;
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
          {filteredJobs.length} of {jobListState.jobList.total} job{jobListState.jobList.total !== 1 ? 's' : ''} ·{' '}
          {completedCount} completed
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
                  <p className="text-xs text-destructive truncate mb-1">Error: {job.error_message}</p>
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

const AgentOutputsDetailView = ({ jobId }: { jobId: string }) => {
  const navigate = useNavigate();
  const [jobInfo, setJobInfo] = useState<JobResponse | null>(null);
  const [state, setState] = useState<AgentOutputsState>({
    transcripts: null,
    silenceRegions: null,
    contentSegments: null,
    clips: null,
    loading: {
      transcripts: true,
      silenceRegions: true,
      contentSegments: true,
      clips: true,
    },
    errors: {
      transcripts: null,
      silenceRegions: null,
      contentSegments: null,
      clips: null,
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

    // fetch clips
    getClips(jobId)
      .then((data) => {
        setState((prev) => ({
          ...prev,
          clips: data,
          loading: { ...prev.loading, clips: false },
        }));
      })
      .catch((error) => {
        const errorMessage =
          error.statusCode === 400
            ? 'Not available yet - segment extraction may still be in progress'
            : error.message;
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, clips: false },
          errors: { ...prev.errors, clips: errorMessage },
        }));
      });
  }, [jobId]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* back button */}
      <button
        onClick={() => navigate({ to: '/agent-outputs' })}
        className="inline-flex items-center gap-1.5 px-2 py-1 -mx-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* job id header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground font-mono">
          {jobId}
        </div>
        {jobInfo && <h1 className="text-3xl font-semibold text-foreground">{jobInfo.filename}</h1>}

        {/* search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search in outputs..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/30 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* warning for non-completed jobs */}
      {jobInfo && jobInfo.status !== 'completed' && (
        <div className="flex items-start gap-3 px-4 py-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-600 mb-1">Processing in progress</p>
            <p className="text-xs text-yellow-600/80">
              This job is still processing (status: {jobInfo.status}). Some outputs may not be
              available yet.
            </p>
            {jobInfo.progress && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-yellow-500/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all"
                    style={{ width: `${jobInfo.progress.percent}%` }}
                  />
                </div>
                <span className="text-xs text-yellow-600 flex-shrink-0">
                  {Math.round(jobInfo.progress.percent)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* silence regions section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <VolumeX className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Silence Regions</h2>
          {state.loading.silenceRegions && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {state.errors.silenceRegions ? (
          <div className="flex items-start gap-2 px-3 py-2 bg-destructive/5 border border-destructive/10 rounded-md">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{state.errors.silenceRegions}</p>
          </div>
        ) : state.silenceRegions ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground px-1">
              {state.silenceRegions.total} region{state.silenceRegions.total !== 1 ? 's' : ''}
            </p>
            <div className="space-y-1.5">
              {state.silenceRegions.regions.map((region: SilenceRegion) => (
                <div
                  key={region.region_id}
                  className="px-3 py-2.5 hover:bg-accent rounded-md transition-colors border border-border/50"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-foreground">
                      {formatTime(region.start_time)} → {formatTime(region.end_time)}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                      {region.silence_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Duration: {region.duration.toFixed(2)}s
                    {region.amplitude_threshold &&
                      ` · ${region.amplitude_threshold.toFixed(2)} dBFS`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !state.loading.silenceRegions && (
            <p className="text-sm text-muted-foreground px-1">No silence regions available</p>
          )
        )}
      </div>

      {/* transcripts section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Transcripts</h2>
          {state.loading.transcripts && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {state.errors.transcripts ? (
          <div className="flex items-start gap-2 px-3 py-2 bg-destructive/5 border border-destructive/10 rounded-md">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{state.errors.transcripts}</p>
          </div>
        ) : state.transcripts ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground px-1">
              {state.transcripts.total} segment{state.transcripts.total !== 1 ? 's' : ''}
            </p>
            <div className="space-y-1.5">
              {state.transcripts.segments.map((segment: TranscriptSegment, idx: number) => (
                <div
                  key={idx}
                  className="px-3 py-2.5 hover:bg-accent rounded-md transition-colors border border-border/50"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatTime(segment.start_time)} → {formatTime(segment.end_time)}
                    </span>
                    {segment.confidence && (
                      <span className="text-xs text-muted-foreground/70">
                        {Math.round(segment.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{segment.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !state.loading.transcripts && (
            <p className="text-sm text-muted-foreground px-1">No transcripts available</p>
          )
        )}
      </div>

      {/* content segments section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Brain className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Content Segments</h2>
          {state.loading.contentSegments && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {state.errors.contentSegments ? (
          <div className="flex items-start gap-2 px-3 py-2 bg-destructive/5 border border-destructive/10 rounded-md">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{state.errors.contentSegments}</p>
          </div>
        ) : state.contentSegments ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground px-1">
              {state.contentSegments.total} segment{state.contentSegments.total !== 1 ? 's' : ''}
            </p>
            <div className="space-y-3">
              {state.contentSegments.segments.map((segment: ContentSegment) => (
                <div
                  key={segment.segment_id}
                  className="px-4 py-3 hover:bg-accent rounded-md transition-colors border border-border/50 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-base font-semibold text-foreground">{segment.topic}</h3>
                      </div>
                      {segment.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {segment.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="text-xs font-medium text-foreground">
                        {Math.round(segment.importance_score * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">
                      {formatTime(segment.start_time)} → {formatTime(segment.end_time)}
                    </span>
                    <span>·</span>
                    <span>{segment.duration.toFixed(2)}s</span>
                  </div>

                  {(segment.keywords.length > 0 || segment.concepts.length > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                      {segment.keywords.map((keyword: string, idx: number) => (
                        <span
                          key={`kw-${idx}`}
                          className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
                        >
                          {keyword}
                        </span>
                      ))}
                      {segment.concepts.map((concept: string, idx: number) => (
                        <span
                          key={`c-${idx}`}
                          className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          !state.loading.contentSegments && (
            <p className="text-sm text-muted-foreground px-1">No content segments available</p>
          )
        )}
      </div>

      {/* clips section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Scissors className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Extracted Clips</h2>
          {state.loading.clips && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {state.errors.clips ? (
          <div className="flex items-start gap-2 px-3 py-2 bg-destructive/5 border border-destructive/10 rounded-md">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{state.errors.clips}</p>
          </div>
        ) : state.clips ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground px-1">
              {state.clips.total} clip{state.clips.total !== 1 ? 's' : ''} · Selected by segment
              extraction agent
            </p>
            <div className="space-y-3">
              {state.clips.clips.map((clip: Clip) => (
                <div
                  key={clip.clip_id}
                  className="px-4 py-3 hover:bg-accent rounded-md transition-colors border border-border/50 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-base font-semibold text-foreground">{clip.title}</h3>
                        {clip.clip_order && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-muted text-muted-foreground">
                            #{clip.clip_order}
                          </span>
                        )}
                      </div>
                      {clip.topic && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{clip.topic}</p>
                      )}
                    </div>
                    {clip.importance_score !== undefined && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-xs font-medium text-foreground">
                          {Math.round(clip.importance_score * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">
                      {formatTime(clip.start_time)} → {formatTime(clip.end_time)}
                    </span>
                    <span>·</span>
                    <span>{clip.duration.toFixed(2)}s</span>
                  </div>

                  {clip.extra_metadata?.optimization && (
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {clip.extra_metadata.optimization.start_adjusted && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          Start optimized (
                          {clip.extra_metadata.optimization.start_adjustment_seconds > 0 ? '+' : ''}
                          {clip.extra_metadata.optimization.start_adjustment_seconds}s)
                        </span>
                      )}
                      {clip.extra_metadata.optimization.end_adjusted && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          End optimized (
                          {clip.extra_metadata.optimization.end_adjustment_seconds > 0 ? '+' : ''}
                          {clip.extra_metadata.optimization.end_adjustment_seconds}s)
                        </span>
                      )}
                      {clip.extra_metadata.quality_assessment?.duration_fit && (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                          {clip.extra_metadata.quality_assessment.duration_fit} duration
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          !state.loading.clips && (
            <p className="text-sm text-muted-foreground px-1">No clips available</p>
          )
        )}
      </div>
    </div>
  );
};

const AgentOutputsComponent = () => {
  const { jobId } = Route.useSearch();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {!jobId && (
        <div className="space-y-1 mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Agent Outputs</h1>
          <p className="text-sm text-muted-foreground">
            Select a job to view detailed processing results from AI agents
          </p>
        </div>
      )}

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
