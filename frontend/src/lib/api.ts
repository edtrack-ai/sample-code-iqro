const BASE_URL = (import.meta.env.VITE_API_URL || "https://api.iqro.online").replace(/\/$/, "");

import { useAuthStore } from "./authStore";

function getAuthState(): { accessToken: string | null; refreshToken: string | null } {
  try {
    const state = useAuthStore.getState();
    if (state.accessToken) {
      return { accessToken: state.accessToken, refreshToken: state.refreshToken };
    }
  } catch {}

  try {
    const stored = localStorage.getItem("edtrack-auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.accessToken) {
        return {
          accessToken: parsed.state.accessToken,
          refreshToken: parsed.state.refreshToken,
        };
      }
    }
  } catch {}

  return { accessToken: null, refreshToken: null };
}

function getToken(): string | null {
  return getAuthState().accessToken;
}

/** Update tokens in the persisted zustand store */
function setTokens(access: string, refresh: string) {
  try {
    useAuthStore.setState({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
  } catch {}
  const stored = localStorage.getItem("edtrack-auth");
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
    if (parsed?.state) {
      parsed.state.accessToken = access;
      parsed.state.refreshToken = refresh;
      parsed.state.isAuthenticated = true;
    }
    localStorage.setItem("edtrack-auth", JSON.stringify(parsed));
  } catch { /* ignore */ }
}

function clearAuth() {
  const stored = localStorage.getItem("edtrack-auth");
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
    if (parsed?.state) {
      parsed.state.accessToken = null;
      parsed.state.refreshToken = null;
      parsed.state.isAuthenticated = false;
      parsed.state.user = null;
      parsed.state.creditBalance = 0;
      parsed.state.plan = "Free";
      parsed.state.planFeatures = [];
    }
    localStorage.setItem("edtrack-auth", JSON.stringify(parsed));
  } catch { /* ignore */ }
  
  try {
    // Dynamically import authStore to prevent circular import crashes
    import("./authStore").then((m) => {
      m.useAuthStore.getState().logout();
      if (typeof window !== "undefined" && window.location.pathname !== "/auth" && window.location.pathname !== "/") {
        window.location.href = "/auth?mode=login";
      }
    });
  } catch { /* ignore */ }
}

// Mutex to avoid multiple simultaneous refresh attempts
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken } = getAuthState();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.access) {
        setTokens(data.access, data.refresh ?? refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  let activeLang = "uz";
  try {
    const stored = localStorage.getItem("edtrack-lang");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.lang) {
        activeLang = parsed.state.lang;
      }
    }
  } catch {}

  const headers: Record<string, string> = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Accept-Language": activeLang,
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(url, { ...options, headers, cache: "no-store" });

  if (res.status === 401) {
    if (token) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        const newToken = getToken();
        if (newToken) headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(url, { ...options, headers, cache: "no-store" });
      } else {
        clearAuth();
      }
    } else {
      clearAuth();
    }
  }

  return res;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  // Extract active language from localStorage edtrack-lang zustand store
  let activeLang = "uz";
  try {
    const stored = localStorage.getItem("edtrack-lang");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.lang) {
        activeLang = parsed.state.lang;
      }
    }
  } catch {}

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Accept-Language": activeLang,
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers, cache: "no-store" });

  // On 401, try refreshing the token once if possible, otherwise clear auth state
  if (res.status === 401) {
    if (token) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        const newToken = getToken();
        if (newToken) headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(`${BASE_URL}${path}`, { ...options, headers, cache: "no-store" });
      } else {
        clearAuth();
      }
    } else {
      clearAuth();
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  /** Human-readable message from the backend */
  detail: string;
  /** Optional machine-readable error code */
  code: string | undefined;

  constructor(status: number, body: Record<string, unknown>) {
    const detail =
      typeof body?.detail === "string"
        ? body.detail
        : `Something went wrong (${status})`;
    super(detail);
    this.status = status;
    this.body = body;
    this.detail = detail;
    this.code = typeof body?.code === "string" ? body.code : undefined;
  }

  get isUnauthorized() { return this.status === 401; }
  get isPaymentRequired() { return this.status === 402; }
  get isNotFound() { return this.status === 404; }
  get isBadRequest() { return this.status === 400; }
}

/** Extract a user-friendly message from any caught error */
export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.detail;
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred";
}

