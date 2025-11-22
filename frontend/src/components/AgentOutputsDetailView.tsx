import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
    AlertCircle,
    ArrowLeft,
    Download,
    Layout,
    Loader2,
    Play,
    Timer,
} from 'lucide-react';

import { getProcessingLogs } from '../services/adminService';
import {
    getClips,
    getContentSegments,
    getLayoutAnalysis,
    getSilenceRegions,
    getTranscripts,
} from '../services/agentOutputsService';
import { getResults } from '../services/resultsService';
import { getJobStatus } from '../services/uploadService';

import type { ProcessingLog } from '../types/admin';
import type {
    ClipsResponse,
    ContentSegmentsResponse,
    JobResponse,
    LayoutAnalysis,
    ResultsResponse,
    SilenceRegionsResponse,
    TranscriptsResponse,
} from '../types/api';

import { VideoPlayer } from '@/components/VideoPlayer';

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

export const AgentOutputsDetailView = ({ jobId }: { jobId: string }) => {
    const navigate = useNavigate();
    const [jobInfo, setJobInfo] = useState<JobResponse | null>(null);
    const [playerSize, setPlayerSize] = useState<'compact' | 'medium' | 'large'>(() => {
        return (localStorage.getItem('noteai-player-size') as 'compact' | 'medium' | 'large') || 'medium';
    });
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
                const errorMessage =
                    error.statusCode === 404
                        ? 'Not available - this may be an audio-only pipeline job'
                        : error.statusCode === 400
                            ? 'Not available yet - layout detection may still be in progress'
                            : error.message;
                setState((prev) => ({
                    ...prev,
                    loading: { ...prev.loading, layoutAnalysis: false },
                    errors: { ...prev.errors, layoutAnalysis: errorMessage },
                }));
            });

        // fetch processing logs
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
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Play className="w-5 h-5 text-muted-foreground" />
                        <h2 className="text-xl font-semibold text-foreground">Highlight Video</h2>
                        {state.loading.results && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                    </div>

                    {/* Size Controls (NOTEAI-158) */}
                    {state.results?.metadata?.highlight_video && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Size:</span>
                            <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
                                <button
                                    onClick={() => {
                                        setPlayerSize('compact');
                                        localStorage.setItem('noteai-player-size', 'compact');
                                    }}
                                    className={`px-2 py-1 text-xs rounded-md transition-all ${playerSize === 'compact'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    Compact
                                </button>
                                <button
                                    onClick={() => {
                                        setPlayerSize('medium');
                                        localStorage.setItem('noteai-player-size', 'medium');
                                    }}
                                    className={`px-2 py-1 text-xs rounded-md transition-all ${playerSize === 'medium'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    Medium
                                </button>
                                <button
                                    onClick={() => {
                                        setPlayerSize('large');
                                        localStorage.setItem('noteai-player-size', 'large');
                                    }}
                                    className={`px-2 py-1 text-xs rounded-md transition-all ${playerSize === 'large'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    Large
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {state.errors.results ? (
                    <div className="flex items-start gap-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-md">
                        <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{state.errors.results}</p>
                    </div>
                ) : state.results?.metadata?.highlight_video ? (
                    <div className="space-y-4">
                        {/* Video Player */}
                        <div className={`transition-all duration-300 ease-in-out mx-auto ${playerSize === 'compact' ? 'max-w-md' :
                            playerSize === 'medium' ? 'max-w-2xl' :
                                'max-w-4xl'
                            }`}>
                            <VideoPlayer
                                videoKey={state.results.metadata.highlight_video.s3_key}
                                className="shadow-lg border border-border/50"
                            />
                        </div>

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

            {/* agent timing section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <Timer className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold text-foreground">Processing Time</h2>
                    {state.loading.processingLogs && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                </div>

                {state.errors.processingLogs ? (
                    <div className="flex items-start gap-2 px-3 py-2 bg-destructive/5 border border-destructive/10 rounded-md">
                        <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-destructive">{state.errors.processingLogs}</p>
                    </div>
                ) : state.processingLogs.length > 0 ? (
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground px-1">
                            {state.processingLogs.filter((log) => log.status === 'completed').length} /{' '}
                            {state.processingLogs.length} stages completed
                        </p>
                        <div className="space-y-1.5">
                            {state.processingLogs
                                .filter((log) => log.status === 'completed' && log.duration_seconds !== null)
                                .sort((a, b) => (b.duration_seconds || 0) - (a.duration_seconds || 0))
                                .map((log) => (
                                    <div
                                        key={log.log_id}
                                        className="px-3 py-2.5 hover:bg-accent rounded-md transition-colors border border-border/50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {log.agent_name || log.stage}
                                                    </span>
                                                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                                                        completed
                                                    </span>
                                                </div>
                                                {log.agent_name && (
                                                    <p className="text-xs text-muted-foreground">{log.stage}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span className="text-sm font-medium text-foreground">
                                                    {log.duration_seconds && log.duration_seconds >= 60
                                                        ? `${Math.floor(log.duration_seconds / 60)}m ${Math.round(log.duration_seconds % 60)}s`
                                                        : `${log.duration_seconds?.toFixed(1)}s`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                        {state.processingLogs.some((log) => log.status === 'completed') && (
                            <div className="px-3 py-2 bg-muted/30 rounded-md">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-foreground">Total Processing Time</span>
                                    <span className="text-sm font-semibold text-primary">
                                        {(() => {
                                            const totalSeconds = state.processingLogs
                                                .filter((log) => log.status === 'completed')
                                                .reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
                                            return totalSeconds >= 60
                                                ? `${Math.floor(totalSeconds / 60)}m ${Math.round(totalSeconds % 60)}s`
                                                : `${totalSeconds.toFixed(1)}s`;
                                        })()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    !state.loading.processingLogs && (
                        <p className="text-sm text-muted-foreground px-1">No processing logs available</p>
                    )
                )}
            </div>

            {/* layout analysis section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <Layout className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold text-foreground">Layout Analysis</h2>
                    {state.loading.layoutAnalysis && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                </div>

                {state.errors.layoutAnalysis ? (
                    <div className="flex items-start gap-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-md">
                        <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{state.errors.layoutAnalysis}</p>
                    </div>
                ) : state.layoutAnalysis ? (
                    <div className="px-4 py-3 border border-border/50 rounded-md space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
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

                                {/* layout description */}
                                <p className="text-sm text-muted-foreground">
                                    {state.layoutAnalysis.layout_type === 'side_by_side' &&
                                        'Side-by-side layout with screen content and camera view'}
                                    {state.layoutAnalysis.layout_type === 'picture_in_picture' &&
                                        'Picture-in-picture layout with camera overlay'}
                                    {state.layoutAnalysis.layout_type === 'screen_only' &&
                                        'Screen-only layout (slides/presentation only)'}
                                    {state.layoutAnalysis.layout_type === 'camera_only' &&
                                        'Camera-only layout (speaker view only)'}
                                    {state.layoutAnalysis.layout_type === 'unknown' &&
                                        'Layout type could not be determined'}
                                </p>

                                {/* region details */}
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

                                {state.layoutAnalysis.split_ratio > 0 && state.layoutAnalysis.split_ratio < 1 && (
                                    <p className="text-xs text-muted-foreground">
                                        Split ratio: {Math.round(state.layoutAnalysis.split_ratio * 100)}% screen /{' '}
                                        {Math.round((1 - state.layoutAnalysis.split_ratio) * 100)}% camera
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    !state.loading.layoutAnalysis && (
                        <p className="text-sm text-muted-foreground px-1">No layout analysis available</p>
                    )
                )}
            </div>
        </div>
    );
};
