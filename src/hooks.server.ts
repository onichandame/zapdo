import { type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { SESSION_COOKIE_NAME, validateSession } from '$lib/auth/session';

const initDatabase: Handle = async ({ event, resolve }) => {
  const db = drizzle(event.platform!.env.DB, { schema });
  event.locals.db = db;
  return resolve(event);
};

const initSession: Handle = async ({ event, resolve, }) => {
  const sessionId = event.cookies.get(SESSION_COOKIE_NAME.PERM_SESSION)
  if (sessionId) {
    const session = await validateSession(event.locals.db, sessionId)
    if (!session) {
      event.cookies.delete(SESSION_COOKIE_NAME.PERM_SESSION, { path: `/` })
    } else {
      event.locals.session = session
      event.cookies.set(SESSION_COOKIE_NAME.PERM_SESSION, session.id, {
        path: '/',
        httpOnly: true,
        secure: event.url.protocol === 'https:',
        sameSite: 'lax',
        expires: new Date(session.expiresAt)
      });

    }
  }

  return resolve(event);
};

export const handle = sequence(initDatabase, initSession);