/** Check if error is a 402 payment-required / out-of-credits error */
export function isCreditsError(err: unknown): boolean {
  return err instanceof ApiError && err.isPaymentRequired;
}

// ─── Auth ────────────────────────────────────────────────
export interface RegisterPayload {
  full_name: string;
  email: string;
  password1: string;
  password2: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: { pk: number; email: string; first_name: string };
}

export const authApi = {
  register: (data: RegisterPayload) =>
    request<{ detail: string }>("/auth/registration/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: LoginPayload) =>
    request<LoginResponse>("/auth/login/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyEmail: (email: string, code: string) =>
    request<{ detail: string }>("/auth/verify-email/", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  googleLogin: (access_token: string) =>
    request<LoginResponse>("/users/social/google/", {
      method: "POST",
      body: JSON.stringify({ access_token }),
    }),
};

// ─── User Profile ────────────────────────────────────────
export interface UserProfile {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  credit_balance: number;
  plan: "Free" | "Pro" | "Expert";
  plan_features: string[];
  date_joined: string;
}

export const userApi = {
  getProfile: (timezone?: string) =>
    request<UserProfile>(`/users/profile/${timezone ? `?timezone=${encodeURIComponent(timezone)}` : ""}`),
  updateProfile: (data: { first_name?: string; last_name?: string }) =>
    request<UserProfile>("/users/profile/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ─── Billing / Payments ─────────────────────────────────
export interface Tier {
  id: number;
  name: string;
  price: string;
  credit_discount_percent: number;
  features: string[];
}

export interface BonusRule {
  min_credits: number;
  bonus_credits: number;
}

export interface PaymentConfig {
  pricing: { price_per_credit_usd: string };
  exchange_rate: { usd_to_uzs: string };
  bonus_rules: BonusRule[];
  user_discount_percent: number;
}

export interface CreditPack {
  id: number;
  name: string;
  credits: number;
  price: string;
  description: string;
  is_active: boolean;
}

export interface CheckoutResponse {
  url: string;
}

export interface Transaction {
  id: number;
  amount: string;
  currency: string;
  transaction_type: "subscription" | "one_time";
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const paymentsApi = {
  getConfig: () => request<PaymentConfig>("/payments/config/"),
  getTiers: () => request<Tier[]>("/payments/tiers/"),
  getPacks: () => request<CreditPack[]>("/payments/packs/"),
  getHistory: () => request<Transaction[]>("/payments/history/"),
  createPayment: (payload: { credits?: number; pack_id?: number; tier_id?: number }) =>
    request<CheckoutResponse>("/payments/create-payment/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

// ─── Roadmaps ────────────────────────────────────────────
export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface QuizData {
  questions: QuizQuestion[];
}

export interface GenerateQuizResponse {
  quiz: QuizData;
  is_cached: boolean;
}

export interface SubmitQuizResponse {
  id: number;
  user: number;
  lesson: number;
  task_index: number;
  is_correct: boolean;
  score: number;
  created_at: string;
}

export type LessonMode = "MATH" | "LANGUAGE" | "CODE" | "GENERAL";

export interface Flashcard {
  id: number;
  type: "IMAGE_TO_TEXT" | "TEXT_TO_TRANSLATION" | "TEXT_TO_TEXT";
  front_content: string;
  back_content: string;
  phonetic?: string;
  mastery_level: number;
  image_url?: string;
  lesson?: number;
  lesson_title?: string;
  roadmap_id?: number;
  roadmap_title?: string;
}

export interface CodeEditorConfig {
  initial_code: string;
  tests: string[];
}

export interface GraphPlotterConfig {
  type: string;
  x_range?: [number, number];
  y_range?: [number, number];
}

export type PlaygroundStatus = "not_started" | "generating" | "ready" | "failed";

export interface PlaygroundMetadata {
  type: "dynamic_bundle";
  html_bundle: string;
}

export interface ApiLesson {
  id: number;
  title: string;
  duration: string;
  description: string;
  is_unlocked: boolean;
  is_preview?: boolean;
  is_completed: boolean;
  week_number?: number;
  week_title?: string;
  mode?: LessonMode;
  content?: string;
  quiz?: QuizData | null;
  last_quiz_score?: number | null;
  // Dynamic playground (new contract)
  playground_status?: PlaygroundStatus;
  has_playground?: boolean;
  playground_code?: string;
  // Legacy dynamic playground
  playground?: PlaygroundMetadata;
  // LANGUAGE mode
  flashcards?: Flashcard[];
  // MATH mode
  latex_formulas?: string[];
  graph_plotter?: GraphPlotterConfig;
  // CODE mode
  language?: string;
  code_editor?: CodeEditorConfig;
}

export interface ApiRoadmap {
  id: number;
  topic: string;
  status: "generating" | "ready" | "is_partial";
  total_estimated_hours: number;
  difficulty: string;
  lessons: ApiLesson[];
  total_lessons_count?: number;
  generated_lessons_count?: number;
  created_at?: string;
  is_purchased?: boolean;
  is_fully_generated?: boolean;
}

export interface GenerateRoadmapResponse {
  roadmap_id: number;
  id: number;
  status: string;
  detail: string;
  topic?: string;
  lessons?: ApiLesson[];
  [key: string]: unknown;
}

export interface LessonChatResponse {
  interaction_id: number;
  text_explanation: string;
  playground_code?: string;
}

export interface ChatHistoryItem {
  user_msg: string;
  ai_msg: string;
  created_at: string;
  attachments?: {
    id: number;
    url: string;
    original_name?: string;
    name?: string;
    type?: string;
    file_type?: string;
  }[];
}

export const roadmapApi = {
  list: () => request<ApiRoadmap[]>("/roadmap/roadmaps/"),

  generate: (topic: string, mode?: LessonMode, sourceIds?: number[]) =>
    request<GenerateRoadmapResponse>("/roadmap/generate/", {
      method: "POST",
      body: JSON.stringify({
        topic,
        ...(mode && { mode }),
        ...(sourceIds && { source_ids: sourceIds }),
      }),
    }),

  uploadSource: (sourceType: 'FILE' | 'URL' | 'TEXT', payload: { file?: File; url?: string; text_content?: string }) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    if (sourceType === 'FILE' && payload.file) {
      const formData = new FormData();
      formData.append("source_type", "FILE");
      formData.append("file", payload.file);
      return fetchWithAuth(`${BASE_URL}/roadmap/sources/upload/`, {
        method: "POST",
        headers,
        body: formData,
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new ApiError(res.status, body);
        }
        return res.json();
      });
    } else {
      return request<any>("/roadmap/sources/upload/", {
        method: "POST",
        body: JSON.stringify({
          source_type: sourceType,
          url: payload.url,
          text_content: payload.text_content,
        }),
      });
    }
  },

  listSources: () => request<any[]>("/roadmap/sources/"),

  getDetails: (id: number) =>
    request<ApiRoadmap>(`/roadmap/roadmaps/${id}/`),

  unlockLesson: (lessonId: number) =>
    request<{ status: string; detail: string }>(
      `/roadmap/lessons/${lessonId}/unlock/`,
      { method: "POST" }
    ),

  chatLesson: (lessonId: number, userQuery: string, selectedText?: string) =>
    request<LessonChatResponse>(`/roadmap/lessons/${lessonId}/chat/`, {
      method: "POST",
      body: JSON.stringify({
        user_query: userQuery,
        selected_text: selectedText || "",
      }),
    }),

  multimodalChatLesson: (lessonId: number, formData: FormData) => {
    const token = getToken();
    const headers: Record<string, string> = {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    // We intentionally DO NOT set Content-Type here; the browser needs to set it to multipart/form-data with the correct boundary
    return fetchWithAuth(`${BASE_URL}/roadmap/lessons/${lessonId}/chat/multimodal/`, {
      method: "POST",
      headers,
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body);
      }
      return res.json() as Promise<{
        interaction_id: number;
        text_explanation: string;
        usage_details: { tokens: number; credits_spent: number };
        new_balance: number;
      }>;
    });
  },

  getChatHistory: (lessonId: number) =>
    request<ChatHistoryItem[]>(`/roadmap/lessons/${lessonId}/history/`),

  submitTask: (lessonId: number, userAnswer: unknown) =>
    request<{ detail: string }>(`/roadmap/lessons/${lessonId}/submit-task/`, {
      method: "POST",
      body: JSON.stringify({ user_answer: userAnswer }),
    }),

  generateQuiz: (lessonId: number) =>
    request<GenerateQuizResponse>(`/roadmap/lessons/${lessonId}/quiz/generate/`, {
      method: "POST",
    }),

  submitQuiz: (lessonId: number, score: number) =>
    request<SubmitQuizResponse>(`/roadmap/lessons/${lessonId}/quiz/submit/`, {
      method: "POST",
      body: JSON.stringify({
        task_index: 999,
        is_correct: score >= 80,
        score,
      }),
    }),

  getFlashcardsForReview: () =>
    request<Flashcard[]>("/roadmap/flashcards/review/"),

  setLessonMode: (lessonId: number, mode: LessonMode) =>
    request<ApiLesson>(`/roadmap/lessons/${lessonId}/set-mode/`, {
      method: "POST",
      body: JSON.stringify({ mode }),
    }),

  continueGenerating: (roadmapId: number) =>
    request<GenerateRoadmapResponse>(
      `/roadmap/roadmaps/${roadmapId}/continue/`,
      { method: "POST" }
    ),

  generatePlayground: (lessonId: number) =>
    request<{ detail: string }>(`/roadmap/lessons/${lessonId}/generate-playground/`, {
      method: "POST",
    }),

  deleteRoadmap: (roadmapId: number) =>
    request<Record<string, never>>(`/roadmap/roadmaps/${roadmapId}/delete/`, {
      method: "DELETE",
    }),
};

// ─── SSE streaming helpers ───────────────────────────────

export interface SSECallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
  onMeta?: (metadata: Record<string, unknown>) => void;
}

/**
 * Shared SSE response processor.
 * Supports typed events (chunk/meta/done) and legacy format as fallback.
 * Never adds whitespace or newlines — passes chunks exactly as received.
 */
async function processSSEStream(
  res: Response,
  { onChunk, onDone, onError, onMeta }: SSECallbacks,
): Promise<void> {
  if (!res.ok || !res.body) {
    // Try to extract standardized error JSON from the response
    let detail = `Stream failed: ${res.status}`;
    try {
      const errorBody = await res.json();
      if (typeof errorBody?.detail === "string") detail = errorBody.detail;
    } catch { /* use default */ }
    onError(detail);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  while (true) {
    try {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    } catch (err) {
      console.error("SSE Stream error:", err);
      break;
    }

    while (true) {
      const newlineIdx = buffer.indexOf("\n");
      if (newlineIdx === -1) break;
      const line = buffer.slice(0, newlineIdx).trimEnd();
      buffer = buffer.slice(newlineIdx + 1);

      // Empty line = end of SSE event block, reset event type
      if (line === "") {
        currentEvent = "";
        continue;
      }

      // Capture event type
      if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
        continue;
      }

      if (!line.startsWith("data:")) continue;
      const data = line.startsWith("data: ") ? line.slice(6) : line.slice(5);

      // ── Typed event handling (new backend format) ──
      switch (currentEvent) {
        case "chunk": {
          try {
            const parsed = JSON.parse(data);

            if (typeof parsed?.content === "string") {
              onChunk(parsed.content);
            } else if (typeof parsed?.delta === "string") {
              onChunk(parsed.delta);
            } else if (typeof parsed === "string") {
              onChunk(parsed);
            }
          } catch {
            if (data) onChunk(data);
          }
          continue;
        }
        case "meta": {
          try {
            const metadata = JSON.parse(data);
            onMeta?.(metadata);
          } catch { /* ignore malformed meta */ }
          continue;
        }
        case "done": {
          onDone();
          return;
        }
        case "error": {
          try {
            const parsed = JSON.parse(data);
            onError(parsed?.detail || parsed?.message || data);
          } catch {
            onError(data);
          }
          return;
        }
      }

      if (data === "[END]") { onDone(); return; }
      if (data.startsWith("[ERROR]")) { onError(data); return; }

      let content = "";
      try {
        const parsed = JSON.parse(data);
        content = parsed?.choices?.[0]?.delta?.content ?? parsed?.content ?? parsed?.text ?? "";
        if (!content && typeof parsed === "string") content = parsed;
      } catch {
        // Not JSON - use raw data if it doesn't look like an SSE control line
        if (!data.includes(":") || data.startsWith("data:")) {
          content = data.startsWith("data:") ? data.slice(5).trim() : data;
        }
      }

      if (content) onChunk(content);
    }
  }

  // Flush remaining buffer if it contains data
  if (buffer.trim()) {
    const line = buffer.trim();
    if (line.startsWith("data:")) {
      const data = line.startsWith("data: ") ? line.slice(6) : line.slice(5);
      if (data !== "[END]" && !data.startsWith("[ERROR]")) {
        try {
          const parsed = JSON.parse(data);
          const content = parsed?.choices?.[0]?.delta?.content ?? parsed?.content ?? parsed?.text ?? data;
          if (content && typeof content === "string") onChunk(content);
        } catch {
          onChunk(data);
        }
      }
    }
  }

  onDone();
}

/** Stream roadmap generation via POST SSE — emits lesson cards in real-time */
export async function streamRoadmapGeneration(
  topic: string,
  mode: LessonMode | undefined,
  callbacks: {
    onLesson: (lesson: ApiLesson) => void;
    onRoadmapMeta: (meta: Partial<ApiRoadmap>) => void;
    onDone: (roadmap: ApiRoadmap) => void;
    onError: (err: string) => void;
  },
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetchWithAuth(`${BASE_URL}/roadmap/generate/stream/`, {
    method: "POST",
    headers,
    body: JSON.stringify({ topic, ...(mode && { mode }) }),
  });

  if (!res.ok || !res.body) {
    callbacks.onError(`Stream failed: ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";
  const lessons: ApiLesson[] = [];
  let roadmapMeta: Partial<ApiRoadmap> = {};

  while (true) {
    try {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    } catch (err) {
      console.error("SSE Roadmap Stream error:", err);
      break;
    }

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx).trimEnd();
      buffer = buffer.slice(newlineIdx + 1);

      if (line === "") { currentEvent = ""; continue; }
      if (line.startsWith("event:")) { currentEvent = line.slice(6).trim(); continue; }
      if (!line.startsWith("data:")) continue;
      const data = line.startsWith("data: ") ? line.slice(6) : line.slice(5);

      switch (currentEvent) {
        case "lesson": {
          try {
            const lesson = JSON.parse(data) as ApiLesson;
            lessons.push(lesson);
            callbacks.onLesson(lesson);
          } catch { /* skip malformed */ }
          continue;
        }
        case "meta": {
          try {
            roadmapMeta = { ...roadmapMeta, ...JSON.parse(data) };
            callbacks.onRoadmapMeta(roadmapMeta);
          } catch { /* skip */ }
          continue;
        }
        case "done": {
          try {
            const final = JSON.parse(data) as ApiRoadmap;
            callbacks.onDone(final);
          } catch {
            // Construct from accumulated data
            callbacks.onDone({
              id: roadmapMeta.id || 0,
              topic,
              status: "ready",
              total_estimated_hours: roadmapMeta.total_estimated_hours || 0,
              difficulty: roadmapMeta.difficulty || "Intermediate",
              lessons,
            } as ApiRoadmap);
          }
          return;
        }
      }

      // Legacy fallback: try parsing as lesson
      if (data === "[END]") {
        callbacks.onDone({
          id: roadmapMeta.id || 0,
          topic,
          status: "ready",
          total_estimated_hours: roadmapMeta.total_estimated_hours || 0,
          difficulty: roadmapMeta.difficulty || "Intermediate",
          lessons,
        } as ApiRoadmap);
        return;
      }
      if (data.startsWith("[ERROR]")) { callbacks.onError(data); return; }
    }
  }

  // Stream ended without explicit done event
  if (lessons.length > 0) {
    callbacks.onDone({
      id: roadmapMeta.id || 0,
      topic,
      status: "ready",
      total_estimated_hours: roadmapMeta.total_estimated_hours || 0,
      difficulty: roadmapMeta.difficulty || "Intermediate",
      lessons,
    } as ApiRoadmap);
  }
}

/** Stream lesson content via GET SSE */
export async function streamLessonContent(
  lessonId: number,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  onMeta?: (metadata: Record<string, unknown>) => void,
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = { Accept: "text/event-stream" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetchWithAuth(`${BASE_URL}/roadmap/lessons/${lessonId}/stream/`, { headers });
  return processSSEStream(res, { onChunk, onDone, onError, onMeta });
}

/** Stream chat response via POST SSE */
export async function streamChatResponse(
  lessonId: number,
  userQuery: string,
  selectedText: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  onMeta?: (metadata: Record<string, unknown>) => void,
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetchWithAuth(`${BASE_URL}/roadmap/lessons/${lessonId}/chat/stream/`, {
    method: "POST",
    headers,
    body: JSON.stringify({ user_query: userQuery, selected_text: selectedText || "" }),
  });
  return processSSEStream(res, { onChunk, onDone, onError, onMeta });
}

// ─── Polling helper ──────────────────────────────────────
export async function pollRoadmapUntilReady(
  roadmapId: number,
  onProgress?: (roadmap: ApiRoadmap) => void,
  intervalMs = 2000,
  maxAttempts = 60
): Promise<ApiRoadmap> {
  for (let i = 0; i < maxAttempts; i++) {
    const data = await roadmapApi.getDetails(roadmapId);
    onProgress?.(data);
    if (data.status === "ready" || data.status === "is_partial") return data;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Roadmap generation timed out");
}

// ─── Marketplace APIs ────────────────────────────────────
export interface Course {
  id: number;
  roadmap: number;
  creator: number;
  creator_username: string;
  creator_full_name?: string;
  roadmap_topic: string;
  title: string;
  description: string;
  price: string;
  discount_percent?: number;
  banner_url: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  lessons_count: number;
  is_owned: boolean;
  roadmap_details?: {
    id: number;
    topic: string;
    total_estimated_hours: number;
    difficulty: string;
    total_lessons_count: number;
    lessons: ApiLesson[];
  };
}

export interface PromoCodeResponse {
  valid: boolean;
  code: string;
  discount_percent: number;
  discount_amount: string;
  final_price: string;
  promo_id: number;
}

export const marketplaceApi = {
  listCourses: () => request<Course[]>("/roadmap/courses/"),
  getCourse: (courseId: number) => request<Course>(`/roadmap/courses/${courseId}/`),
  deleteCourse: (courseId: number) => request<{ detail: string }>(`/roadmap/courses/${courseId}/`, { method: "DELETE" }),
  updateCourse: (courseId: number, data: { title?: string; description?: string; price?: number; discount_percent?: number; banner_url?: string }) =>
    request<Course>(`/roadmap/courses/${courseId}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getCreatorAnalytics: () => request<{ total_earnings: number; total_courses_count: number; total_sales_count: number; courses: any[]; sales_log: any[] }>("/roadmap/courses/creator-analytics/"),
  addPromoCode: (courseId: number, code: string, discountPercent: number) => request<{ id: number; code: string; discount_percent: number; is_active: boolean; detail: string }>(`/roadmap/courses/${courseId}/promo-codes/`, { method: "POST", body: JSON.stringify({ code, discount_percent: discountPercent }) }),
  deletePromoCode: (courseId: number, promoId: number) => request<{ detail: string }>(`/roadmap/courses/${courseId}/promo-codes/`, { method: "DELETE", body: JSON.stringify({ promo_id: promoId }) }),
  createCourse: (data: { roadmap: number; title: string; description: string; price: number; banner_url?: string; is_published?: boolean }) =>
    request<Course>("/roadmap/courses/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  validatePromo: (courseId: number, code: string) =>
    request<PromoCodeResponse>(`/roadmap/courses/${courseId}/validate-promo/`, {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  purchaseCourse: (courseId: number, promoId?: number) =>
    request<{ detail: string; purchase_id: number; roadmap_id: number }>(`/roadmap/courses/${courseId}/purchase/`, {
      method: "POST",
      body: JSON.stringify({ promo_id: promoId }),
    }),
  getPurchaseHistory: () =>
    request<any[]>("/roadmap/courses/purchase-history/"),
  editCourseLesson: (lessonId: number, data: { content?: string; title?: string; description?: string; is_preview?: boolean; quiz?: any }) =>
    request<{ detail: string }>(`/roadmap/courses/lessons/${lessonId}/edit/`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  generateBanner: (title: string, topic: string) =>
    request<{ banner_url: string }>("/roadmap/courses/generate-banner/", {
      method: "POST",
      body: JSON.stringify({ title, topic }),
    }),
  withdraw: (amount: number) =>
    request<{ detail: string; new_balance: number }>("/roadmap/courses/withdraw/", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  generateFlashcardImage: (lessonId: number, flashcardId?: number) =>
    request<{ detail: string; flashcard?: Flashcard; flashcards?: Flashcard[] }>("/roadmap/courses/flashcards/generate-image/", {
      method: "POST",
      body: JSON.stringify({ lesson_id: lessonId, flashcard_id: flashcardId }),
    }),
};
