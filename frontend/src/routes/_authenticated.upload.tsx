import React, { useCallback, useRef, useState, useEffect } from 'react';

import { useAuth } from '@clerk/clerk-react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Upload, Link2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

import { ProcessingProgress } from '@/components/ProcessingProgress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  uploadVideo,
  uploadFromYouTube,
  validateVideoFile,
  validateYouTubeUrl,
  UploadError,
} from '@/services/uploadService';
import { createJobWebSocket, WebSocketService } from '@/services/websocketService';
import type { JobProgress } from '@/types/api';

export const UploadIntegrated = () => {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const wsRef = useRef<WebSocketService | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [_uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedJobId, setUploadedJobId] = useState<string | null>(null);
  const [_uploadedVideoKey, setUploadedVideoKey] = useState<string | null>(null);
  const [_uploadStage, setUploadStage] = useState<
    'uploading' | 'processing' | 'analyzing' | 'complete'
  >('uploading');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<JobProgress | null>(null);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, []);

  // Initialize WebSocket when job is created and upload is complete
  useEffect(() => {
    if (uploadComplete && uploadedJobId && !wsRef.current) {
      const initWebSocket = async () => {
        try {
          const token = await getToken();
          setIsProcessing(true);
          setProcessingStartTime(new Date());

          const ws = createJobWebSocket(
            uploadedJobId,
            {
              onProgress: (progress) => {
                console.log('[Upload Page] Progress update:', progress);
                setProcessingProgress(progress);
              },
              onComplete: (jobId) => {
                console.log('[Upload Page] Job completed:', jobId);
                setIsProcessing(false);
                // Redirect to library page with the job ID
                navigate({ to: `/library/${jobId}` });
              },
              onError: (error) => {
                console.error('[Upload Page] Job error:', error);
                setErrorMsg(error);
                setIsProcessing(false);
              },
              onStatusChange: (status) => {
                console.log('[Upload Page] WebSocket status:', status);
              },
            },
            token
          );

          ws.connect();
          wsRef.current = ws;
        } catch (error) {
          console.error('[Upload Page] Failed to initialize WebSocket:', error);
          setErrorMsg('Failed to connect to processing service');
        }
      };

      initWebSocket();
    }
  }, [uploadComplete, uploadedJobId, getToken, navigate]);

  const startUpload = useCallback(async (file: File) => {
    setErrorMsg(null);
    setFileName(file.name);
    setIsUploading(true);
    setIsProcessing(true);
    setProcessingStartTime(new Date());
    setUploadProgress(0);
    setUploadStage('uploading');

    // Set a temporary job ID so ProcessingProgress can render immediately
    setUploadedJobId('uploading');

    // Set initial uploading progress
    setProcessingProgress({
      stage: 'uploading',
      percent: 0,
      message: 'Preparing to upload...',
    });

    try {
      const result = await uploadVideo(file, (percent) => {
        const p = Math.max(0, Math.min(100, Math.floor(percent)));
        setUploadProgress(p);

        // Update processing progress for upload stage
        setProcessingProgress({
          stage: 'uploading',
          percent: p,
          message: `Uploading video... ${p}%`,
        });
      });

      setUploadedJobId(result.jobId);
      setUploadedVideoKey(result.s3Key);
      setUploadProgress(100);
      setUploadStage('complete');
      setIsUploading(false);
      setUploadComplete(true);

      // Upload complete, WebSocket will take over from here
      setProcessingProgress({
        stage: 'uploading',
        percent: 100,
        message: 'Upload complete! Starting processing...',
      });
    } catch (error) {
      const msg =
        error instanceof UploadError ? error.message : 'Failed to upload video. Please try again.';
      setErrorMsg(msg);
      setIsUploading(false);
      setIsProcessing(false);
      setUploadStage('uploading');
    }
  }, []);

  const handleFileSelected = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        setErrorMsg(validation.error || 'Invalid file');
        return;
      }
      await startUpload(file);
    },
    [startUpload]
  );

  const onFilePickerClick = useCallback(() => {
    hiddenInputRef.current?.click();
  }, []);

  const handleHiddenInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] || null;
      await handleFileSelected(f);
    },
    [handleFileSelected]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0] || null;
    await handleFileSelected(f);
  };

  const handleUrlUpload = useCallback(async () => {
    const validation = validateYouTubeUrl(youtubeUrl);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Please enter a valid YouTube URL');
      return;
    }

    setFileName('YouTube Video');
    setUploadComplete(false);
    setUploadProgress(0);
    setIsUploading(true);
    setIsProcessing(true);
    setProcessingStartTime(new Date());
    setUploadStage('uploading');

    // Temporary job id so progress UI renders immediately
    setUploadedJobId('uploading');
    setUploadedVideoKey(null);

    // Initial progress UI
    setProcessingProgress({
      stage: 'uploading',
      percent: 0,
      message: 'Starting YouTube download...',
    });

    try {
      const result = await uploadFromYouTube(youtubeUrl, (p) => {
        const percent = Math.max(0, Math.min(100, Math.floor(p)));
        setProcessingProgress({
          stage: 'uploading',
          percent,
          message: `Downloading from YouTube... ${percent}%`,
        });
      });

      setUploadedJobId(result.jobId);
      if (result.videoInfo?.title) {
        setFileName(result.videoInfo.title);
      }
      setUploadProgress(100);
      setUploadStage('complete');
      setIsUploading(false);
      setUploadComplete(true);
      setProcessingProgress({
        stage: 'uploading',
        percent: 100,
        message: 'Upload complete! Starting processing...',
      });
    } catch (error) {
      const msg =
        error instanceof UploadError
          ? error.message
          : 'Failed to download YouTube video. Please try again.';
      setErrorMsg(msg);
      setIsUploading(false);
      setIsProcessing(false);
      setUploadStage('uploading');
    }
  }, [youtubeUrl]);

  return (
    <div className="h-full flex items-center justify-center p-8 overflow-hidden relative">
      <input
        ref={hiddenInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
        onChange={handleHiddenInputChange}
        className="hidden"
      />

      <div className="w-full max-w-4xl space-y-8 relative z-10">
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-bold">Upload Your Lecture</h1>
          <p className="text-muted-foreground">
            Drop your video file or paste a YouTube link to get started
          </p>
        </motion.div>

        {/* Only show upload card when not processing */}
        {!isProcessing && (
          <motion.div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`glass-card border-2 border-dashed rounded-2xl p-16 text-center transition-all relative overflow-hidden ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border/50 hover:border-border'}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <motion.div
                className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <Upload className="w-8 h-8 text-primary" />
              </motion.div>
              <div>
                <h3 className="mb-2">Drag and drop your video here</h3>
                <p className="text-muted-foreground">or click to browse your files</p>
              </div>
              <div>
                <Button className="glass-button cursor-pointer" onClick={onFilePickerClick}>
                  Choose File
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supports MP4 MOV AVI MKV WebM up to 2GB
              </p>
            </motion.div>
          </motion.div>
        )}

        {!isUploading && !uploadComplete && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">OR</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="glass-card rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-4">
                <Link2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <Input
                  placeholder="Paste YouTube or video URL here..."
                  className="flex-1 bg-transparent border-0 focus-visible:ring-0 px-0"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
                <Button
                  className="glass-button"
                  onClick={handleUrlUpload}
                  disabled={!youtubeUrl.trim()}
                >
                  Upload from URL
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {!isProcessing && (
          <motion.div
            className="grid grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {[
              { label: 'Videos Uploaded', value: '24' },
              { label: 'Total Size', value: '3.2 GB' },
              { label: 'Clips Generated', value: '186' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="glass-card rounded-lg p-4 border border-border/50 text-center"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <div className="text-2xl text-foreground mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Processing Progress */}
        {isProcessing && uploadedJobId && processingStartTime && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ProcessingProgress
              videoName={fileName}
              currentProgress={processingProgress || undefined}
              onComplete={() => {
                console.log('[Upload Page] Processing complete - redirecting to library');
                // Redirect will be handled by WebSocket onComplete callback
              }}
              startTime={processingStartTime}
            />
          </motion.div>
        )}

        {errorMsg && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 text-destructive p-3 text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/upload')({
  component: UploadIntegrated,
});
