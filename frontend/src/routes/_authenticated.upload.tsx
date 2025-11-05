import React, { useCallback, useMemo, useRef, useState } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import {
  Upload,
  Link2,
  CheckCircle2,
  Video as VideoIcon,
  Sparkles,
  FileVideo,
  Zap,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VideoPlayer } from '@/components/VideoPlayer';
import { uploadVideo, validateVideoFile, UploadError } from '@/services/uploadService';

const stageFromProgress = (p: number) => {
  if (p < 85) return 'uploading' as const;
  if (p < 95) return 'processing' as const;
  if (p < 100) return 'analyzing' as const;
  return 'complete' as const;
};

export const UploadIntegrated = () => {
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedJobId, setUploadedJobId] = useState<string | null>(null);
  const [uploadedVideoKey, setUploadedVideoKey] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<
    'uploading' | 'processing' | 'analyzing' | 'complete'
  >('uploading');

  const resetState = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
    setErrorMsg(null);
    setUploadedJobId(null);
    setUploadedVideoKey(null);
    setUploadStage('uploading');
  }, []);

  const startUpload = useCallback(async (file: File) => {
    setErrorMsg(null);
    setFileName(file.name);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStage('uploading');

    try {
      const result = await uploadVideo(file, (percent) => {
        const p = Math.max(0, Math.min(100, Math.floor(percent)));
        setUploadProgress(p);
        setUploadStage(stageFromProgress(p));
      });

      setUploadedJobId(result.jobId);
      setUploadedVideoKey(result.s3Key);
      setUploadProgress(100);
      setUploadStage('complete');
      setIsUploading(false);
      setUploadComplete(true);
    } catch (error) {
      const msg =
        error instanceof UploadError ? error.message : 'Failed to upload video. Please try again.';
      setErrorMsg(msg);
      setIsUploading(false);
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

  const particles = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  const handleMockUrlUpload = useCallback(async () => {
    setFileName('YouTube Video');
    setUploadComplete(false);
    setUploadedJobId(null);
    setUploadedVideoKey(null);
    setUploadProgress(0);
    setIsUploading(true);
    setUploadStage('uploading');
    setTimeout(() => {
      setUploadedJobId('job_mock_' + Date.now());
      setUploadedVideoKey('videos/mock_youtube_key.mp4');
      setUploadProgress(100);
      setUploadStage('complete');
      setIsUploading(false);
      setUploadComplete(true);
    }, 3500);
  }, []);

  return (
    <div className="h-full flex items-center justify-center p-8 overflow-hidden relative">
      <AnimatePresence>
        {isUploading && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary/20"
                initial={{ x: '50%', y: '50%', scale: 0, opacity: 0 }}
                animate={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  scale: [0, 1, 0],
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

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
          <h1>Upload Your Lecture</h1>
          <p className="text-muted-foreground">
            Drop your video file or paste a YouTube link to get started
          </p>
        </motion.div>

        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`glass-card border-2 border-dashed rounded-2xl p-16 text-center transition-all relative overflow-hidden ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border/50 hover:border-border'}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <AnimatePresence mode="wait">
            {uploadComplete ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="space-y-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                  className="relative"
                >
                  <motion.div
                    className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mx-auto"
                    animate={{
                      boxShadow: [
                        '0 0 0 0 rgba(var(--primary), 0.4)',
                        '0 0 0 20px rgba(var(--primary), 0)',
                      ],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-primary" />
                  </motion.div>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-primary"
                      initial={{ scale: 0, x: '-50%', y: '-50%' }}
                      animate={{
                        scale: [0, 1, 0],
                        x: ['-50%', `${Math.cos((i * Math.PI) / 4) * 100}px`],
                        y: ['-50%', `${Math.sin((i * Math.PI) / 4) * 100}px`],
                        opacity: [1, 0],
                      }}
                      transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                    />
                  ))}
                </motion.div>
                <div>
                  <h3 className="mb-2">Upload Complete</h3>
                  <p className="text-muted-foreground mb-2">{fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    Your video is being processed. Check the Library to view progress.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetState();
                    setFileName('');
                  }}
                  className="glass-card"
                >
                  Upload Another Video
                </Button>
              </motion.div>
            ) : isUploading ? (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="relative w-48 h-48 mx-auto">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted/20"
                    />
                    <motion.circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-primary"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: uploadProgress / 100 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      style={{
                        strokeDasharray: '552.92',
                        strokeDashoffset: 552.92 * (1 - uploadProgress / 100),
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={uploadStage}
                        initial={{ scale: 0.8, opacity: 0, rotateY: 90 }}
                        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                        exit={{ scale: 0.8, opacity: 0, rotateY: -90 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                          {uploadStage === 'uploading' && (
                            <Upload className="w-8 h-8 text-primary" />
                          )}
                          {uploadStage === 'processing' && (
                            <FileVideo className="w-8 h-8 text-primary" />
                          )}
                          {uploadStage === 'analyzing' && (
                            <Sparkles className="w-8 h-8 text-primary" />
                          )}
                          {uploadStage === 'complete' && (
                            <CheckCircle2 className="w-8 h-8 text-primary" />
                          )}
                        </div>
                        <div className="text-3xl mb-1">{uploadProgress}%</div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
                <motion.div
                  key={uploadStage + fileName}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="mb-2">
                    {uploadStage === 'uploading' && 'Uploading your video'}
                    {uploadStage === 'processing' && 'Processing video file'}
                    {uploadStage === 'analyzing' && 'AI analyzing content'}
                    {uploadStage === 'complete' && 'Upload Complete'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-1">{fileName}</p>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Zap className="w-3 h-3" />
                    <span>AI powered processing</span>
                  </div>
                </motion.div>
                <div className="flex items-center justify-center gap-3 pt-4">
                  {(['uploading', 'processing', 'analyzing'] as const).map((stage, index) => (
                    <motion.div
                      key={stage}
                      className={`h-1.5 rounded-full transition-all ${uploadProgress >= (index + 1) * 33.33 ? 'bg-primary w-16' : 'bg-muted w-8'}`}
                      initial={{ width: 32 }}
                      animate={{ width: uploadProgress >= (index + 1) * 33.33 ? 64 : 32 }}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
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
            )}
          </AnimatePresence>
        </motion.div>

        {!isUploading && !uploadComplete && (
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
                />
                <Button className="glass-button" onClick={handleMockUrlUpload}>
                  Upload from URL
                </Button>
              </div>
            </div>
          </motion.div>
        )}

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

        {uploadedJobId && (
          <div className="fluent-layer-2 border-l-4 border-l-primary p-6 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <VideoIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg text-foreground mb-1">Upload Successful</h3>
                <p className="text-muted-foreground mb-3">
                  Your video has been uploaded and processing will begin shortly.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="opacity-80">Job ID</span>
                  <code className="bg-accent px-2 py-1 rounded-md text-xs font-mono text-foreground">
                    {uploadedJobId}
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {uploadedVideoKey && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <VideoIcon className="w-4 h-4 text-accent-foreground" />
              </div>
              <h2 className="text-2xl text-foreground">Uploaded Video</h2>
            </div>
            <VideoPlayer videoKey={uploadedVideoKey} className="fluent-layer-3" />
          </div>
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
