import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import type { Database } from '$lib/server/db';

export const TEMP_SESSION_COOKIE_NAME = 'temp_session';
const TEMP_SESSION_EXPIRY_MINUTES = 15;

export async function createTemporarySession(
  db: Database,
  userId: string
): Promise<string> {
  const tempSessionId = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TEMP_SESSION_EXPIRY_MINUTES);

  await db.insert(schema.session).values({
    id: tempSessionId,
    userId,
    expiresAt: expiresAt.toISOString()
  });

  return tempSessionId;
}

export async function validateTemporarySession(
  db: Database,
  tempSessionId: string
): Promise<string | null> {
  const tempSession = await db.query.session.findFirst({
    where: (session, { eq }) => eq(session.id, tempSessionId)
  });

  if (!tempSession) {
    return null;
  }

  if (new Date(tempSession.expiresAt) < new Date()) {
    await db.delete(schema.session)
      .where(eq(schema.session.id, tempSessionId));
    return null;
  }

  return tempSession.userId;
}

export async function consumeTemporarySession(
  db: Database,
  tempSessionId: string
): Promise<void> {
  await db.delete(schema.session)
    .where(eq(schema.session.id, tempSessionId));
}

export function createTempSessionCookie(tempSessionId: string): string {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + TEMP_SESSION_EXPIRY_MINUTES);

  return `${TEMP_SESSION_COOKIE_NAME}=${tempSessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires.toUTCString()}`;
}

export function clearTempSessionCookie(): string {
  return `${TEMP_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(';');

  for (const pair of pairs) {
    const [name, value] = pair.trim().split('=');
    if (name && value) {
      cookies[name] = value;
    }
  }

  return cookies;
}
