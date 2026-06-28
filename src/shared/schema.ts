import { z } from "zod";

/**
 * Schemas shared by the client and the server.
 *
 * Defining them once here is the whole point of the stack: the same Zod object
 * validates the request body on the Hono side AND the form on the React side,
 * and `z.infer` gives you the TypeScript type for free. One source of truth.
 */

export const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().max(10_000).default(""),
});

// NOT `createNoteSchema.partial()`: a Zod `.default("")` survives `.partial()`,
// so an omitted `body` would resolve to "" and a PATCH that only sends `title`
// would silently wipe the note body. Spell the fields out so absent = untouched.
export const updateNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).optional(),
  body: z.string().max(10_000).optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

/** Shape returned by the API (dates serialised to ISO strings over the wire). */
export const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Note = z.infer<typeof noteSchema>;
