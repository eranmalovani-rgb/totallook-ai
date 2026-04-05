const explicitCookieSecret =
  process.env.JWT_SECRET ?? process.env.COOKIE_SECRET ?? "";

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "totallook",
  // If JWT_SECRET is missing in production, fall back to DATABASE_URL-derived
  // entropy so auth does not crash with a zero-length key.
  cookieSecret:
    explicitCookieSecret ||
    process.env.DATABASE_URL ||
    `${process.env.VITE_APP_ID ?? "totallook"}-fallback-secret`,
  hasExplicitCookieSecret: explicitCookieSecret.length > 0,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Site URL for deep links
  siteUrl: process.env.SITE_URL ?? process.env.VITE_APP_URL ?? "https://totallook.ai",
  // OAuth providers
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  appleClientId: process.env.APPLE_CLIENT_ID ?? "",
  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
};
