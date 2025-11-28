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
  IMAGE_EXTRACTION: 'image_extraction',
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
  rate_limit_mode?: boolean;
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
  agent_name?: string;
}

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  filename: string;
  processing_mode?: ProcessingMode;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  progress?: JobProgress;
  error_message?: string;
  thumbnail_url?: string | null;
  podcast_status?: string | null;
  podcast_url?: string | null;
  podcast_duration?: number | null;
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

// results types (for /results endpoint with pre-signed URLs)

export interface ClipMetadata {
  clip_id: string;
  title: string;
  start_time: number;
  end_time: number;
  duration: number;
  s3_key: string;
  url: string | null;
  thumbnail_url: string | null;
  subtitle_url: string | null;
}

export interface ResultsResponse {
  job_id: string;
  clips: ClipMetadata[];
  transcript: TranscriptSegment[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
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

// api key management types

export interface ApiKeyResponse {
  has_key: boolean;
  key_preview?: string; // masked version like "AIza...abc123"
  last_validated?: string;
  is_valid?: boolean;
}

export interface ApiKeyAddRequest {
  api_key: string;
}

export interface ApiKeyTestRequest {
  api_key?: string; // optional - if not provided, tests the stored key
}

export interface ApiKeyTestResponse {
  is_valid: boolean;
  message: string;
  error_code?: string;
}

// dashboard types

export interface DashboardStats {
  total_videos: number;
  processing: number;
  completed: number;
  failed: number;
  total_clips: number;
  total_storage_bytes: number;
  videos_last_24h: number;
  videos_last_7d: number;
  videos_last_30d: number;
}

export interface RecentVideo {
  job_id: string;
  filename: string;
  status: JobStatus;
  clips_count: number;
  duration: number | null;
  created_at: string;
  updated_at: string;
  current_stage: string | null;
  progress_percent: number | null;
}

export interface DashboardData {
  stats: DashboardStats;
  recent_videos: RecentVideo[];
}

export interface QuizQuestion {
  id: number;
  type: 'multiple-choice' | 'true-false';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizResponse {
  job_id: string;
  questions: QuizQuestion[];
}

import type { Quiz } from '@/components/content/types';
// API client
import { apiClient } from '@/lib/clerk-api';

export const api = {
  uploadVideo: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    // Use raw axios for upload to handle onUploadProgress properly if apiClient wrapper doesn't support it easily
    // Or better, use apiClient.post if it supports config.
    // Looking at clerk-api.ts, apiClient.post accepts config.
    
    return apiClient.post<UploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },

  getJob: async (jobId: string): Promise<JobResponse> => {
    return apiClient.get<JobResponse>(`/jobs/${jobId}`);
  },

  getJobs: async (skip = 0, limit = 10): Promise<JobListResponse> => {
    return apiClient.get<JobListResponse>('/jobs', {
      params: { skip, limit },
    });
  },

  getResults: async (jobId: string): Promise<ResultsResponse> => {
    return apiClient.get<ResultsResponse>(`/results/${jobId}`);
  },

  generateQuiz: async (
    jobId: string,
    numQuestions: number = 5,
    difficulty: string = 'medium'
  ): Promise<QuizResponse> => {
    return apiClient.post<QuizResponse>(`/jobs/${jobId}/quiz`, null, {
      params: { num_questions: numQuestions, difficulty },
    });
  },

  getQuiz: async (quizId: string): Promise<QuizResponse> => {
    return apiClient.get<QuizResponse>(`/quizzes/${quizId}`);
  },

  getQuizzes: async (): Promise<Quiz[]> => {
    return apiClient.get<Quiz[]>('/quizzes');
  },
};
