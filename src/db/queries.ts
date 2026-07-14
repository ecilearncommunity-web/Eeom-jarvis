import { db } from "./index.ts";
import { users, assistantLogs } from "./schema.ts";
import { eq, desc } from "drizzle-orm";

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name: name || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          name: name || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database user upsert failed:", error);
    throw new Error("Database user management failed. Please try again later.", { cause: error });
  }
}

export async function createAssistantLog(uid: string, prompt: string, response: string, mode = "text") {
  try {
    const userResult = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!userResult || userResult.length === 0) {
      throw new Error(`User with uid ${uid} not found`);
    }
    const userId = userResult[0].id;

    const result = await db.insert(assistantLogs)
      .values({
        userId,
        prompt,
        response,
        mode,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database log insertion failed:", error);
    throw new Error("Database logging failed. Please try again later.", { cause: error });
  }
}

export async function getAssistantLogs(uid: string, limitNumber = 50) {
  try {
    const userResult = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!userResult || userResult.length === 0) {
      return [];
    }
    const userId = userResult[0].id;

    return await db.select()
      .from(assistantLogs)
      .where(eq(assistantLogs.userId, userId))
      .orderBy(desc(assistantLogs.createdAt))
      .limit(limitNumber);
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Database retrieval failed. Please try again later.", { cause: error });
  }
}
