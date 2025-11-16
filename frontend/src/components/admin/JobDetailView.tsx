import { useEffect, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  Download,
  Layout,
  Loader2,
  MessageSquare,
  Play,
  Scissors,
  Sparkles,
  Timer,
  VolumeX,
} from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getProcessingLogs } from '@/services/adminService';
import {
  getClips,
  getContentSegments,
  getLayoutAnalysis,
  getSilenceRegions,
  getTranscripts,
} from '@/services/agentOutputsService';
import { getResults } from '@/services/resultsService';
import { getJobStatus } from '@/services/uploadService';
import type { ProcessingLog } from '@/types/admin';
import type {
  Clip,
  ClipsResponse,
  ContentSegment,
  ContentSegmentsResponse,
  JobResponse,
  LayoutAnalysis,
  ResultsResponse,
  SilenceRegion,
  SilenceRegionsResponse,
  TranscriptSegment,
  TranscriptsResponse,
} from '@/types/api';

interface AgentOutputsState {
  transcripts: TranscriptsResponse | null;
  silenceRegions: SilenceRegionsResponse | null;
  contentSegments: ContentSegmentsResponse | null;
  clips: ClipsResponse | null;
  layoutAnalysis: LayoutAnalysis | null;
  processingLogs: ProcessingLog[];
  results: ResultsResponse | null;
  loading: {
    transcripts: boolean;
    silenceRegions: boolean;
    contentSegments: boolean;
    clips: boolean;
    layoutAnalysis: boolean;
    processingLogs: boolean;
    results: boolean;
  };
  errors: {
    transcripts: string | null;
    silenceRegions: string | null;
    contentSegments: string | null;
    clips: string | null;
    layoutAnalysis: string | null;
    processingLogs: string | null;
    results: string | null;
  };
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDuration = (seconds: number): string => {
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  }
  return `${seconds.toFixed(1)}s`;
};

// helper to calculate agent execution time from timestamp pairs
const getAgentDuration = (logs: ProcessingLog[], agentName: string): number | null => {
  const startedLog = logs.find((l) => l.agent_name === agentName && l.status === 'started');
  const completedLog = logs.find((l) => l.agent_name === agentName && l.status === 'completed');

  if (startedLog && completedLog) {
    const startTime = new Date(startedLog.created_at).getTime();
    const endTime = new Date(completedLog.created_at).getTime();
    return (endTime - startTime) / 1000; // convert to seconds
  }

  return null;
};

interface JobDetailViewProps {
  jobId: string;
}

