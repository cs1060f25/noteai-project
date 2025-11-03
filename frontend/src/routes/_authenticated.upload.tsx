import { useState } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { Video } from 'lucide-react';

import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoUpload } from '@/components/VideoUpload';

import JobProgress from "@/components/JobProgress";
import { useJobStatus } from "@/hooks/useJobStatus";
import { useJobStatusWS } from "@/hooks/useJobStatusWS";

const UploadComponent = () => {
  const [uploadedJobId, setUploadedJobId] = useState<string | null>(null);
  const [uploadedVideoKey, setUploadedVideoKey] = useState<string | null>(null);

  const handleUploadComplete = (jobId: string, s3Key: string) => {
    console.log('Upload complete! Job ID:', jobId, 'S3 Key:', s3Key);
    setUploadedJobId(jobId);
    setUploadedVideoKey(s3Key);
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload failed:', error);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="fluent-title text-3xl text-foreground mb-2">Upload New Lecture</h1>
        <p className="fluent-body text-muted-foreground">
          Upload your lecture videos and generate highlight clips with subtitles
        </p>
      </div>

      {/* Upload Component */}
      <VideoUpload
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
        className="fluent-layer-3 fluent-hover-lift fluent-reveal"
      />

      {/* DEV ONLY: simulate WebSocket (non-dev) */}
      {!uploadedJobId && (
        <button
          type="button"
          onClick={() => setUploadedJobId(`job-${Date.now()}`)}
          className="text-xs px-3 py-1.5 rounded-md border border-dashed border-emerald-500/40 text-emerald-600 hover:text-emerald-800 ml-3"
        >
          ▶ Simulate WS (non-dev)
        </button>
      )}

      {/* Upload Success Message */}
      {uploadedJobId && (
        <div className="fluent-layer-2 border-l-4 border-l-primary p-6 rounded-xl fluent-reveal">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="fluent-subtitle text-lg text-foreground mb-1">Upload Successful!</h3>
              <p className="fluent-body text-muted-foreground mb-3">
                Your video has been uploaded and processing will begin shortly.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="fluent-caption">Job ID:</span>
                <code className="bg-accent px-2 py-1 rounded-md text-xs font-mono text-foreground">
                  {uploadedJobId}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {uploadedJobId && (
        <section className="mt-6">
          <h3 className="text-sm font-semibold mb-2">Processing</h3>
          <UploadProgressBlock jobId={uploadedJobId} />
        </section>
      )}

      {/* Video Player */}
      {uploadedVideoKey && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Video className="w-4 h-4 text-accent-foreground" />
            </div>
            <h2 className="fluent-title text-2xl text-foreground">Uploaded Video</h2>
          </div>
          <VideoPlayer
            videoKey={uploadedVideoKey}
            className="fluent-layer-3 fluent-hover-lift fluent-reveal"
          />
        </div>
      )}
    </div>
  );
};

function UploadProgressBlock({ jobId }: { jobId: string }) {
  // Keep your dev simulation exactly as before
  const isDevSim = jobId.startsWith("dev-");

  // Optional API base URL for WS (e.g., set in .env.development)
  const apiBase = import.meta.env?.VITE_API_BASE_URL as string | undefined;

  // 1) Try WebSocket first (unless dev-sim)
  const ws = useJobStatusWS(isDevSim ? null : jobId, {
    enabled: !isDevSim,
    baseUrl: apiBase, // if undefined, hook falls back to window.location
  });

  // 2) Fall back to polling if WS fails/closes without having produced data
  const shouldPoll =
    isDevSim ||
    (!ws.data && (ws.connectionState === "error" || ws.connectionState === "closed"));

  const poll = useJobStatus(shouldPoll ? jobId : null, {
    enabled: shouldPoll,
    intervalMs: 3000,
  });

  const data = ws.data ?? poll.data;
  const isLoading = ws.isLoading || poll.isLoading;
  const error = ws.error ?? poll.error;

  if (isLoading && !data) {
    return <p className="text-sm text-muted-foreground">Checking status…</p>;
  }

  if (error && !data) {
    return (
      <p className="text-sm text-red-600">
        Couldn’t fetch status. Retrying automatically…
      </p>
    );
  }

  if (!data) return null;

  return (
    <JobProgress
      percent={data.percent}
      stage={data.stage}
      message={data.message}
      etaSeconds={data.etaSeconds}
      onViewResults={
        data.stage === "complete"
          ? () => {
              // Replace with your actual results route if different
              window.location.href = "/library";
            }
          : undefined
      }
    />
  );
}

export const Route = createFileRoute('/_authenticated/upload')({
  component: UploadComponent,
});