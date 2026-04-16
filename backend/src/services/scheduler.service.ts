import cron from "node-cron";
import { db } from "../db/client";
import { posts, accounts } from "../db/schema";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { postToLinkedIn } from "./linkedin.service";

export function startScheduler(): void {
  // Run every minute — check for posts due to be published
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      const duePosts = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.status, "scheduled"),
            isNotNull(posts.scheduledAt),
            lte(posts.scheduledAt, now)
          )
        );

      for (const post of duePosts) {
        try {
          if (post.platform === "linkedin" && post.accountId) {
            const [account] = await db
              .select()
              .from(accounts)
              .where(eq(accounts.id, post.accountId));

            if (!account) continue;

            const result = await postToLinkedIn({
              accessToken: account.accessToken,
              personUrn: account.linkedinUrn ?? "",
              text: post.description ?? "",
              linkUrl: post.sourceUrl ?? undefined,
              linkTitle: post.title ?? undefined,
            });

            await db
              .update(posts)
              .set({
                status: "published",
                publishedAt: new Date(),
                platformPostId: result.postId,
              })
              .where(eq(posts.id, post.id));

            console.log(`[scheduler] Published LinkedIn post ${post.id}`);
          }
          // YouTube scheduled posts use publishAt field — YouTube handles them natively
        } catch (err) {
          console.error(`[scheduler] Failed to publish post ${post.id}:`, err);
          await db
            .update(posts)
            .set({
              status: "failed",
              errorMessage: err instanceof Error ? err.message : "Unknown error",
            })
            .where(eq(posts.id, post.id));
        }
      }
    } catch (err) {
      console.error("[scheduler] Cron error:", err);
    }
  });

  console.log("[scheduler] Started — checking every minute for scheduled posts");
}
