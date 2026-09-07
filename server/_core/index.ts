import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { sql } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { nativeCors } from "./cors";
import { scheduledJobAuth } from "./scheduledAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getDb } from "../db";
import { startDailyReminderScheduler } from "../pushNotifications";
import { weeklyInsightHandler } from "../jobs/weeklyInsightJob";
import { timeCapsuleHandler } from "../jobs/timeCapsuleJob";
import { linguisticDriftHandler } from "../jobs/linguisticDriftJob";
import { thirtyDayLetterHandler } from "../jobs/thirtyDayLetterJob";
import { entropyDetectionHandler } from "../jobs/entropyDetectionJob";
import { programLessonUnlockHandler } from "../jobs/programLessonUnlockJob";
import { ragEvalHandler } from "../rag/evals/schedule";
import { attachV2VRelay } from "../v2vRelay";
import { humeWebhookHandler } from "../humeWebhook";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => server.close(() => resolve(true)));
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Narrow native WebView CORS. Authentication remains JWT-based.
  app.use("/api", nativeCors);
  registerOAuthRoutes(app);

  // Readiness reports current Build 4 dependencies only and never returns
  // credential values. Provider presence is not treated as execution proof.
  app.get("/api/health", async (_req, res) => {
    let database = false;
    try {
      const db = await getDb();
      if (db) {
        await db.execute(sql`SELECT 1`);
        database = true;
      }
    } catch {
      database = false;
    }

    const auth = Boolean(process.env.JWT_SECRET);
    const apple = Boolean(process.env.APPLE_CLIENT_ID || "com.mirrored.aiself");
    const llm = Boolean(process.env.OPENAI_API_KEY);
    const hume = Boolean(
      process.env.HUME_API_KEY &&
      process.env.HUME_SECRET_KEY &&
      (process.env.HUME_CONFIG_ID || process.env.HUME_FEMALE_CONFIG_ID)
    );
    const scheduledJobs = Boolean(process.env.SCHEDULED_JOB_SECRET);
    const ok = database && auth && apple && llm;

    res.status(ok ? 200 : 503).json({
      ok,
      database,
      auth,
      apple,
      llm,
      hume,
      scheduledJobs,
      service: "mirrored-backend",
    });
  });

  app.get("/sitemap.xml", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const routes = ["/", "/home", "/chat", "/journal", "/domains", "/calendar", "/insights", "/checkin", "/settings", "/notifications"];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route => `  <url>\n    <loc>${baseUrl}${route}</loc>\n    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n    <changefreq>${route === "/" ? "weekly" : "daily"}</changefreq>\n    <priority>${route === "/" ? "1.0" : "0.8"}</priority>\n  </url>`).join("\n")}\n</urlset>`;
    res.header("Content-Type", "application/xml");
    res.send(sitemap);
  });

  app.get("/robots.txt", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.header("Content-Type", "text/plain");
    res.send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: ${baseUrl}/sitemap.xml\n\nCrawl-delay: 1\nRequest-rate: 1/1s`);
  });

  // All externally triggered scheduled jobs share one provider-independent
  // authorization boundary. Individual handlers do not decide caller trust.
  app.use("/api/scheduled", scheduledJobAuth);
  app.post("/api/scheduled/weeklyInsight", weeklyInsightHandler);
  app.post("/api/scheduled/timeCapsule", timeCapsuleHandler);
  app.post("/api/scheduled/linguisticDrift", linguisticDriftHandler);
  app.post("/api/scheduled/thirtyDayLetter", thirtyDayLetterHandler);
  app.post("/api/scheduled/entropyDetection", entropyDetectionHandler);
  app.post("/api/scheduled/programLessonUnlock", programLessonUnlockHandler);
  app.post("/api/scheduled/ragEval", ragEvalHandler);

  app.post("/api/hume/webhook", humeWebhookHandler);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  if (process.env.NODE_ENV === "development") await setupVite(app, server);
  else serveStatic(app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`);

  attachV2VRelay(server);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    startDailyReminderScheduler();
  });
}

startServer().catch(console.error);
