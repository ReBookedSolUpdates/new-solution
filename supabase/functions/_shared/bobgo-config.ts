// Centralized BobGo API configuration
//
// Environment is determined by x-production header from frontend:
// - "true" → LIVE → BOBGO_API_KEY, BOBGO_BASE_URL
// - "false" → UPGRADING/TEST → PRODUCTION_BOBGO_API_KEY, PRODUCTION_BOBGO_BASE_URL
//
// The frontend passes import.meta.env.VITE_PRODUCTION via x-production header

/**
 * Parse environment variable as boolean
 * Normalizes by trimming and lowercasing before comparison
 */
function parseEnvBool(value?: string): boolean {
  if (!value) {
    return false;
  }
  return value.trim().toLowerCase() === 'true';
}

export function getBobGoConfig(req: Request) {
  // Read environment from frontend-passed header
  const isLive = parseEnvBool(req.headers.get("x-production") || undefined);

  const apiKey = isLive
    ? Deno.env.get("BOBGO_API_KEY")
    : Deno.env.get("PRODUCTION_BOBGO_API_KEY");

  const baseUrlEnv = isLive
    ? Deno.env.get("BOBGO_BASE_URL")
    : Deno.env.get("PRODUCTION_BOBGO_BASE_URL");

  const baseUrl = resolveBaseUrl(baseUrlEnv || "");

  return {
    apiKey: apiKey?.trim() || "",
    baseUrl,
    isLive,
    hasApiKey: !!(apiKey && apiKey.trim()),
    apiKeyEnvName: isLive ? "BOBGO_API_KEY" : "PRODUCTION_BOBGO_API_KEY",
    baseUrlEnvName: isLive ? "BOBGO_BASE_URL" : "PRODUCTION_BOBGO_BASE_URL",
  };
}

function resolveBaseUrl(env: string): string {
  const cleaned = env.trim().replace(/\/+$/, "");
  
  if (!cleaned) {
    return "https://api.bobgo.co.za/v2";
  }
  
  // Handle sandbox URL correction
  if (cleaned.includes("sandbox.bobgo.co.za") && !cleaned.includes("api.sandbox.bobgo.co.za")) {
    return "https://api.sandbox.bobgo.co.za/v2";
  }
  
  // Ensure /v2 suffix
  if (cleaned.includes("bobgo.co.za") && !/\/v2$/.test(cleaned)) {
    return cleaned + "/v2";
  }
  
  return cleaned;
}
