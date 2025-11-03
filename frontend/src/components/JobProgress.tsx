import * as React from "react";

type Stage =
  | "uploading"
  | "preparing"
  | "generating"
  | "complete"
  | "failed";

export type JobProgressProps = {
  percent: number; // 0–100
  stage: Stage;
  message?: string;
  etaSeconds?: number | null;
  onViewResults?: () => void;
};

const stageLabel: Record<Stage, string> = {
  uploading: "Uploading Media",
  preparing: "Preparing Analysis",
  generating: "Generating Highlights",
  complete: "Complete",
  failed: "Failed",
};

export default function JobProgress({
  percent,
  stage,
  message,
  etaSeconds,
  onViewResults,
}: JobProgressProps) {
  const pct = Math.max(0, Math.min(100, Math.round(percent || 0)));

  return (
    <div role="status" aria-live="polite" className="w-full max-w-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{stageLabel[stage]}</span>
        <span className="text-xs tabular-nums">{pct}%</span>
      </div>

      <div className="h-2 w-full rounded bg-gray-200">
        <div
          className="h-2 rounded bg-blue-500 transition-[width]"
          style={{ width: `${pct}%` }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          role="progressbar"
        />
      </div>

      {message && <p className="text-xs text-gray-600">{message}</p>}

      {typeof etaSeconds === "number" &&
        Number.isFinite(etaSeconds) &&
        etaSeconds > 0 && (
          <p className="text-[11px] text-gray-500">
            {/* round up, but never show 0 */}
            ETA ~{Math.max(1, Math.ceil(etaSeconds / 60))} min
          </p>
      )}

      {stage === "complete" && onViewResults && (
        <button
          onClick={onViewResults}
          className="mt-2 rounded-md px-3 py-1.5 text-sm bg-green-600 text-white"
        >
          View results
        </button>
      )}
    </div>
  );
}
