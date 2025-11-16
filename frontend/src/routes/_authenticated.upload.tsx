import React, { useCallback, useRef, useState, useEffect } from 'react';

import { useAuth } from '@clerk/clerk-react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Upload,
  Link2,
  XCircle,
  Video,
  Sparkles,
  Zap,
  Wand2,
  Image,
  Headphones,
  Settings2,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { ProcessingProgress } from '@/components/ProcessingProgress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  uploadVideo,
  uploadFromYouTube,
  validateVideoFile,
  validateYouTubeUrl,
  UploadError,
} from '@/services/uploadService';
import { createJobWebSocket, WebSocketService } from '@/services/websocketService';
import type { ProcessingConfig, ResolutionOption, ProcessingMode } from '@/types/api';
import type { JobProgress } from '@/types/api';

// Badge helper component
function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${className}`}>
      {children}
    </span>
  );
}

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

  // Configuration state
  const [showConfig, setShowConfig] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<ResolutionOption>('720p');
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('vision');
  const [rateLimitMode, setRateLimitMode] = useState(true); // default: enabled for safety

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

  const startUpload = useCallback(async (file: File, config?: ProcessingConfig) => {
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
      const result = await uploadVideo(
        file,
        (percent) => {
          const p = Math.max(0, Math.min(100, Math.floor(percent)));
          setUploadProgress(p);

          // Update processing progress for upload stage
          setProcessingProgress({
            stage: 'uploading',
            percent: p,
            message: `Uploading video... ${p}%`,
          });
        },
        config
      );

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

  const handleFileSelected = useCallback(async (file: File | null) => {
    if (!file) return;
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Invalid file');
      return;
    }
    // Store the file and show configuration panel
    setSelectedFile(file);
    setFileName(file.name);
    setShowConfig(true);
    setErrorMsg(null);
  }, []);

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

  const handleUrlInputClick = useCallback(() => {
    const validation = validateYouTubeUrl(youtubeUrl);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Please enter a valid YouTube URL');
      return;
    }

    // Show configuration panel for YouTube URL
    setFileName('YouTube Video');
    setSelectedFile(null); // No file for YouTube
    setShowConfig(true);
    setErrorMsg(null);
  }, [youtubeUrl]);

  const handleStartProcessing = useCallback(async () => {
    setShowConfig(false);

    // Build processing configuration
    const config: ProcessingConfig = {
      prompt: prompt || undefined,
      resolution,
      processing_mode: processingMode,
      rate_limit_mode: rateLimitMode,
    };

    if (selectedFile) {
      // File upload
      await startUpload(selectedFile, config);
    } else if (youtubeUrl) {
      // YouTube URL upload
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
        const result = await uploadFromYouTube(
          youtubeUrl,
          (p) => {
            const percent = Math.max(0, Math.min(100, Math.floor(p)));
            setProcessingProgress({
              stage: 'uploading',
              percent,
              message: `Downloading from YouTube... ${percent}%`,
            });
          },
          config
        );

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
    }
  }, [selectedFile, youtubeUrl, startUpload, prompt, resolution, processingMode, rateLimitMode]);

  return (
    <div className="h-full flex items-center justify-center p-8 overflow-hidden relative">
      <input
        ref={hiddenInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
        onChange={handleHiddenInputChange}
        className="hidden"
      />

      <div className="w-full max-w-5xl space-y-8 relative z-10">
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Upload Your Lecture</h1>
          <p className="text-muted-foreground">
            Transform your video into engaging clips with AI-powered analysis
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {showConfig ? (
            /* Configuration Panel */
            <motion.div
              key="config"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-6"
            >
              {/* File Preview */}
              <div className="rounded-2xl overflow-hidden bg-background/60 backdrop-blur-xl border border-border/50 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Video className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm mb-1 truncate">{fileName}</h3>
                    <p className="text-xs text-muted-foreground">Ready to process</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowConfig(false);
                      setFileName('');
                      setSelectedFile(null);
                      setYoutubeUrl('');
                    }}
                    className="rounded-xl"
                  >
                    Change
                  </Button>
                </div>
              </div>

              {/* Configuration Form */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Prompt Input */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl bg-background/60 backdrop-blur-xl border border-border/50 p-6"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Wand2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <Label className="text-sm">AI Instructions</Label>
                        <p className="text-xs text-muted-foreground">What should AI focus on?</p>
                      </div>
                    </div>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="E.g., Extract key concepts, highlight important equations, focus on practical examples..."
                      className="min-h-[120px] resize-none rounded-xl border-border/50 bg-background/50"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Leave blank for automatic content detection
                    </p>
                  </motion.div>

                  {/* Resolution */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-2xl bg-background/60 backdrop-blur-xl border border-border/50 p-6"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Settings2 className="w-4 h-4 text-white" />
                      </div>
                      <Label className="text-sm">Output Resolution</Label>
                    </div>
                    <Select
                      value={resolution}
                      onValueChange={(value) => setResolution(value as ResolutionOption)}
                    >
                      <SelectTrigger className="rounded-xl border-border/50 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/50">
                        <SelectItem value="720p">720p HD (Fast)</SelectItem>
                        <SelectItem value="1080p">1080p Full HD (Recommended)</SelectItem>
                        <SelectItem value="1440p">1440p 2K (High Quality)</SelectItem>
                        <SelectItem value="2160p">2160p 4K (Best Quality)</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                  {/* Rate Limiting Toggle */}
                  <div className="rounded-xl bg-background/60 backdrop-blur-xl border border-border/50 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Label htmlFor="rate-limit-mode" className="text-sm cursor-pointer">
                            Rate Limiting Mode
                          </Label>
                          <Badge
                            className={`text-xs px-2 py-0 border-0 ${
                              rateLimitMode
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-orange-500/10 text-orange-500'
                            }`}
                          >
                            {rateLimitMode ? 'Safe' : 'Fast'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {rateLimitMode
                            ? 'Sequential processing with delays to stay under API limits. Recommended for free-tier keys.'
                            : 'Parallel processing for faster transcription. Use if you have higher API rate limits.'}
                        </p>
                      </div>
                      <Switch
                        id="rate-limit-mode"
                        checked={rateLimitMode}
                        onCheckedChange={setRateLimitMode}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Processing Mode */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4"
                >
                  <div className="rounded-2xl bg-background/60 backdrop-blur-xl border border-border/50 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Label className="text-sm">Processing Mode</Label>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
                        <Info className="w-3 h-3" />
                        <span>Choose wisely</span>
                      </div>
                    </div>

                    <RadioGroup
                      value={processingMode}
                      onValueChange={(value: string) =>
                        setProcessingMode(value as 'audio' | 'vision')
                      }
                      className="space-y-3"
                    >
                      {/* Audio Only Mode */}
                      <motion.label
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        htmlFor="audio"
                        className={`block cursor-pointer rounded-xl p-5 border-2 transition-all ${
                          processingMode === 'audio'
                            ? 'border-primary bg-primary/5'
                            : 'border-border/50 hover:border-border'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <RadioGroupItem value="audio" id="audio" className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  processingMode === 'audio'
                                    ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                                    : 'bg-muted'
                                }`}
                              >
                                <Headphones
                                  className={`w-5 h-5 ${
                                    processingMode === 'audio'
                                      ? 'text-white'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm">Audio Only</h4>
                                  <Badge className="bg-green-500/10 text-green-500 border-0 text-xs px-2 py-0">
                                    <Zap className="w-3 h-3 mr-1" />
                                    Faster
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">~2-3 min processing</p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Analyzes speech, detects silence, and transcribes content. Best for
                              talking-head lectures without visual aids.
                            </p>
                          </div>
                        </div>
                      </motion.label>

                      {/* Vision Mode */}
                      <motion.label
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        htmlFor="vision"
                        className={`block cursor-pointer rounded-xl p-5 border-2 transition-all ${
                          processingMode === 'vision'
                            ? 'border-primary bg-primary/5'
                            : 'border-border/50 hover:border-border'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <RadioGroupItem value="vision" id="vision" className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  processingMode === 'vision'
                                    ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                                    : 'bg-muted'
                                }`}
                              >
                                <Image
                                  className={`w-5 h-5 ${
                                    processingMode === 'vision'
                                      ? 'text-white'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm">Vision + Audio</h4>
                                  <Badge className="bg-purple-500/10 text-purple-500 border-0 text-xs px-2 py-0">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Recommended
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">~5-8 min processing</p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Full visual analysis including slide detection, text recognition,
                              diagrams, and on-screen content. Perfect for lectures with
                              presentations.
                            </p>
                          </div>
                        </div>
                      </motion.label>
                    </RadioGroup>
                  </div>

                  {/* Processing Info */}
                  <div className="rounded-xl bg-muted/50 p-4 border border-border/50">
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="text-foreground">Vision mode</span> detects slide
                          transitions, OCR text, handwriting, and visual elements. Use for
                          PowerPoint, whiteboard, or screenshare lectures.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="text-foreground">Audio mode</span> is optimized for pure
                          speech content and is significantly faster.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex gap-3"
              >
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfig(false);
                    setFileName('');
                    setSelectedFile(null);
                    setYoutubeUrl('');
                  }}
                  className="flex-1 rounded-xl h-12"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStartProcessing}
                  className="flex-1 rounded-xl h-12 bg-primary hover:bg-primary/90"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Processing
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            /* Upload Zone */
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {!isProcessing && (
                <motion.div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-16 text-center transition-all relative overflow-hidden ${
                    isDragging
                      ? 'border-primary bg-primary/5 scale-[1.02]'
                      : 'border-border/50 hover:border-border bg-background/60 backdrop-blur-xl'
                  }`}
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
                      <Button
                        className="rounded-xl cursor-pointer"
                        onClick={onFilePickerClick}
                        asChild
                      >
                        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          Choose File
                        </motion.span>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supports MP4, MOV, AVI, WebM up to 2GB
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {/* URL Input */}
              {!isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mt-8"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-sm text-muted-foreground">OR</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="rounded-2xl p-6 border border-border/50 bg-background/60 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                      <Link2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <Input
                        placeholder="Paste YouTube or video URL here..."
                        className="flex-1 bg-transparent border-0 focus-visible:ring-0 px-0"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                      />
                      <Button
                        className="rounded-xl"
                        onClick={handleUrlInputClick}
                        disabled={!youtubeUrl.trim()}
                      >
                        Import from URL
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Stats */}
              {!isProcessing && (
                <motion.div
                  className="grid grid-cols-3 gap-4 mt-8"
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
                      className="rounded-xl p-4 border border-border/50 text-center bg-background/60 backdrop-blur-xl"
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
                    processingMode={processingMode}
                    currentProgress={processingProgress || undefined}
                    onComplete={() => {
                      console.log('[Upload Page] Processing complete - redirecting to library');
                      // Redirect will be handled by WebSocket onComplete callback
                    }}
                    startTime={processingStartTime}
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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
