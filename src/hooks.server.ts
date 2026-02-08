import { error, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { parseDeviceToken, TEMP_SESSION_COOKIE_NAME, validateTemporarySession } from '$lib/auth/session';

const initDatabase: Handle = async ({ event, resolve }) => {
  const db = drizzle(event.platform!.env.DB, { schema });
  event.locals.db = db;
  return resolve(event);
};

const initSession: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(TEMP_SESSION_COOKIE_NAME)
  const deviceToken = event.request.headers.get(`authorization`)?.split(`Device `)?.[1]
  if (deviceToken) {
    const device = await parseDeviceToken(event.locals.db, deviceToken)
    event.locals.device = device
  } else if (sessionId) {
    const session = await validateTemporarySession(event.locals.db, sessionId)
    if (!session) throw error(401, `session invalid`)
    event.locals.session = session
  }

  return resolve(event);
};

export const handle = sequence(initDatabase, initSession);