export const JobDetailView = ({ jobId }: JobDetailViewProps) => {
  const navigate = useNavigate({ from: '/admin/jobs' });
  const [jobInfo, setJobInfo] = useState<JobResponse | null>(null);
  const [state, setState] = useState<AgentOutputsState>({
    transcripts: null,
    silenceRegions: null,
    contentSegments: null,
    clips: null,
    layoutAnalysis: null,
    processingLogs: [],
    results: null,
    loading: {
      transcripts: true,
      silenceRegions: true,
      contentSegments: true,
      clips: true,
      layoutAnalysis: true,
      processingLogs: true,
      results: true,
    },
    errors: {
      transcripts: null,
      silenceRegions: null,
      contentSegments: null,
      clips: null,
      layoutAnalysis: null,
      processingLogs: null,
      results: null,
    },
  });

  useEffect(() => {
    // fetch job info
    getJobStatus(jobId)
      .then((data) => setJobInfo(data))
      .catch((error) => console.error('Failed to fetch job info:', error));

    // fetch processing logs first (needed for timing info)
    getProcessingLogs({ job_id: jobId, limit: 100 })
      .then((data) => {
        setState((prev) => ({
          ...prev,
          processingLogs: data.logs,
          loading: { ...prev.loading, processingLogs: false },
        }));
      })
      .catch((error) => {
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, processingLogs: false },
          errors: { ...prev.errors, processingLogs: error.message },
        }));
      });

    // fetch results for video URLs
    getResults(jobId)
      .then((data) => {
        setState((prev) => ({
          ...prev,
          results: data,
          loading: { ...prev.loading, results: false },
        }));
      })
      .catch((error) => {
        const errorMessage =
          error.statusCode === 400
            ? 'Not available yet - job may still be processing'
            : error.message;
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, results: false },
          errors: { ...prev.errors, results: errorMessage },
        }));
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
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, transcripts: false },
          errors: { ...prev.errors, transcripts: error.message },
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
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, silenceRegions: false },
          errors: { ...prev.errors, silenceRegions: error.message },
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
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, contentSegments: false },
          errors: { ...prev.errors, contentSegments: error.message },
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
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, clips: false },
          errors: { ...prev.errors, clips: error.message },
        }));
      });

    // fetch layout analysis
    getLayoutAnalysis(jobId)
      .then((data) => {
        setState((prev) => ({
          ...prev,
          layoutAnalysis: data,
          loading: { ...prev.loading, layoutAnalysis: false },
        }));
      })
      .catch((error) => {
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, layoutAnalysis: false },
          errors: { ...prev.errors, layoutAnalysis: error.message },
        }));
      });
  }, [jobId]);

  const transcriptDuration = getAgentDuration(state.processingLogs, 'TranscriptAgent');
  const silenceDuration = getAgentDuration(state.processingLogs, 'SilenceDetector');
  const layoutDuration = getAgentDuration(state.processingLogs, 'LayoutDetector');
  const contentDuration = getAgentDuration(state.processingLogs, 'ContentAnalyzer');
  const extractorDuration = getAgentDuration(state.processingLogs, 'SegmentExtractor');

  return (
    <div className="max-w-[80%] mx-auto space-y-8">
      {/* back button */}
      <button
        onClick={() => navigate({ to: '/admin/jobs' })}
        className="inline-flex items-center gap-1.5 px-2 py-1 -mx-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Jobs</span>
      </button>

      {/* job header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground font-mono">
          {jobId}
        </div>
        {jobInfo && <h1 className="text-3xl font-semibold text-foreground">{jobInfo.filename}</h1>}
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

      {/* video download section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Play className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Highlight Video</h2>
          {state.loading.results && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {state.errors.results ? (
          <div className="flex items-start gap-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-md">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">{state.errors.results}</p>
          </div>
        ) : state.results?.metadata?.highlight_video ? (
          <div className="px-4 py-3 border border-border/50 rounded-md">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Compiled highlight video ready
                </p>
                <p className="text-xs text-muted-foreground">
                  All selected clips compiled into a single video
                </p>
              </div>
              <a
                href={state.results.metadata.highlight_video.url}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download Video
              </a>
            </div>
          </div>
        ) : (
          !state.loading.results && (
            <div className="flex items-start gap-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-md">
              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                No highlight video available yet - compilation may still be in progress
              </p>
            </div>
          )
        )}
      </div>

      {/* agent outputs accordion */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Brain className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Agent Outputs</h2>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {/* layout analysis */}
          <AccordionItem value="layout" className="border border-border/50 rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Layout Analysis</span>
                  {state.loading.layoutAnalysis && (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                {layoutDuration && (
                  <span className="text-xs text-muted-foreground mr-2">
                    {formatDuration(layoutDuration)}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-3 pb-4">
              {state.errors.layoutAnalysis ? (
                <p className="text-sm text-muted-foreground">{state.errors.layoutAnalysis}</p>
              ) : state.layoutAnalysis ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-sm font-medium rounded bg-primary/10 text-primary border border-primary/20">
                      {state.layoutAnalysis.layout_type.replace(/_/g, ' ')}
                    </span>
                    {state.layoutAnalysis.confidence_score > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(state.layoutAnalysis.confidence_score * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {state.layoutAnalysis.screen_region.width > 0 && (
                      <div className="px-2 py-1.5 rounded bg-muted/50">
                        <p className="font-medium text-foreground mb-0.5">Screen Region</p>
                        <p className="text-muted-foreground">
                          {state.layoutAnalysis.screen_region.width}×
                          {state.layoutAnalysis.screen_region.height}
                        </p>
                      </div>
                    )}
                    {state.layoutAnalysis.camera_region.width > 0 && (
                      <div className="px-2 py-1.5 rounded bg-muted/50">
                        <p className="font-medium text-foreground mb-0.5">Camera Region</p>
                        <p className="text-muted-foreground">
                          {state.layoutAnalysis.camera_region.width}×
                          {state.layoutAnalysis.camera_region.height}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                !state.loading.layoutAnalysis && (
                  <p className="text-sm text-muted-foreground">No layout analysis available</p>
                )
              )}
            </AccordionContent>
          </AccordionItem>

          {/* silence regions */}
          <AccordionItem value="silence" className="border border-border/50 rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-2">
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Silence Regions
                    {state.silenceRegions && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({state.silenceRegions.total})
                      </span>
                    )}
                  </span>
                  {state.loading.silenceRegions && (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                {silenceDuration && (
                  <span className="text-xs text-muted-foreground mr-2">
                    {formatDuration(silenceDuration)}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-3 pb-4">
              {state.errors.silenceRegions ? (
                <p className="text-sm text-destructive">{state.errors.silenceRegions}</p>
              ) : state.silenceRegions ? (
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {state.silenceRegions.regions.map((region: SilenceRegion) => (
                    <div
                      key={region.region_id}
                      className="px-3 py-2 rounded-md border border-border/50 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">
                          {formatTime(region.start_time)} → {formatTime(region.end_time)}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                          {region.silence_type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Duration: {region.duration.toFixed(2)}s
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                !state.loading.silenceRegions && (
                  <p className="text-sm text-muted-foreground">No silence regions available</p>
                )
              )}
            </AccordionContent>
          </AccordionItem>

          {/* transcripts */}
          <AccordionItem value="transcripts" className="border border-border/50 rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Transcripts
                    {state.transcripts && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({state.transcripts.total})
                      </span>
                    )}
                  </span>
                  {state.loading.transcripts && (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                {transcriptDuration && (
                  <span className="text-xs text-muted-foreground mr-2">
                    {formatDuration(transcriptDuration)}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-3 pb-4">
              {state.errors.transcripts ? (
                <p className="text-sm text-destructive">{state.errors.transcripts}</p>
              ) : state.transcripts ? (
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {state.transcripts.segments.map((segment: TranscriptSegment, idx: number) => (
                    <div
                      key={idx}
                      className="px-3 py-2 rounded-md border border-border/50 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
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
              ) : (
                !state.loading.transcripts && (
                  <p className="text-sm text-muted-foreground">No transcripts available</p>
                )
              )}
            </AccordionContent>
          </AccordionItem>

          {/* content segments */}
          <AccordionItem value="content" className="border border-border/50 rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Content Analysis
                    {state.contentSegments && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({state.contentSegments.total})
                      </span>
                    )}
                  </span>
                  {state.loading.contentSegments && (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                {contentDuration && (
                  <span className="text-xs text-muted-foreground mr-2">
                    {formatDuration(contentDuration)}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-3 pb-4">
              {state.errors.contentSegments ? (
                <p className="text-sm text-destructive">{state.errors.contentSegments}</p>
              ) : state.contentSegments ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {state.contentSegments.segments.map((segment: ContentSegment) => (
                    <div
                      key={segment.segment_id}
                      className="px-3 py-3 rounded-md border border-border/50 hover:bg-accent transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-foreground">{segment.topic}</h3>
                          {segment.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {segment.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Sparkles className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs font-medium">
                            {Math.round(segment.importance_score * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(segment.start_time)} → {formatTime(segment.end_time)} ·{' '}
                        {segment.duration.toFixed(1)}s
                      </div>
                      {(segment.keywords.length > 0 || segment.concepts.length > 0) && (
                        <div className="flex flex-wrap gap-1">
                          {segment.keywords.map((keyword: string, idx: number) => (
                            <span
                              key={`kw-${idx}`}
                              className="px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                !state.loading.contentSegments && (
                  <p className="text-sm text-muted-foreground">No content segments available</p>
                )
              )}
            </AccordionContent>
          </AccordionItem>

          {/* extracted clips */}
          <AccordionItem value="clips" className="border border-border/50 rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Extracted Clips
                    {state.clips && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({state.clips.total})
                      </span>
                    )}
                  </span>
                  {state.loading.clips && (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                {extractorDuration && (
                  <span className="text-xs text-muted-foreground mr-2">
                    {formatDuration(extractorDuration)}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-3 pb-4">
              {state.errors.clips ? (
                <p className="text-sm text-destructive">{state.errors.clips}</p>
              ) : state.clips ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {state.clips.clips.map((clip: Clip) => (
                    <div
                      key={clip.clip_id}
                      className="px-3 py-3 rounded-md border border-border/50 hover:bg-accent transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">{clip.title}</h3>
                            {clip.clip_order && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-muted text-muted-foreground">
                                #{clip.clip_order}
                              </span>
                            )}
                          </div>
                          {clip.topic && (
                            <p className="text-xs text-muted-foreground mt-1">{clip.topic}</p>
                          )}
                        </div>
                        {clip.importance_score !== undefined && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Sparkles className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs font-medium">
                              {Math.round(clip.importance_score * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(clip.start_time)} → {formatTime(clip.end_time)} ·{' '}
                        {clip.duration.toFixed(1)}s
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !state.loading.clips && (
                  <p className="text-sm text-muted-foreground">No clips available</p>
                )
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* processing time summary */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Timer className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Processing Summary</h2>
        </div>

        {state.processingLogs.length > 0 ? (
          <div className="space-y-2">
            {/* queue time - from job creation to first agent starting */}
            {jobInfo && jobInfo.created_at && state.processingLogs.length > 0 && (
              <div className="px-3 py-2 border border-border/50 rounded-md bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">Queue Time</span>
                    <span className="text-xs text-muted-foreground">
                      Job creation to processing start
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {(() => {
                      const createdAt = new Date(jobInfo.created_at).getTime();
                      const startedLogs = state.processingLogs
                        .filter((log) => log.created_at && log.status === 'started')
                        .sort(
                          (a, b) =>
                            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        );
                      if (startedLogs.length > 0) {
                        const firstStartedLog = startedLogs[0];
                        const firstAgentStartTime = new Date(firstStartedLog.created_at).getTime();
                        const queueSeconds = (firstAgentStartTime - createdAt) / 1000;
                        return queueSeconds > 0 ? formatDuration(queueSeconds) : '< 1s';
                      }
                      return '-';
                    })()}
                  </span>
                </div>
              </div>
            )}

            {/* individual agent times - calculate from timestamp pairs */}
            {(() => {
              // group logs by agent_name to find started/completed pairs
              const agentDurations: Array<{
                agentName: string;
                duration: number;
                startTime: number;
              }> = [];
              const agentNames = new Set(
                state.processingLogs.filter((log) => log.agent_name).map((log) => log.agent_name!)
              );

              agentNames.forEach((agentName) => {
                const startedLog = state.processingLogs.find(
                  (l) => l.agent_name === agentName && l.status === 'started'
                );
                const completedLog = state.processingLogs.find(
                  (l) => l.agent_name === agentName && l.status === 'completed'
                );

                if (startedLog && completedLog) {
                  const startTime = new Date(startedLog.created_at).getTime();
                  const endTime = new Date(completedLog.created_at).getTime();
                  const durationSeconds = (endTime - startTime) / 1000;

                  agentDurations.push({
                    agentName,
                    duration: durationSeconds,
                    startTime,
                  });
                }
              });

              // sort by start time to show in execution order
              agentDurations.sort((a, b) => a.startTime - b.startTime);

              return agentDurations.map(({ agentName, duration }) => (
                <div key={agentName} className="px-3 py-2 border border-border/50 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{agentName}</span>
                    <span className="text-sm font-medium">{formatDuration(duration)}</span>
                  </div>
                </div>
              ));
            })()}

            {/* total processing time */}
            <div className="px-3 py-2.5 bg-primary/10 border border-primary/20 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Total Pipeline Time</span>
                <span className="text-sm font-bold text-primary">
                  {(() => {
                    // calculate total from timestamp pairs
                    const agentNames = new Set(
                      state.processingLogs
                        .filter((log) => log.agent_name)
                        .map((log) => log.agent_name!)
                    );

                    let totalSeconds = 0;
                    agentNames.forEach((agentName) => {
                      const startedLog = state.processingLogs.find(
                        (l) => l.agent_name === agentName && l.status === 'started'
                      );
                      const completedLog = state.processingLogs.find(
                        (l) => l.agent_name === agentName && l.status === 'completed'
                      );

                      if (startedLog && completedLog) {
                        const startTime = new Date(startedLog.created_at).getTime();
                        const endTime = new Date(completedLog.created_at).getTime();
                        totalSeconds += (endTime - startTime) / 1000;
                      }
                    });

                    return formatDuration(totalSeconds);
                  })()}
                </span>
              </div>
            </div>

            {/* total time including upload */}
            {jobInfo && jobInfo.created_at && jobInfo.completed_at && (
              <div className="px-3 py-2.5 bg-muted/50 border border-border rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    Total Time (Upload to Completion)
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {(() => {
                      const startTime = new Date(jobInfo.created_at).getTime();
                      const endTime = new Date(jobInfo.completed_at).getTime();
                      const totalSeconds = (endTime - startTime) / 1000;
                      return formatDuration(totalSeconds);
                    })()}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground px-1">No processing summary available</p>
        )}
      </div>
    </div>
  );
};
