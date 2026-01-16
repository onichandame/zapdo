import { redirect, type RequestHandler } from '@sveltejs/kit';
import { CloudflareGoogleOAuth } from '$lib/server/auth/oauth/google';

export const GET: RequestHandler = async ({ platform, url, cookies }) => {
  const state = crypto.randomUUID();

  cookies.set('oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 60 * 10
  });

  const googleOAuth = new CloudflareGoogleOAuth(platform!.env);
  const authUrl = googleOAuth.getAuthUrl(state);

  throw redirect(302, authUrl);
};
