import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import type { Database } from '$lib/server/db';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_EXPIRY_DAYS = 30;

/**
 * Calculates the session expiry date based on the configured session duration.
 */
export function getSessionExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + SESSION_EXPIRY_DAYS);
  return expiry
}

/**
 * Creates a new session record in the database for the specified user.
 * @param db - The Drizzle database instance.
 * @param userId - The ID of the user to create a session for.
 * @returns The created session record.
 * @throws Error if the session creation fails.
 */
export async function createSession(
  db: Database,
  userId: string
): Promise<schema.Session> {
  const sessionId = crypto.randomUUID();
  const expiresAt = getSessionExpiry().toISOString();

  await db.insert(schema.session).values({
    id: sessionId,
    userId,
    expiresAt
  });

  const session = await db.query.session.findFirst({
    where: (session, { eq }) => eq(session.id, sessionId)
  });

  if (!session) {
    throw new Error('Failed to create session');
  }

  return session;
}

/**
 * Validates a session by checking its existence and expiry status.
 * Expired sessions are automatically deleted from the database.
 * @param db - The Drizzle database instance.
 * @param sessionId - The session id to validate.
 * @returns The session if valid and not expired, null otherwise.
 */
export async function validateSession(
  db: Database,
  sessionId: string
) {
  const session = await db.query.session.findFirst({
    where: (session, { eq }) => eq(session.id, sessionId)
    , with: { user: { with: { oauthAccounts: true } } }
  });

  if (!session) {
    return null;
  }

  // Check if session is expired
  if (new Date(session.expiresAt) < new Date()) {
    // Delete expired session
    await db.delete(schema.session)
      .where(eq(schema.session.id, session.id));
    return null;
  }

  return session;
}

/**
 * Removes a session from the database using the provided session id.
 * @param db - The Drizzle database instance.
 * @param sessionId - The session id identifying the session to delete.
 */
export async function deleteSession(
  db: Database,
  sessionId: string
): Promise<void> {
  await db.delete(schema.session)
    .where(eq(schema.session.id, sessionId));
}

/**
 * Extracts the session id from a cookies object.
 * @param cookies - An object mapping cookie names to their values.
 * @returns The session id if found, undefined otherwise.
 */
export function getSessionIdFromCookies(cookies: Record<string, string>): string | undefined {
  return cookies[SESSION_COOKIE_NAME];
}

/**
 * Extracts the session id from the Cookie header of a request.
 * @param request - The HTTP request object.
 * @returns The session id if found in cookies, undefined otherwise.
 */
export function getSessionIdFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = parseCookies(cookieHeader);
  return cookies[SESSION_COOKIE_NAME];
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

/**
 * Creates a Set-Cookie header value for a session id with appropriate security attributes.
 * @param sessionId - The session id to set in the cookie.
 * @returns A formatted cookie string for the Set-Cookie header.
 */
export function createSessionCookie(sessionId: string): string {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_EXPIRY_DAYS);

  return `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires.toUTCString()}`;
}

/**
 * Creates a Set-Cookie header value that clears the session cookie by setting its max-age to 0.
 * @returns A formatted cookie string to remove the session cookie.
 */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
