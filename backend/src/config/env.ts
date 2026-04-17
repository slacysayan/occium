import * as dotenv from "dotenv";
dotenv.config();

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  SUPABASE_URL: requireEnv("SUPABASE_URL"),
  SUPABASE_SERVICE_KEY: requireEnv("SUPABASE_SERVICE_KEY"),
  STATE_JWT_SECRET: requireEnv("STATE_JWT_SECRET"),
  GOOGLE_CLIENT_ID: requireEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: requireEnv("GOOGLE_CLIENT_SECRET"),
  YOUTUBE_API_KEY: optionalEnv("YOUTUBE_API_KEY"),
  LINKEDIN_CLIENT_ID: requireEnv("LINKEDIN_CLIENT_ID"),
  LINKEDIN_CLIENT_SECRET: requireEnv("LINKEDIN_CLIENT_SECRET"),
  GEMINI_API_KEY: requireEnv("GEMINI_API_KEY"),
  PORT: parseInt(optionalEnv("PORT", "4000")),
  FRONTEND_URL: optionalEnv("FRONTEND_URL", "http://localhost:3000"),
  BACKEND_URL: optionalEnv("BACKEND_URL", "http://localhost:4000"),
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
};
