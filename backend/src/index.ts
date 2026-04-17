import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { testConnection } from "./db/client";
import { startScheduler } from "./services/scheduler.service";
import authRouter from "./routes/auth";
import youtubeRouter from "./routes/youtube";
import linkedinRouter from "./routes/linkedin";
import aiRouter from "./routes/ai";
import postsRouter from "./routes/posts";
import accountsRouter from "./routes/accounts";
import settingsRouter from "./routes/settings";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [env.FRONTEND_URL, "https://occium-one.vercel.app", "http://localhost:3000"];
    if (!origin || allowed.includes(origin)) callback(null, true);
    else callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/health", async (_req, res) => {
  const dbOk = await testConnection();
  res.json({ status: "ok", db: dbOk ? "connected" : "error", env: env.NODE_ENV, ts: new Date().toISOString() });
});

app.use("/auth", authRouter);
app.use("/api/youtube", youtubeRouter);
app.use("/api/linkedin", linkedinRouter);
app.use("/api/ai", aiRouter);
app.use("/api/posts", postsRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/settings", settingsRouter);
app.use(errorHandler);

async function main() {
  const dbOk = await testConnection();
  if (!dbOk) { console.error("❌ Cannot connect to database."); process.exit(1); }
  console.log("✅ Database connected");
  startScheduler();
  app.listen(env.PORT, () => {
    console.log(`✅ Backend running at http://localhost:${env.PORT}`);
    console.log(`   Frontend: ${env.FRONTEND_URL}`);
  });
}

main().catch((err) => { console.error("Fatal startup error:", err); process.exit(1); });
