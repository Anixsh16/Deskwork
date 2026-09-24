import { supabaseBrowser } from "@/lib/supabase/client";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function token(): Promise<string> {
  const { data } = await supabaseBrowser().auth.getSession();
  return data.session?.access_token ?? "";
}

async function handleAuthFailure(status: number) {
  if (typeof window === "undefined") return;
  if (status === 401) {
    await supabaseBrowser().auth.signOut({ scope: "local" });
    window.location.href = "/login";
  } else if (status === 403 && !window.location.pathname.startsWith("/not-enabled")) {
    window.location.href = "/not-enabled";
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${await token()}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Can't reach the Deskwork server. Is it running?");
  }
  if (!res.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = "Please check the form and try again.";
    } catch {}
    if (res.status === 401 || res.status === 403) await handleAuthFailure(res.status);
    throw new ApiError(res.status, message);
  }
  return res;
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function upload<T = unknown>(path: string, form: FormData): Promise<T> {
  return api<T>(path, { method: "POST", body: form });
}

export async function download(path: string, fallbackName: string) {
  const res = await apiFetch(path);
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export type StreamHandlers = {
  onMeta?: (data: { user_message: unknown; assistant_message_id: string }) => void;
  onSources?: (sources: Source[]) => void;
  onDelta?: (text: string) => void;
  onError?: (message: string) => void;
};

export async function streamChat(chatId: string, content: string, attachmentIds: string[], h: StreamHandlers, retry = false) {
  const res = await apiFetch(`/chats/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, attachment_ids: attachmentIds, retry }),
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = /^event: (.*)$/m.exec(block)?.[1];
      const dataLine = /^data: (.*)$/m.exec(block)?.[1];
      if (!event || dataLine === undefined) continue;
      const data = JSON.parse(dataLine);
      if (event === "meta") h.onMeta?.(data);
      else if (event === "sources") h.onSources?.(data);
      else if (event === "delta") h.onDelta?.(data);
      else if (event === "error") h.onError?.(data.message);
    }
  }
}

export type Source = { file_id: string; filename: string; page_start: number; page_end: number };
