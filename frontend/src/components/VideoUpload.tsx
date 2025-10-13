import { useState, useRef, useCallback } from 'react';

import { Upload, CheckCircle2, XCircle, Loader2, FileVideo } from 'lucide-react';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { cn } from '../lib/utils';
import { uploadVideo, validateVideoFile, UploadError } from '../services/uploadService';

interface VideoUploadProps {
  onUploadComplete?: (jobId: string, s3Key: string) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export const VideoUpload = ({ onUploadComplete, onUploadError, className }: VideoUploadProps) => {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
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

  const handleReset = () => {
    setSelectedFile(null);
    setUploadState('idle');
    setProgress(0);
    setErrorMessage('');
    setJobId('');
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
          Upload your lecture video to generate highlight clips with subtitles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedFile && uploadState === 'idle' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            )}
            onClick={handleBrowseClick}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-700 mb-2">Drag and drop your video here</p>
            <p className="text-sm text-gray-500 mb-4">or click to browse</p>
            <p className="text-xs text-gray-400">Supports MP4, MOV, AVI, MKV, WebM (max 2GB)</p>
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
          <div className="flex items-start gap-4 p-4 border rounded-lg bg-gray-50">
            <FileVideo className="w-10 h-10 text-blue-500 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Remove
            </Button>
          </div>
        )}

        {selectedFile && uploadState === 'idle' && (
          <Button onClick={handleUpload} className="w-full" size="lg">
            <Upload className="w-4 h-4 mr-2" />
            Start Upload
          </Button>
        )}

        {uploadState === 'uploading' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Uploading video...</p>
                <p className="text-xs text-gray-500">{progress}% complete</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {uploadState === 'success' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900">Upload successful!</p>
                <p className="text-sm text-green-700 mt-1">
                  Your video is now processing. Job ID: <code className="text-xs">{jobId}</code>
                </p>
              </div>
            </div>
            <Button onClick={handleReset} variant="outline" className="w-full">
              Upload Another Video
            </Button>
          </div>
        )}

        {uploadState === 'error' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Upload failed</p>
                <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
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
