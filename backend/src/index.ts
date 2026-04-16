import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { env } from "./config/env";
import { pool, testConnection } from "./db/client";
import { startScheduler } from "./services/scheduler.service";
import authRouter from "./routes/auth";
import youtubeRouter from "./routes/youtube";
import linkedinRouter from "./routes/linkedin";
import aiRouter from "./routes/ai";
import postsRouter from "./routes/posts";
import accountsRouter from "./routes/accounts";
import { errorHandler } from "./middleware/error.middleware";

const app = express();
const PgSession = connectPgSimple(session);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    name: "occium.sid",
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", async (_req, res) => {
  const dbOk = await testConnection();
  res.json({
    status: "ok",
    db: dbOk ? "connected" : "error",
    env: env.NODE_ENV,
    ts: new Date().toISOString(),
  });
});

app.use("/auth", authRouter);
app.use("/api/youtube", youtubeRouter);
app.use("/api/linkedin", linkedinRouter);
app.use("/api/ai", aiRouter);
app.use("/api/posts", postsRouter);
app.use("/api/accounts", accountsRouter);

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error("❌ Cannot connect to database. Check DATABASE_URL.");
    process.exit(1);
  }
  console.log("✅ Database connected");

  startScheduler();

  app.listen(env.PORT, () => {
    console.log(`✅ Backend running at http://localhost:${env.PORT}`);
    console.log(`   Frontend: ${env.FRONTEND_URL}`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
