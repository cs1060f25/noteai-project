export enum JobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ProcessingStage {
  UPLOADING = 'uploading',
  SILENCE_DETECTION = 'silence_detection',
  TRANSCRIPTION = 'transcription',
  LAYOUT_ANALYSIS = 'layout_analysis',
  CONTENT_ANALYSIS = 'content_analysis',
  SEGMENTATION = 'segmentation',
  COMPILATION = 'compilation',
  COMPLETE = 'complete',
}

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

export interface APIError {
  error: {
    code: string;
    message: string;
    field?: string;
    details?: unknown;
  };
}
