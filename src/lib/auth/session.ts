import { and, eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import type { Database } from '$lib/server/db';

export enum SESSION_COOKIE_NAME {
  PERM_SESSION = `zapdo_session`
}
const PERM_SESSION_EXPIRY_MINUTES = 60 * 24 * 7;

export async function createSession(
  db: Database,
  userId: string
) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + PERM_SESSION_EXPIRY_MINUTES);

  const [session] = await db.insert(schema.session).values({
    userId,
    expiresAt: expiresAt.toISOString()
  }).returning();

  return session;
}

export async function validateSession(
  db: Database,
  sessionId: string
) {
  const session = await db.query.session.findFirst({
    where: (session, { eq }) => eq(session.id, sessionId)
    , with: { user: { with: { oauthAccounts: true } }, }
  });

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt) < new Date()) {
    await db.delete(schema.session)
      .where(eq(schema.session.id, sessionId));
    return null;
  }

  const newSession = await tryExtendPermanentSession(db, session)
  if (newSession) return await db.query.session.findFirst({
    where: (session, { eq }) => eq(session.id, session.id)
    , with: { user: { with: { oauthAccounts: true } }, }
  });
  return session
}

async function tryExtendPermanentSession(db: Database, session: schema.Session) {
  if (new Date(session.expiresAt).getTime() - Date.now() < PERM_SESSION_EXPIRY_MINUTES / 2 * 60 * 1000) {
    return extendPermanentSession(db, session.id)
  }
}

async function extendPermanentSession(db: Database, sessionId: string) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + PERM_SESSION_EXPIRY_MINUTES);
  const [session] = await db.update(schema.session).set({ expiresAt: expiresAt.toISOString() }).where(and(eq(schema.session.id, sessionId))).returning()
  return session
}
