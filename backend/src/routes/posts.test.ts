/**
 * Unit tests for GET /api/posts/:id
 * Validates: Requirements 6.1, 6.2
 */

import express from "express";
import request from "supertest";

// ─── Mock the DB client before importing the router ──────────────────────────
jest.mock("../db/client", () => ({
  db: {
    select: jest.fn(),
  },
}));

// ─── Mock env config so requireEnv() doesn't throw ───────────────────────────
jest.mock("../config/env", () => ({
  env: {
    NODE_ENV: "test",
    SESSION_SECRET: "test-secret",
    FRONTEND_URL: "http://localhost:3000",
    DATABASE_URL: "postgres://test",
    PORT: 4000,
  },
}));

import { db } from "../db/client";
import postsRouter from "./posts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-uuid-1111";
const OTHER_USER_ID = "user-uuid-2222";
const POST_ID = "post-uuid-aaaa";

/** Build a minimal Express app with a fake session injected */
function buildApp(sessionUserId: string | undefined) {
  const app = express();
  app.use(express.json());

  // Inject a fake session so requireAuth passes (or fails)
  app.use((req, _res, next) => {
    (req as any).session = { userId: sessionUserId };
    next();
  });

  app.use("/api/posts", postsRouter);
  return app;
}

/** A full post record matching the schema */
const mockPost = {
  id: POST_ID,
  userId: USER_ID,
  accountId: null,
  platform: "youtube",
  sourceUrl: null,
  title: "Test Video",
  description: "A test description",
  thumbnailUrl: null,
  tags: [],
  privacyStatus: "private",
  status: "uploading",
  scheduledAt: null,
  publishedAt: null,
  platformPostId: null,
  uploadProgress: 42,
  errorMessage: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/posts/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Requirement 6.1 — authenticated owner gets their post (200 with full record)
   * Requirement 6.3 — response includes upload_progress and status
   */
  it("returns 200 with the full post when the authenticated owner requests it", async () => {
    // Chain: db.select().from().where() resolves to [mockPost]
    const whereMock = jest.fn().mockResolvedValue([mockPost]);
    const fromMock = jest.fn().mockReturnValue({ where: whereMock });
    (db.select as jest.Mock).mockReturnValue({ from: fromMock });

    const app = buildApp(USER_ID);
    const res = await request(app).get(`/api/posts/${POST_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(POST_ID);
    expect(res.body.userId).toBe(USER_ID);
    // Req 6.3 — must include uploadProgress and status
    expect(res.body.uploadProgress).toBe(42);
    expect(res.body.status).toBe("uploading");
  });

  /**
   * Requirement 6.2 — 404 when post does not exist
   */
  it("returns 404 when the post does not exist", async () => {
    const whereMock = jest.fn().mockResolvedValue([]); // empty result
    const fromMock = jest.fn().mockReturnValue({ where: whereMock });
    (db.select as jest.Mock).mockReturnValue({ from: fromMock });

    const app = buildApp(USER_ID);
    const res = await request(app).get(`/api/posts/non-existent-id`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Post not found" });
  });

  /**
   * Requirement 6.2 — 404 when post belongs to a different user
   * The query filters by both id AND userId, so a different user's post
   * returns an empty result set → 404.
   */
  it("returns 404 when the post belongs to a different user", async () => {
    // DB returns empty because WHERE clause includes userId = OTHER_USER_ID
    // which doesn't match the post's actual owner (USER_ID)
    const whereMock = jest.fn().mockResolvedValue([]);
    const fromMock = jest.fn().mockReturnValue({ where: whereMock });
    (db.select as jest.Mock).mockReturnValue({ from: fromMock });

    const app = buildApp(OTHER_USER_ID);
    const res = await request(app).get(`/api/posts/${POST_ID}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Post not found" });
  });

  /**
   * Sanity check — unauthenticated request is rejected by requireAuth
   */
  it("returns 401 when the user is not authenticated", async () => {
    const app = buildApp(undefined);
    const res = await request(app).get(`/api/posts/${POST_ID}`);

    expect(res.status).toBe(401);
  });
});
