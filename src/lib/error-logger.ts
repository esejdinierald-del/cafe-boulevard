import { supabase } from "@/integrations/supabase/client";

type Severity = "info" | "warning" | "error" | "critical";

let installed = false;

async function logToDb(severity: Severity, message: string, metadata: Record<string, unknown> = {}) {
  try {
    await supabase.from("app_logs").insert({
      severity,
      event: message.slice(0, 500),
      metadata: {
        message,
        ...metadata,
        url: typeof window !== "undefined" ? window.location.href : null,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        ts: new Date().toISOString(),
      },
    });
  } catch (e) {
    // Do not throw from the logger itself
    console.warn("[error-logger] failed to persist", e);
  }
}

export function logError(message: string, metadata: Record<string, unknown> = {}) {
  return logToDb("error", message, metadata);
}

export function logCritical(message: string, metadata: Record<string, unknown> = {}) {
  return logToDb("critical", message, metadata);
}

export function logInfo(message: string, metadata: Record<string, unknown> = {}) {
  return logToDb("info", message, metadata);
}

export function installGlobalErrorLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (ev) => {
    logToDb("error", ev.message || "window.onerror", {
      filename: ev.filename,
      lineno: ev.lineno,
      colno: ev.colno,
      stack: ev.error?.stack,
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const reason = ev.reason;
    const msg = typeof reason === "string" ? reason : reason?.message || "unhandledrejection";
    logToDb("error", msg, { stack: reason?.stack });
  });
}