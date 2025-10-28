import { useEffect, useMemo, useRef, useState } from "react";
import { getJobStatus } from "@/services/uploadService";

type UiStage = "uploading" | "preparing" | "generating" | "complete" | "failed";

export type NormalizedStatus = {
  percent: number;
  stage: UiStage;
  message?: string;
  etaSeconds?: number | null;
  raw?: any;
};

const stageMap: Record<string, UiStage> = {
  uploading: "uploading",
  queued: "preparing",
  stage_one: "preparing",
  preparing: "preparing",
  stage_two: "generating",
  generating: "generating",
  completed: "complete",
  complete: "complete",
  failed: "failed",
};

function normalize(res: any): NormalizedStatus {
  const stage = stageMap[(res?.current_stage ?? "").toLowerCase()] ?? "preparing";
  const percent = Math.max(0, Math.min(100, Math.round(res?.progress_percent ?? 0)));
  return {
    percent,
    stage,
    message: res?.progress_message ?? "",
    etaSeconds: typeof res?.eta_seconds === "number" ? res.eta_seconds : null,
    raw: res,
  };
}

type Options = {
  intervalMs?: number; // default 3000
  enabled?: boolean;   // default true
};

export function useJobStatus(jobId: string | null, opts: Options = {}) {
  const { intervalMs = 3000, enabled = true } = opts;

  const [data, setData] = useState<NormalizedStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(jobId));
  const [error, setError] = useState<Error | null>(null);

  const timerRef = useRef<number | null>(null);
  const done = useMemo(() => data?.stage === "complete" || data?.stage === "failed", [data]);

  useEffect(() => {
    if (!jobId || !enabled) return;

    let cancelled = false;

    async function tick() {
      try {
        setIsLoading(true);
        const res = await getJobStatus(jobId);
        if (cancelled) return;
        const norm = normalize(res);
        setData(norm);
        setError(null);

        // stop polling if job finished/failed
        if (norm.stage === "complete" || norm.stage === "failed") {
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        // keep polling; transient errors are okay
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    // initial fetch immediately
    tick();

    // set interval for polling
    timerRef.current = window.setInterval(tick, intervalMs);

    // cleanup on unmount or jobId change
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [jobId, intervalMs, enabled]);

  return { data, isLoading, error, done };
}