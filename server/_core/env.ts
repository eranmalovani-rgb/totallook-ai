export const ENV = {
  appId: process.env.VITE_APP_ID ?? "totallook",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Railway: These are no longer needed but kept for backward compat
  // They will be empty strings on Railway - code handles gracefully
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Site URL for deep links
  siteUrl: process.env.SITE_URL ?? process.env.VITE_APP_URL ?? "https://totallook.ai",
};
