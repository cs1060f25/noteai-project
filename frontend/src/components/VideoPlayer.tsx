import { useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/clerk-api';

interface VideoPlayerProps {
  videoKey: string;
  poster?: string;
  className?: string;
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
}: VideoPlayerProps) => {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPresignedUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await apiClient.get<PresignedUrlResponse>(
          `/videos/presigned-url?key=${encodeURIComponent(videoKey)}`
        );

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
  }, [videoKey]);

  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-0">
          <div className="animate-pulse bg-muted w-full h-64 rounded-xl flex items-center justify-center">
            <div className="fluent-caption">Loading video...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="text-destructive text-center">
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
            <p className="fluent-subtitle mb-2">Failed to load video</p>
            <p className="fluent-caption">{error}</p>
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
          className="w-full h-auto rounded-xl"
        >
          Your browser does not support video playback.
        </video>
      </CardContent>
    </Card>
  );
};
