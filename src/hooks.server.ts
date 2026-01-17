import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { getSessionIdFromRequest, validateSession } from '$lib/server/auth';

const initDatabase: Handle = async ({ event, resolve }) => {
  const db = drizzle(event.platform!.env.DB, { schema });
  event.locals.db = db;
  return resolve(event);
};

const initSession: Handle = async ({ event, resolve }) => {
  const sessionId = getSessionIdFromRequest(event.request);

  if (sessionId) {
    const session = await validateSession(event.locals.db, sessionId);

    if (session) {
      event.locals.session = session;
    }
  }

  return resolve(event);
};

export const handle = sequence(initDatabase, initSession);
