const IS_PRODUCTION = Deno.env.get("VITE_PRODUCTION") === "true";

export function getShippingConfig() {
  const tcgBaseUrl = Deno.env.get("TCG_BASE_URL") || "";
  const sandboxTcgBaseUrl = Deno.env.get("SANDBOX_TCG_BASE_URL") || "https://api.shiplogic.com";
  
  const tcgApiKey = Deno.env.get("TCG_API_KEY") || "";
  const sandboxTcgApiKey = Deno.env.get("SANDBOX_TCG_API_KEY") || tcgApiKey;

  const apiUrl = IS_PRODUCTION ? tcgBaseUrl : sandboxTcgBaseUrl;
  const apiKey = IS_PRODUCTION ? tcgApiKey : sandboxTcgApiKey;
  const providerName = IS_PRODUCTION ? "The Courier Guy" : "ShipLogic";

  return {
    isProduction: IS_PRODUCTION,
    apiUrl: apiUrl.replace(/\/+$/, ""),
    apiKey,
    providerName,
  };
}
