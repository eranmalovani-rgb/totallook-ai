import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerInstagramWebhook } from "../instagram";
import { registerWhatsAppWebhook } from "../whatsapp";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { runAutoMigrations } from "../auto-migrate";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Redirect www to non-www to prevent OAuth redirect URI mismatches
  app.use((req, res, next) => {
    const host = req.headers.host || "";
    if (host.startsWith("www.")) {
      const nonWwwHost = host.replace(/^www\./, "");
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      return res.redirect(301, `${protocol}://${nonWwwHost}${req.originalUrl}`);
    }
    next();
  });
  // Debug endpoint to check env vars (temporary)
  app.get("/api/debug-env", (req, res) => {
    const openaiKey = (process.env.OPENAI_API_KEY ?? "").trim();
    const forgeKey = (process.env.BUILT_IN_FORGE_API_KEY ?? "").trim();
    res.json({
      openaiKeyPresent: openaiKey.length > 0,
      openaiKeyLength: openaiKey.length,
      openaiKeyPrefix: openaiKey.substring(0, 7) || "none",
      forgeKeyPresent: forgeKey.length > 0,
      forgeKeyLength: forgeKey.length,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // Test LLM endpoint (temporary diagnostic)
  app.get("/api/test-llm", async (req, res) => {
    try {
      const { invokeLLM } = await import("./llm");
      console.log("[Test LLM] Starting test call...");
      const result = await invokeLLM({
        messages: [
          { role: "user", content: "Say hello in 3 words" },
        ],
      });
      const content = result.choices?.[0]?.message?.content || "no content";
      console.log("[Test LLM] Success:", content);
      res.json({ success: true, response: content, model: result.model });
    } catch (err: any) {
      console.error("[Test LLM] Failed:", err.message);
      res.status(500).json({ success: false, error: err.message?.substring(0, 500) });
    }
  });

  // Test LLM with vision endpoint (temporary diagnostic)
  app.get("/api/test-llm-vision", async (req, res) => {
    try {
      const { invokeLLM } = await import("./llm");
      const testImageUrl = "https://picsum.photos/id/237/200/300.jpg";
      console.log("[Test LLM Vision] Starting test call...");
      const result = await invokeLLM({
        messages: [
          { role: "user", content: [
            { type: "text", text: "What do you see? Answer in 5 words." },
            { type: "image_url", image_url: { url: testImageUrl } },
          ] },
        ],
      });
      const content = result.choices?.[0]?.message?.content || "no content";
      console.log("[Test LLM Vision] Success:", content);
      res.json({ success: true, response: content, model: result.model });
    } catch (err: any) {
      console.error("[Test LLM Vision] Failed:", err.message);
      res.status(500).json({ success: false, error: err.message?.substring(0, 500) });
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Instagram Story Mentions webhook
  registerInstagramWebhook(app);
  // WhatsApp Fashion Analysis webhook
  registerWhatsAppWebhook(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Run auto-migrations before starting to listen (fire-and-forget, non-blocking)
  runAutoMigrations().catch(err => console.error("[AutoMigrate] Failed:", err?.message));

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Diagnostic: log API key availability at startup
    const openaiKey = (process.env.OPENAI_API_KEY ?? "").trim();
    const forgeKey = (process.env.BUILT_IN_FORGE_API_KEY ?? "").trim();
    console.log(`[Startup Diag] OPENAI_API_KEY: ${openaiKey.length > 0 ? `present (${openaiKey.length} chars, ${openaiKey.substring(0, 7)}...)` : "NOT SET"}`);
    console.log(`[Startup Diag] BUILT_IN_FORGE_API_KEY: ${forgeKey.length > 0 ? `present (${forgeKey.length} chars)` : "NOT SET"}`);
    console.log(`[Startup Diag] NODE_ENV: ${process.env.NODE_ENV}`);
  });
}

startServer().catch(console.error);
