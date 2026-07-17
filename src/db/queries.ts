import { db } from "./index.ts";
import { users, assistantLogs } from "./schema.ts";
import { eq, desc } from "drizzle-orm";

// Highly compatible secure in-memory fallback store when PostgreSQL is offline or times out
const memoryUsers = new Map<string, any>();
const memoryLogs: any[] = [];
let nextUserId = 1000;
let nextLogId = 10000;

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

    const user = result[0];
    if (user) {
      memoryUsers.set(uid, user);
    }
    return user;
  } catch (error) {
    console.warn("PostgreSQL connection issue in getOrCreateUser. Falling back to in-memory store:", error);
    
    let existing = memoryUsers.get(uid);
    if (!existing) {
      existing = {
        id: nextUserId++,
        uid,
        email,
        name: name || null,
        createdAt: new Date(),
      };
      memoryUsers.set(uid, existing);
    } else {
      existing.email = email;
      existing.name = name || null;
    }
    return existing;
  }
}

export async function createAssistantLog(uid: string, prompt: string, response: string, mode = "text") {
  try {
    const userResult = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    let userId: number;
    if (!userResult || userResult.length === 0) {
      const created = await getOrCreateUser(uid, "", "");
      userId = created.id;
    } else {
      userId = userResult[0].id;
    }

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
    console.warn("PostgreSQL connection issue in createAssistantLog. Falling back to in-memory logging:", error);
    
    let user = memoryUsers.get(uid);
    if (!user) {
      user = {
        id: nextUserId++,
        uid,
        email: "fallback-user@jarvis.local",
        name: "Jarvis Operator",
        createdAt: new Date(),
      };
      memoryUsers.set(uid, user);
    }
    
    const newLog = {
      id: nextLogId++,
      userId: user.id,
      prompt,
      response,
      mode,
      createdAt: new Date(),
    };
    memoryLogs.push(newLog);
    return newLog;
  }
}

export async function getAssistantLogs(uid: string, limitNumber = 50) {
  try {
    const userResult = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!userResult || userResult.length === 0) {
      const user = memoryUsers.get(uid);
      if (!user) return [];
      return memoryLogs
        .filter(l => l.userId === user.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limitNumber);
    }
    const userId = userResult[0].id;

    return await db.select()
      .from(assistantLogs)
      .where(eq(assistantLogs.userId, userId))
      .orderBy(desc(assistantLogs.createdAt))
      .limit(limitNumber);
  } catch (error) {
    console.warn("PostgreSQL connection issue in getAssistantLogs. Falling back to in-memory log retrieval:", error);
    
    const user = memoryUsers.get(uid);
    if (!user) return [];
    
    return memoryLogs
      .filter(l => l.userId === user.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limitNumber);
  }
}
