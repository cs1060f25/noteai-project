import { useEffect, useMemo, useRef, useState } from "react";

/** Keep UI stage names identical to your existing hook */
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
    etaSeconds: Number.isFinite(res?.eta_seconds) ? res.eta_seconds : null,
    raw: res,
  };
}

type Options = {
  /** default true — allows you to toggle off from callers */
  enabled?: boolean;
  /**
   * Optional override for base URL.
   * Typically leave blank so it derives from window.location.
   * Example: "http://localhost:8000"
   */
  baseUrl?: string;
};

/**
 * WebSocket-based job status hook.
 * Scaffold v1:
 * - Connects once
 * - Streams JSON messages and normalizes them
 * - Exposes connection state
 * - Cleanly closes on unmount or when job completes/fails
 * (Reconnection/backoff comes in Step 2.)
 */
export function useJobStatusWS(jobId: string | null, opts: Options = {}) {
  const { enabled = true, baseUrl = "" } = opts;

  const [data, setData] = useState<NormalizedStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [state, setState] = useState<"idle" | "connecting" | "open" | "closed" | "error">("idle");

  const done = useMemo(
    () => data?.stage === "complete" || data?.stage === "failed",
    [data]
  );

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!jobId || !enabled || done) return;

    let cancelled = false;

    // Derive ws(s) URL from current origin by default
    const wsBase = (baseUrl || window.location.origin).replace(/^http/i, "ws");
    const url = `${wsBase}/api/v1/jobs/${encodeURIComponent(jobId)}/ws`;

    setState("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (cancelled) return;
      setState("open");
    };

    ws.onmessage = (ev) => {
      if (cancelled) return;
      try {
        const json = JSON.parse(ev.data);
        const norm = normalize(json);
        setData(norm);
        setError(null);
        if (norm.stage === "complete" || norm.stage === "failed") {
          ws.close();
        }
      } catch (e: any) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    };

    ws.onerror = () => {
      if (cancelled) return;
      setState("error");
      // leave socket to onclose; caller can decide on fallback
    };

    ws.onclose = () => {
      if (cancelled) return;
      setState("closed");
    };

    return () => {
      cancelled = true;
      try {
        ws.close();
      } catch {
        /* noop */
      }
      wsRef.current = null;
    };
  }, [jobId, enabled, done, baseUrl]);

  const isLoading = state === "connecting" || (state === "open" && !data);

  return {
    data,
    isLoading,
    error,
    done,
    connectionState: state, // "idle" | "connecting" | "open" | "closed" | "error"
  };
}