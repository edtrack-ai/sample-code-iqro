/**
 * WebSocket helpers with automatic reconnection.
 *
 * Two connection types:
 *  1. Roadmap progress: ws://.../ws/roadmaps/{id}/progress/
 *  2. Lesson stream:    ws://.../ws/lessons/{id}/stream/
 */

const RAW_BASE = (import.meta.env.VITE_API_URL || "https://api.iqro.online").replace(/\/$/, "");
const WS_BASE = RAW_BASE.replace(/^http/, "ws");

function getToken(): string | null {
  const stored = localStorage.getItem("edtrack-auth");
  if (!stored) return null;
  try {
    const token = JSON.parse(stored)?.state?.accessToken ?? null;
    if (token) {
      // DEBUG: Log the identity inside the token to catch mismatches
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log(`[WS] Token Identity (email): ${payload.email || payload.username || payload.user_id}`);
      } catch { /* ignore parse error */ }
    }
    return token;
  } catch {
    return null;
  }
}

function buildUrl(path: string): string {
  const token = getToken();
  const url = `${WS_BASE}${path}`;
  if (!token) {
    console.warn(`[WS] Connecting WITHOUT token to ${path}`);
    return url;
  }
  // Double protection: Token in query string
  return `${url}?token=${encodeURIComponent(token)}`;
}

// ─── Generic reconnecting WebSocket ──────────────────────

interface ReconnectingWSOptions {
  /** Can be a static URL string or a factory function that returns a fresh URL (useful for refreshing tokens). */
  url: string | (() => string);
  onMessage: (event: { type: string; payload: unknown }) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: Event) => void;
  /** Called on fatal auth/permission errors — stops reconnection. */
  onFatalError?: (message: string) => void;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface WSHandle {
  close: () => void;
}

function createReconnectingWS({
  url: urlOrFactory,
  onMessage,
  onOpen,
  onClose,
  onError,
  onFatalError,
  maxRetries = 10,
  retryDelayMs = 2000,
}: ReconnectingWSOptions): WSHandle {
  let ws: WebSocket | null = null;
  let retries = 0;
  let closed = false;
  let reconnectTimer: number | null = null;

  function connect() {
    if (closed) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);

    // Close existing if "connecting" or "open" to ensure a clean start
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      ws.close();
    }

    const token = getToken();
    const resolvedUrl = typeof urlOrFactory === "function" ? urlOrFactory() : urlOrFactory;
    if (token) {
      ws = new WebSocket(resolvedUrl, [token]);
    } else {
      ws = new WebSocket(resolvedUrl);
    }

    ws.onopen = () => {
      retries = 0;
      onOpen?.();
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const type = data.event ?? data.type ?? "unknown";
        const payload = data.payload ?? data;

        // Handle fatal error events from backend (auth/permission denied, AI failure)
        if (type === "error") {
          const p = payload as { message?: string; detail?: string };
          const msg = p.detail ?? p.message ?? "Unknown error";
          console.warn(`[WS] Fatal error from server: ${msg}`);
          closed = true; // Stop reconnection
          onFatalError?.(msg);
          ws?.close();
          return;
        }

        onMessage({ type, payload });
      } catch { /* ignore */ }
    };

    ws.onclose = (event) => {
      if (closed) return;
      onClose?.();

      // Don't reconnect if it was a "clean" shutdown by the server (e.g. 1000)
      if (event.code === 1000) return;

      if (retries < maxRetries) {
        // Exponential backoff: delay * 1.5 ^ retries, capped at 30s
        const backoffDelay = Math.min(30000, retryDelayMs * Math.pow(1.5, retries));
        retries++;
        reconnectTimer = window.setTimeout(connect, backoffDelay);
      }
    };

    ws.onerror = (err) => {
      onError?.(err);
      ws?.close();
    };
  }

  // Handle mobile app switching / tab backgrounding
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      // If we are closed but not by choice, and not at max retries, try reconnecting immediately
      if (!closed && (!ws || ws.readyState === WebSocket.CLOSED)) {
        retries = 0; // Reset retries to try again immediately when returning
        connect();
      }
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);

  connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      ws?.close();
    },
  };
}

// ─── Roadmap Progress WS ────────────────────────────────

export type RoadmapProgressStatus = "analyzing" | "planning" | "saving" | "ready" | "is_partial" | "failed";

export interface RoadmapProgressPayload {
  generated_count?: number;
  total_count?: number;
  generated_lessons_count?: number;
  total_lessons_count?: number;
  status: RoadmapProgressStatus;
  remaining_credits?: number;
  // The backend now streams the full roadmap object in progress events
  id?: number;
  topic?: string;
  lessons?: unknown[];
  [key: string]: unknown;
}

export interface RoadmapProgressCallbacks {
  onProgress: (payload: RoadmapProgressPayload) => void;
  onDone?: (payload: RoadmapProgressPayload) => void;
  onError?: (err: Event) => void;
}

export function connectRoadmapProgress(
  roadmapId: number,
  callbacks: RoadmapProgressCallbacks,
): WSHandle {
  return createReconnectingWS({
    url: () => buildUrl(`/ws/roadmaps/${roadmapId}/progress/`),
    onMessage: ({ type, payload }) => {
      const p = payload as RoadmapProgressPayload;
      // Normalize count fields (backend may send either naming)
      if (p.generated_lessons_count != null && p.generated_count == null) {
        p.generated_count = p.generated_lessons_count;
      }
      if (p.total_lessons_count != null && p.total_count == null) {
        p.total_count = p.total_lessons_count;
      }
      // Accept "progress" events AND flat payloads (type "unknown") that have a status field
      if (type === "progress" || p.status) {
        callbacks.onProgress(p);
        if (p.status === "ready" || p.status === "is_partial") {
          callbacks.onDone?.(p);
        }
      }
    },
    onError: callbacks.onError,
  });
}

// ─── Lesson Stream WS ──────────────────────────────────

export interface PlaygroundStatusPayload {
  status: string;
  has_playground: boolean;
}

export interface LessonStreamCallbacks {
  onChunk: (content: string) => void;
  onContentReady?: (content: string) => void;
  onMetadataReady: (lesson: Record<string, unknown>) => void;
  onPlaygroundStatus?: (payload: PlaygroundStatusPayload) => void;
  onDone?: () => void;
  onError?: (err: Event) => void;
  onFatalError?: (msg: string) => void;
}

export function connectLessonStream(
  lessonId: number,
  callbacks: LessonStreamCallbacks,
): WSHandle {
  return createReconnectingWS({
    url: () => buildUrl(`/ws/lessons/${lessonId}/stream/`),
    onMessage: ({ type, payload }) => {
      switch (type) {
        case "chunk": {
          const p = payload as { content?: string };
          if (typeof p.content === "string") {
            callbacks.onChunk(p.content);
          }
          break;
        }
        case "content_ready": {
          // Sent on connection if lesson was already generated
          const p = payload as { content?: string };
          if (typeof p.content === "string") {
            callbacks.onContentReady?.(p.content);
          }
          break;
        }
        case "metadata_ready": {
          callbacks.onMetadataReady(payload as Record<string, unknown>);
          break;
        }
        case "playground_status": {
          callbacks.onPlaygroundStatus?.(payload as PlaygroundStatusPayload);
          break;
        }
        case "done": {
          callbacks.onDone?.();
          break;
        }
      }
    },
    onError: callbacks.onError,
    onFatalError: callbacks.onFatalError,
  });
}
