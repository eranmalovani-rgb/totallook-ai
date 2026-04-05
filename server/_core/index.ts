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

  // Redirect www to non-www
  app.use((req, res, next) => {
    const host = req.headers.host || "";
    if (host.startsWith("www.")) {
      const nonWwwHost = host.replace(/^www\./, "");
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      return res.redirect(301, `${protocol}://${nonWwwHost}${req.originalUrl}`);
    }
    next();
  });

  // Health check endpoint for Railway
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth routes (email + password)
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

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`[Startup] NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`[Startup] DATABASE_URL: ${process.env.DATABASE_URL ? "configured" : "NOT SET"}`);
    console.log(`[Startup] OPENAI_API_KEY: ${(process.env.OPENAI_API_KEY ?? "").length > 0 ? "configured" : "NOT SET"}`);
    console.log(`[Startup] R2/S3 Storage: ${(process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME) ? "configured" : "NOT SET"}`);
  });
}

startServer().catch(console.error);
