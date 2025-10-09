import { useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  videoKey: string;
  poster?: string;
  className?: string;
  apiBaseUrl?: string;
}

interface PresignedUrlResponse {
  url: string;
  expires_in: number;
  object_key: string;
}

export const VideoPlayer = ({
  videoKey,
  poster,
  className,
  apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000',
}: VideoPlayerProps) => {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPresignedUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${apiBaseUrl}/api/v1/videos/presigned-url?key=${encodeURIComponent(videoKey)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to load video');
        }

        const data: PresignedUrlResponse = await response.json();
        setPresignedUrl(data.url);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load video';
        setError(errorMessage);
        console.error('Error fetching pre-signed URL:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPresignedUrl();
  }, [videoKey, apiBaseUrl]);

  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-0">
          <div className="animate-pulse bg-gray-200 w-full h-64 rounded-lg flex items-center justify-center">
            <div className="text-gray-500 text-sm">Loading video...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="text-red-500 text-center">
            <svg
              className="w-12 h-12 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-semibold mb-2">Failed to load video</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!presignedUrl) {
    return null;
  }

  return (
    <Card className={cn('w-full overflow-hidden', className)}>
      <CardContent className="p-0">
        <video
          src={presignedUrl}
          poster={poster}
          controls
          preload="metadata"
          playsInline
          className="w-full h-auto"
        >
          Your browser does not support video playback.
        </video>
      </CardContent>
    </Card>
  );
};
