import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startDailyReminderScheduler } from "../pushNotifications";
import { startWeeklyDigestScheduler } from "../jobs/weeklyDigestScheduler";

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

  // Trust the Cloudflare + Google Cloud Run proxy chain.
  // This makes req.hostname return the public-facing domain (manus.space)
  // and req.protocol return 'https' instead of the internal values.
  app.set("trust proxy", 1);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Sitemap endpoint
  app.get("/sitemap.xml", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const routes = [
      "/",
      "/home",
      "/chat",
      "/journal",
      "/domains",
      "/calendar",
      "/insights",
      "/checkin",
      "/settings",
      "/notifications",
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${baseUrl}${route}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>${route === "/" ? "weekly" : "daily"}</changefreq>
    <priority>${route === "/" ? "1.0" : "0.8"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(sitemap);
  });

  // Robots.txt endpoint
  app.get("/robots.txt", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay (in seconds)
Crawl-delay: 1

# Request rate (pages per second)
Request-rate: 1/1s`;

    res.header("Content-Type", "text/plain");
    res.send(robots);
  });

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
    // Start the daily 6am push notification scheduler
    startDailyReminderScheduler();
    // Start the weekly digest scheduler (Sunday 8 AM UTC)
    startWeeklyDigestScheduler();
  });
}

startServer().catch(console.error);
