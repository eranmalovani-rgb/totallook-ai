const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const PREVIEW_HOST_SUFFIXES = [".manus.space", ".manus.computer"];

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function decodeBase64(input: string): string | null {
  try {
    return Buffer.from(input, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function decodeBase64Url(input: string): string | null {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = normalized.length % 4;
  const padded = padLength === 0 ? normalized : `${normalized}${"=".repeat(4 - padLength)}`;
  return decodeBase64(padded);
}

function normalizeOrigin(origin: string): string | null {
  const parsed = parseUrl(origin);
  if (!parsed) return null;
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const originalHost = parsed.hostname.toLowerCase();
  const host = originalHost.startsWith("www.") ? originalHost.slice(4) : originalHost;
  const isLocal = LOCAL_HOSTS.has(host);
  if (!isLocal && parsed.protocol !== "https:") return null;

  const normalizedProtocol = isLocal ? parsed.protocol : "https:";
  const normalizedPort = isLocal && parsed.port ? `:${parsed.port}` : "";
  return `${normalizedProtocol}//${host}${normalizedPort}`;
}

function isAllowedReturnHost(host: string, siteHost: string) {
  if (host === siteHost) return true;
  if (LOCAL_HOSTS.has(host)) return true;
  if (host === "totallook.ai") return true;
  if (PREVIEW_HOST_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix))) {
    return true;
  }
  return false;
}

export function getCanonicalSiteOrigin(siteUrl: string): string {
  return normalizeOrigin(siteUrl) || "https://totallook.ai";
}

export function sanitizeReturnPath(input: unknown): string {
  if (typeof input !== "string") return "/";
  const path = input.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path || "/";
}

export function resolveReturnOrigin(input: unknown, siteUrl: string): string {
  const siteOrigin = getCanonicalSiteOrigin(siteUrl);
  if (typeof input !== "string" || !input.trim()) return siteOrigin;

  const normalized = normalizeOrigin(input.trim());
  if (!normalized) return siteOrigin;

  const parsed = parseUrl(normalized);
  if (!parsed) return siteOrigin;

  const siteHost = new URL(siteOrigin).hostname.toLowerCase();
  const host = parsed.hostname.toLowerCase();

  if (!isAllowedReturnHost(host, siteHost)) return siteOrigin;
  return parsed.origin;
}

export function encodeOAuthState(payload: { returnPath: string; origin: string }): string {
  const body = JSON.stringify({
    v: 1,
    returnPath: sanitizeReturnPath(payload.returnPath),
    origin: payload.origin,
  });
  return Buffer.from(body, "utf8").toString("base64");
}

export function decodeOAuthState(input: unknown): { returnPath: string; origin?: string } {
  if (typeof input !== "string" || !input.trim()) {
    return { returnPath: "/" };
  }

  const raw = input.trim();
  if (raw.startsWith("/")) {
    return { returnPath: sanitizeReturnPath(raw) };
  }

  const decodedCandidates = [decodeBase64(raw), decodeBase64Url(raw), raw];
  for (const decoded of decodedCandidates) {
    if (!decoded) continue;
    try {
      const parsed = JSON.parse(decoded) as {
        returnPath?: unknown;
        origin?: unknown;
        returnOrigin?: unknown;
      };

      const returnPath = sanitizeReturnPath(parsed.returnPath);
      const origin =
        typeof parsed.origin === "string"
          ? parsed.origin
          : typeof parsed.returnOrigin === "string"
            ? parsed.returnOrigin
            : undefined;

      return origin ? { returnPath, origin } : { returnPath };
    } catch {
      continue;
    }
  }

  return { returnPath: "/" };
}
