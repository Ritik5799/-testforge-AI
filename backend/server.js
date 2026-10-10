import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dashboardRouter from "./routes/dashboard.js";
import runsRouter from "./routes/runs.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow curl/Postman and requests without an Origin header.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use("/demo", express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "HealTest AI API", timestamp: new Date().toISOString() });
});
app.use("/api/dashboard", dashboardRouter);
app.use("/api/runs", runsRouter);

app.use((req, res) => res.status(404).json({ error: "Route not found", path: req.originalUrl }));
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.PRODUCTION_MODE === "true" ? "Request failed" : err.message || "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`HealTest AI API: http://localhost:${PORT}`);
  console.log(`Health check:     http://localhost:${PORT}/api/health`);
  console.log(`Demo page:        http://localhost:${PORT}/demo/checkout.html`);
});