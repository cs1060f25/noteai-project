import React, { useState, useRef, useCallback } from 'react';

import { Upload, CheckCircle2, XCircle, Loader2, FileVideo, Link as LinkIcon } from 'lucide-react';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '../lib/utils';
import {
  uploadVideo,
  uploadFromYouTube,
  validateVideoFile,
  validateYouTubeUrl,
  UploadError,
} from '../services/uploadService';

interface VideoUploadProps {
  onUploadComplete?: (jobId: string, s3Key?: string) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';
type UploadMethod = 'file' | 'youtube';

export const VideoUpload = ({ onUploadComplete, onUploadError, className }: VideoUploadProps) => {
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('file');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file');
      setUploadState('error');
      return;
    }

    setSelectedFile(file);
    setUploadState('idle');
    setErrorMessage('');
    setProgress(0);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileSelect(file || null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setProgress(0);
    setErrorMessage('');

    try {
      const result = await uploadVideo(selectedFile, (progressPercent) => {
        setProgress(progressPercent);
      });

      setJobId(result.jobId);
      setUploadState('success');
      onUploadComplete?.(result.jobId, result.s3Key);
    } catch (error) {
      const errorMsg =
        error instanceof UploadError ? error.message : 'Failed to upload video. Please try again.';
      setErrorMessage(errorMsg);
      setUploadState('error');
      onUploadError?.(error as Error);
    }
  };

  const handleYouTubeUpload = async () => {
    const validation = validateYouTubeUrl(youtubeUrl);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid YouTube URL');
      setUploadState('error');
      return;
    }

    setUploadState('uploading');
    setProgress(0);
    setErrorMessage('');

    try {
      const result = await uploadFromYouTube(youtubeUrl, (progressPercent) => {
        setProgress(progressPercent);
      });

      setJobId(result.jobId);
      setVideoInfo(result.videoInfo);
      setUploadState('success');
      onUploadComplete?.(result.jobId);
    } catch (error) {
      const errorMsg =
        error instanceof UploadError
          ? error.message
          : 'Failed to download YouTube video. Please try again.';
      setErrorMessage(errorMsg);
      setUploadState('error');
      onUploadError?.(error as Error);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setYoutubeUrl('');
    setUploadState('idle');
    setProgress(0);
    setErrorMessage('');
    setJobId('');
    setVideoInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>Upload Video</CardTitle>
        <CardDescription>
          Upload your lecture video or provide a YouTube URL to generate highlight clips with
          subtitles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={uploadMethod}
          onValueChange={(value: string) => setUploadMethod(value as UploadMethod)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="youtube">YouTube URL</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4 mt-4">
            {!selectedFile && uploadState === 'idle' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer',
                  isDragging
                    ? 'border-primary bg-primary/5 fluent-shadow-lg'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                )}
                onClick={handleBrowseClick}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="fluent-subtitle text-lg text-foreground mb-2">
                  Drag and drop your video here
                </p>
                <p className="fluent-body text-muted-foreground mb-4">or click to browse</p>
                <p className="fluent-caption">Supports MP4, MOV, AVI, MKV, WebM (max 2GB)</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {selectedFile && uploadState === 'idle' && (
              <>
                <div className="flex items-start gap-4 p-4 border border-border rounded-xl bg-accent/50">
                  <FileVideo className="w-10 h-10 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="fluent-body font-medium text-foreground truncate">
                      {selectedFile.name}
                    </p>
                    <p className="fluent-caption">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Remove
                  </Button>
                </div>
                <Button onClick={handleUpload} className="w-full" size="lg">
                  <Upload className="w-4 h-4 mr-2" />
                  Start Upload
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="youtube" className="space-y-4 mt-4">
            {uploadState === 'idle' && (
              <>
                <div className="space-y-2">
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="w-full"
                  />
                  <p className="fluent-caption text-muted-foreground">
                    Paste a YouTube video URL to download and process
                  </p>
                </div>
                <Button
                  onClick={handleYouTubeUpload}
                  disabled={!youtubeUrl.trim()}
                  className="w-full"
                  size="lg"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Download from YouTube
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>

        {uploadState === 'uploading' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="fluent-body font-medium text-foreground">Uploading video...</p>
                <p className="fluent-caption">{progress}% complete</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300 fluent-shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {uploadState === 'success' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="fluent-body font-medium text-foreground">Upload successful!</p>
                <p className="fluent-caption mt-1">
                  Your video is now processing. Job ID:{' '}
                  <code className="bg-accent px-1 py-0.5 rounded text-xs font-mono">{jobId}</code>
                </p>
                {videoInfo && (
                  <div className="mt-2 space-y-1">
                    <p className="fluent-caption">
                      <strong>Title:</strong> {videoInfo.title}
                    </p>
                    {videoInfo.duration && (
                      <p className="fluent-caption">
                        <strong>Duration:</strong> {Math.floor(videoInfo.duration / 60)}m{' '}
                        {videoInfo.duration % 60}s
                      </p>
                    )}
                    {videoInfo.uploader && (
                      <p className="fluent-caption">
                        <strong>Uploader:</strong> {videoInfo.uploader}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button onClick={handleReset} variant="outline" className="w-full">
              Upload Another Video
            </Button>
          </div>
        )}

        {uploadState === 'error' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="fluent-body font-medium text-foreground">Upload failed</p>
                <p className="fluent-caption mt-1">{errorMessage}</p>
              </div>
            </div>
            <Button onClick={handleReset} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
