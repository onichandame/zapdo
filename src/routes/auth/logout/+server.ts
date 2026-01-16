import { redirect, type RequestHandler } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/auth/session';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  const sessionId = cookies.get('session_token');

  if (sessionId) {
    await deleteSession(locals.db, sessionId);
  }

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
    await deleteSession(locals.db, sessionId);
  }

  cookies.set('session_token', '', {
    path: '/',
    httpOnly: true,
    secure: request.url.startsWith('https:'),
    sameSite: 'lax',
    maxAge: 0
  });

  throw redirect(302, '/?logged_out=true');
};