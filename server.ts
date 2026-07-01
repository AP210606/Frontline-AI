import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { triageMessage } from "./src/services/triageService";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON parsing middleware with a generous payload limit for batch processing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Triage single message
  app.post("/api/triage", async (req, res) => {
    try {
      const { message } = req.body;
      if (typeof message !== "string") {
        return res.status(400).json({ error: "Invalid input. 'message' string is required." });
      }

      const startTime = Date.now();
      const result = await triageMessage(message);
      const latency = Date.now() - startTime;

      return res.json({ ...result, latency });
    } catch (error: any) {
      console.error("API Error in /api/triage:", error);
      return res.status(500).json({ error: error.message || "An unexpected error occurred during triage." });
    }
  });

  // Triage multiple messages (batch upload)
  app.post("/api/triage-batch", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid input. 'messages' array is required." });
      }

      // Process messages in parallel, gracefully resolving fallbacks (handled inside triageMessage)
      const triagePromises = messages.map(async (msg: string) => {
        const cleanedMsg = typeof msg === "string" ? msg.trim() : "";
        const startTime = Date.now();
        const result = await triageMessage(cleanedMsg);
        const latency = Date.now() - startTime;
        return {
          id: Math.random().toString(36).substring(2, 9),
          originalMessage: cleanedMsg,
          ...result,
          latency,
          timestamp: new Date().toISOString(),
        };
      });

      const results = await Promise.all(triagePromises);
      return res.json({ results });
    } catch (error: any) {
      console.error("API Error in /api/triage-batch:", error);
      return res.status(500).json({ error: error.message || "An unexpected error occurred during batch triage." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve client index.html for all non-api routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Frontline AI Server running on http://0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || "development"})`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
