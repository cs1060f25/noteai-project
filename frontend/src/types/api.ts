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

export type ProcessingMode = 'audio' | 'vision';

export type ResolutionOption = '720p' | '1080p' | '1440p' | '2160p';

export interface ProcessingConfig {
  prompt?: string;
  resolution: ResolutionOption;
  processing_mode: ProcessingMode;
}

export interface UploadRequest {
  filename: string;
  file_size: number;
  content_type: string;
  processing_config?: ProcessingConfig;
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
  processing_mode?: ProcessingMode;
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

export interface LayoutAnalysis {
  layout_id: string;
  job_id: string;
  screen_region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  camera_region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  split_ratio: number;
  layout_type: 'side_by_side' | 'picture_in_picture' | 'screen_only' | 'camera_only' | 'unknown';
  confidence_score: number;
  sample_frame_time?: number;
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

export interface Clip {
  clip_id: string;
  content_segment_id?: string;
  title: string;
  topic?: string;
  importance_score?: number;
  start_time: number;
  end_time: number;
  duration: number;
  clip_order?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra_metadata: Record<string, any>;
  created_at: string;
}

export interface ClipsResponse {
  job_id: string;
  clips: Clip[];
  total: number;
}

// user types

export type UserRole = 'user' | 'admin';

export interface UserResponse {
  user_id: string;
  email: string;
  name?: string;
  picture_url?: string;
  organization?: string;
  role: UserRole;
  email_notifications: boolean;
  processing_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserUpdateRequest {
  name?: string;
  organization?: string;
  email_notifications?: boolean;
  processing_notifications?: boolean;
}
