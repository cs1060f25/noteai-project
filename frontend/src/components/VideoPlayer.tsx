import { useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/clerk-api';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  videoKey: string;
  poster?: string;
  className?: string;
  subtitleUrl?: string | null;
}

interface PresignedUrlResponse {
  url: string;
  expires_in: number;
  object_key: string;
}

export const VideoPlayer = ({ videoKey, poster, className, subtitleUrl }: VideoPlayerProps) => {
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
          key={`${videoKey}-${subtitleUrl}`}
          src={presignedUrl}
          poster={poster}
          controls
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
          className="w-full h-auto rounded-xl"
          onLoadedMetadata={(e) => {
            // Ensure subtitle track is enabled when video loads
            const video = e.currentTarget;
            if (video.textTracks.length > 0) {
              video.textTracks[0].mode = 'showing';
            }
          }}
        >
          {subtitleUrl && (
            <track
              kind="subtitles"
              src={subtitleUrl}
              srcLang="en"
              label="English"
              default
            />
          )}
          Your browser does not support video playback.
        </video>
      </CardContent>
    </Card>
  );
};
