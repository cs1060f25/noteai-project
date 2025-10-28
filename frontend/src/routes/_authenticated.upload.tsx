import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Video } from "lucide-react";

import { VideoPlayer } from "@/components/VideoPlayer";
import { VideoUpload } from "@/components/VideoUpload";
import JobProgress from "@/components/JobProgress";
import { useJobStatus } from "@/hooks/useJobStatus";

const UploadComponent = () => {
  const [uploadedJobId, setUploadedJobId] = useState<string | null>(null);
  const [uploadedVideoKey, setUploadedVideoKey] = useState<string | null>(null);

  const handleUploadComplete = (jobId: string, s3Key: string) => {
    console.log("Upload complete! Job ID:", jobId, "S3 Key:", s3Key);
    setUploadedJobId(jobId);
    setUploadedVideoKey(s3Key);
  };

  const handleUploadError = (error: Error) => {
    console.error("Upload failed:", error);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="fluent-title text-3xl text-foreground mb-2">
          Upload New Lecture
        </h1>
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

      {/* DEV ONLY: simulate processing without backend */}
      {!uploadedJobId && (
        <button
          type="button"
          onClick={() => {
            // Clear any previous progress, then start a new simulated job
            setUploadedJobId(null);
            setTimeout(() => setUploadedJobId(`dev-${Date.now()}`), 0);
          }}
          className="text-xs px-3 py-1.5 rounded-md border border-dashed border-gray-500/40 text-gray-400 hover:text-gray-200"
        >
          ▶ Simulate processing (dev)
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
              <h3 className="fluent-subtitle text-lg text-foreground mb-1">
                Upload Successful!
              </h3>
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

      {/* Processing Progress Section */}
      {uploadedJobId && (
        <section className="mt-6">
          <h3 className="text-sm font-semibold mb-2">Processing</h3>
          <UploadProgressBlock
            jobId={uploadedJobId}
            onClear={() => setUploadedJobId(null)}
          />
        </section>
      )}

      {/* Video Player */}
      {uploadedVideoKey && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Video className="w-4 h-4 text-accent-foreground" />
            </div>
            <h2 className="fluent-title text-2xl text-foreground">
              Uploaded Video
            </h2>
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

function UploadProgressBlock({
  jobId,
  onClear,
}: {
  jobId: string;
  onClear?: () => void;
}) {
  const { data, isLoading, error } = useJobStatus(jobId);

  if (isLoading && !data) {
    return <p className="text-sm text-muted-foreground">Checking status…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-red-600">
        Couldn’t fetch status. Retrying automatically…
      </p>
    );
  }
  if (!data) return null;

  const handleViewResults = () => {
    // Reset after completion so next simulation starts cleanly
    onClear?.();
    window.location.href = "/library";
  };

  return (
    <JobProgress
      percent={data.percent}
      stage={data.stage}
      message={data.message}
      etaSeconds={data.etaSeconds}
      onViewResults={
        data.stage === "complete" ? handleViewResults : undefined
      }
    />
  );
}

export const Route = createFileRoute("/_authenticated/upload")({
  component: UploadComponent,
});