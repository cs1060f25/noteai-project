export const JobStatus = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const ProcessingStage = {
  UPLOADING: 'uploading',
  SILENCE_DETECTION: 'silence_detection',
  TRANSCRIPTION: 'transcription',
  LAYOUT_ANALYSIS: 'layout_analysis',
  CONTENT_ANALYSIS: 'content_analysis',
  SEGMENTATION: 'segmentation',
  COMPILATION: 'compilation',
  COMPLETE: 'complete',
} as const;

export type ProcessingStage = (typeof ProcessingStage)[keyof typeof ProcessingStage];

export interface UploadRequest {
  filename: string;
  file_size: number;
  content_type: string;
}

export interface UploadResponse {
  job_id: string;
  upload_url: string;
  upload_fields: Record<string, string>;
  expires_in: number;
  s3_key: string;
}

export interface JobProgress {
  stage: ProcessingStage;
  percent: number;
  message: string;
  eta_seconds?: number;
}

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  filename: string;
  created_at: string;
  updated_at: string;
  progress?: JobProgress;
  error_message?: string;
}

export interface JobListResponse {
  jobs: JobResponse[];
  total: number;
}

export interface APIError {
  error: {
    code: string;
    message: string;
    field?: string;
    details?: unknown;
  };
}

// agent output types

export interface TranscriptSegment {
  start_time: number;
  end_time: number;
  text: string;
  confidence?: number;
}

export interface SilenceRegion {
  region_id: string;
  start_time: number;
  end_time: number;
  duration: number;
  silence_type: 'audio_silence' | 'blank_screen' | 'both';
  amplitude_threshold?: number;
  created_at: string;
}

export interface ContentSegment {
  segment_id: string;
  start_time: number;
  end_time: number;
  duration: number;
  topic: string;
  description?: string;
  importance_score: number;
  keywords: string[];
  concepts: string[];
  segment_order: number;
  created_at: string;
}

export interface TranscriptsResponse {
  job_id: string;
  segments: TranscriptSegment[];
  total: number;
}

export interface SilenceRegionsResponse {
  job_id: string;
  regions: SilenceRegion[];
  total: number;
}

export interface ContentSegmentsResponse {
  job_id: string;
  segments: ContentSegment[];
  total: number;
}
