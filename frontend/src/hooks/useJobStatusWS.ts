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
  enabled?: boolean;         // default true
  baseUrl?: string;          // optional http(s) base; derived from window.location if omitted
  maxBackoffMs?: number;     // default 10000
  initialBackoffMs?: number; // default 1000
};

/**
 * WebSocket-based job status hook with reconnection & backoff.
 * Monotonic: percent never decreases; stage never regresses.
 */
export function useJobStatusWS(jobId: string | null, opts: Options = {}) {
  const {
    enabled = true,
    baseUrl = "",
    maxBackoffMs = 10_000,
    initialBackoffMs = 1_000,
  } = opts;

  const [data, setData] = useState<NormalizedStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [state, setState] = useState<"idle" | "connecting" | "open" | "closed" | "error">("idle");

  const done = useMemo(
    () => data?.stage === "complete" || data?.stage === "failed",
    [data]
  );

  const wsRef = useRef<WebSocket | null>(null);
  const cancelledRef = useRef(false);
  const backoffRef = useRef<number>(initialBackoffMs);
  const reconnectTimerRef = useRef<number | null>(null);

  // Monotonic trackers
  const lastPercentRef = useRef<number>(0);
  const lastStageRef = useRef<UiStage>("uploading");
  const stageOrder: Record<UiStage, number> = {
    uploading: 0,
    preparing: 1,
    generating: 2,
    complete: 3,
    failed: 3, // treat failed as terminal like complete
  };

  // Reset trackers whenever jobId changes
  useEffect(() => {
    lastPercentRef.current = 0;
    lastStageRef.current = "uploading";
    setData(null);
    setError(null);
    setState("idle");
  }, [jobId]);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!jobId || !enabled || done) return;

    function connect() {
      if (cancelledRef.current) return;

      // Derive ws(s) URL from current origin by default
      const wsBase = (baseUrl || window.location.origin).replace(/^http/i, "ws");
      const url = `${wsBase}/api/v1/jobs/${encodeURIComponent(jobId)}/ws`;

      setState("connecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelledRef.current) return;
        setState("open");
        setError(null);
        backoffRef.current = initialBackoffMs; // reset backoff on successful open
      };

      ws.onmessage = (ev) => {
        if (cancelledRef.current) return;

        try {
          const json = JSON.parse(ev.data);
          const next = normalize(json);

          // If we've already finished, ignore further frames
          if (done) return;

          // Enforce monotonic percent
          const prevPercent = lastPercentRef.current;
          if (typeof next.percent === "number" && next.percent < prevPercent) {
            // ignore out-of-order or restarted stream values
            return;
          }

          // Enforce non-regressing stage
          const prevStage = lastStageRef.current;
          const mergedStage =
            stageOrder[next.stage] >= stageOrder[prevStage] ? next.stage : prevStage;

          const merged: NormalizedStatus = {
            ...next,
            stage: mergedStage,
            percent: Math.max(prevPercent, next.percent),
          };

          // Update trackers and state
          lastPercentRef.current = merged.percent;
          lastStageRef.current = merged.stage;

          setData(merged);
          setError(null);

          if (
            merged.stage === "complete" ||
            merged.stage === "failed" ||
            merged.percent >= 100
          ) {
            ws.close();
          }
        } catch (e: any) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      };

      ws.onerror = () => {
        if (cancelledRef.current) return;
        setState("error");
      };

      ws.onclose = () => {
        if (cancelledRef.current) return;

        // If job is done, mark closed and stop
        if (done) {
          setState("closed");
          return;
        }

        // Otherwise schedule a reconnect with backoff + jitter
        setState("closed");

        const base = Math.min(backoffRef.current, maxBackoffMs);
        const jitter = Math.floor(Math.random() * (base / 2)); // 0..50% jitter
        const delay = base + jitter;

        reconnectTimerRef.current = window.setTimeout(() => {
          // Exponential backoff for next time
          backoffRef.current = Math.min(base * 2, maxBackoffMs);
          connect();
        }, delay);
      };
    }

    connect();
    // re-connect if jobId/baseUrl change
  }, [jobId, enabled, done, baseUrl, initialBackoffMs, maxBackoffMs]);

  const isLoading = state === "connecting" || (state === "open" && !data);

  return {
    data,
    isLoading,
    error,
    done,
    connectionState: state, // "idle" | "connecting" | "open" | "closed" | "error"
  };
}