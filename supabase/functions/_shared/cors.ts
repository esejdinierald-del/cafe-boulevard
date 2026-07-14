// Origin-scoped CORS helper for admin-sensitive endpoints.
// Falls back to the request origin only when it matches a known allowlist
// (production, custom domain, Lovable preview sandboxes, or localhost dev).

const EXACT_ALLOW = new Set<string>([
  "https://boulevard-caffe.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
]);

const REGEX_ALLOW: RegExp[] = [
  /^https:\/\/id-preview--[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
];

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (EXACT_ALLOW.has(origin)) return true;
  return REGEX_ALLOW.some((r) => r.test(origin));
}

export function adminCorsHeaders(req: Request, extraAllowHeaders = ""): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowOrigin = isAllowedOrigin(origin) ? origin! : "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type" + (extraAllowHeaders ? ", " + extraAllowHeaders : ""),
    "Vary": "Origin",
  };
  if (allowOrigin) headers["Access-Control-Allow-Origin"] = allowOrigin;
  return headers;
}