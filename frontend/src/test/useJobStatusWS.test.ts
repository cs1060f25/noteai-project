import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useJobStatusWS } from "@/hooks/useJobStatusWS";

// --- Minimal mock WebSocket implementation ---
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  url: string;

  constructor(url: string) {
    this.url = url;
    // @ts-expect-error allow storing in static for tests
    MockWebSocket.instances.push(this);
    // async open to mimic browser behavior
    setTimeout(() => this.onopen?.(new Event("open")), 0);
  }

  send(_data: string) { /* noop for tests */ }
  close() {
    setTimeout(() => this.onclose?.(new CloseEvent("close")), 0);
  }

  // helper: deliver a JSON message to listeners
  __emitMessage(obj: any) {
    const ev = new MessageEvent("message", { data: JSON.stringify(obj) });
    this.onmessage?.(ev);
  }

  // helper: force error/close
  __emitError() {
    this.onerror?.(new Event("error"));
  }
  __emitClose() {
    this.onclose?.(new CloseEvent("close"));
  }
}

// Replace global WebSocket during these tests
beforeEach(() => {
  // @ts-expect-error override for test
  global.WebSocket = MockWebSocket as any;
  MockWebSocket.instances.length = 0;
});

describe("useJobStatusWS", () => {
  it("streams progress frames and completes", async () => {
    const jobId = "job-123";
    const { result } = renderHook(() => useJobStatusWS(jobId, { baseUrl: "http://localhost:8000" }));

    // Wait for socket to open
    await waitFor(() => {
      expect(result.current.connectionState === "open" || result.current.isLoading).toBeTruthy();
    });

    // Send a progress frame
    const ws = MockWebSocket.instances[0]!;
    act(() => {
      ws.__emitMessage({
        job_id: jobId,
        current_stage: "generating",
        progress_percent: 42,
        progress_message: "Compiling highlights…",
        eta_seconds: 120,
      });
    });

    await waitFor(() => expect(result.current.data?.percent).toBe(42));
    expect(result.current.data?.stage).toBe("generating");

    // Send completion
    act(() => {
      ws.__emitMessage({
        job_id: jobId,
        current_stage: "completed",
        progress_percent: 100,
        progress_message: "Done",
        eta_seconds: 0,
      });
    });

    await waitFor(() => expect(result.current.data?.stage).toBe("complete"));
    await waitFor(() => expect(result.current.connectionState).toBe("closed"));
  });
});