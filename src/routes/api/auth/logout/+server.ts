import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession, clearSessionCookie } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  const sessionId = cookies.get('session_token');

  if (sessionId) {
    // Delete session from database
    await deleteSession(locals.db, sessionId);
  }

  // Clear session cookie
  cookies.set('session_token', '', {
    path: '/',
    httpOnly: true,
    secure: request.url.startsWith('https:'),
    sameSite: 'lax',
    maxAge: 0
  });

  throw redirect(302, '/?logged_out=true');
};

export const GET: RequestHandler = async ({ request, locals, cookies }) => {
  const sessionId = cookies.get('session_token');

  if (sessionId) {
    // Delete session from database
    await deleteSession(locals.db, sessionId);
  }

  // Clear session cookie
  cookies.set('session_token', '', {
    path: '/',
    httpOnly: true,
    secure: request.url.startsWith('https:'),
    sameSite: 'lax',
    maxAge: 0
  });

  throw redirect(302, '/?logged_out=true');
};
