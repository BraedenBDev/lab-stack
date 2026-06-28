import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { notes } from "../db/schema";
import { createNoteSchema, updateNoteSchema } from "../../shared/schema";
import { requireAuth, type AuthVariables } from "../lib/auth-middleware";

/**
 * Every note is scoped to the authenticated user. Note the chained `.get/.post`
 * style + the exported route type at the bottom — that's what powers the
 * end-to-end typed RPC client on the frontend.
 */
export const notesRoute = new Hono<{ Variables: AuthVariables }>()
  .use(requireAuth)
  .get("/", async (c) => {
    const rows = await db
      .select()
      .from(notes)
      .where(eq(notes.userId, c.get("user").id))
      .orderBy(desc(notes.createdAt));
    return c.json(rows);
  })
  .post("/", zValidator("json", createNoteSchema), async (c) => {
    const input = c.req.valid("json");
    const [row] = await db
      .insert(notes)
      .values({ ...input, userId: c.get("user").id })
      .returning();
    return c.json(row, 201);
  })
  .patch("/:id", zValidator("json", updateNoteSchema), async (c) => {
    const input = c.req.valid("json");
    const [row] = await db
      .update(notes)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(notes.id, c.req.param("id")), eq(notes.userId, c.get("user").id)))
      .returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  })
  .delete("/:id", async (c) => {
    const [row] = await db
      .delete(notes)
      .where(and(eq(notes.id, c.req.param("id")), eq(notes.userId, c.get("user").id)))
      .returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true });
  });
