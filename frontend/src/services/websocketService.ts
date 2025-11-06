import type { JobProgress, ProcessingStage } from '../types/api';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage {
  type: 'progress' | 'error' | 'complete';
  job_id: string;
  progress?: JobProgress;
  error?: string;
  timestamp: string;
}

export interface WebSocketCallbacks {
  onProgress?: (progress: JobProgress) => void;
  onComplete?: (jobId: string) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private jobId: string;
  private callbacks: WebSocketCallbacks;
  private status: WebSocketStatus = 'disconnected';
  private sessionToken: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;

  constructor(jobId: string, callbacks: WebSocketCallbacks, sessionToken: string | null = null) {
    this.jobId = jobId;
    this.callbacks = callbacks;
    this.sessionToken = sessionToken;
  }

  public connect(): void {
    this.isIntentionallyClosed = false;
    this.updateStatus('connecting');

    try {
      // Build WebSocket URL with job_id and optional token
      const url = new URL(`${WS_BASE_URL}/jobs/${this.jobId}`);
      if (this.sessionToken) {
        url.searchParams.append('token', this.sessionToken);
      }

      this.ws = new WebSocket(url.toString());

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.updateStatus('error');
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    console.log('[WebSocket] Connected to job:', this.jobId);
    this.reconnectAttempts = 0;
    this.updateStatus('connected');
    this.startHeartbeat();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      if (import.meta.env.DEV) {
        console.log('[WebSocket] Message received:', message);
      }

      switch (message.type) {
        case 'progress':
          if (message.progress && this.callbacks.onProgress) {
            this.callbacks.onProgress(message.progress);
          }
          break;

        case 'complete':
          console.log('[WebSocket] Job completed:', message.job_id);
          if (this.callbacks.onComplete) {
            this.callbacks.onComplete(message.job_id);
          }
          this.disconnect();
          break;

        case 'error':
          console.error('[WebSocket] Job error:', message.error);
          if (this.callbacks.onError && message.error) {
            this.callbacks.onError(message.error);
          }
          break;

        default:
          console.warn('[WebSocket] Unknown message type:', message);
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  private handleError(event: Event): void {
    console.error('[WebSocket] Error:', event);
    this.updateStatus('error');
  }

  private handleClose(event: CloseEvent): void {
    console.log('[WebSocket] Connection closed:', event.code, event.reason);
    this.stopHeartbeat();
    this.updateStatus('disconnected');

    // Attempt reconnection if not intentionally closed and not a normal closure
    if (!this.isIntentionallyClosed && event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      if (this.callbacks.onError) {
        this.callbacks.onError('Failed to maintain connection after multiple attempts');
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

    console.log(
      `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    // Send ping every 30 seconds to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private updateStatus(status: WebSocketStatus): void {
    this.status = status;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status);
    }
  }

  public disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }

    this.updateStatus('disconnected');
  }

  public getStatus(): WebSocketStatus {
    return this.status;
  }
}

// Hook for easy React integration
export const createJobWebSocket = (
  jobId: string,
  callbacks: WebSocketCallbacks,
  sessionToken: string | null = null
): WebSocketService => {
  return new WebSocketService(jobId, callbacks, sessionToken);
};
