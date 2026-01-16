import { json, type RequestHandler } from '@sveltejs/kit';
import { CloudflareGoogleOAuth } from '$lib/server/auth/oauth/google';

export const GET: RequestHandler = async ({ platform, url, cookies }) => {
  // Generate state for CSRF protection
  const state = crypto.randomUUID();

  // Store state in a cookie for validation on callback
  cookies.set('oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 60 * 10 // 10 minutes
  });

  const googleOAuth = new CloudflareGoogleOAuth(platform!.env);
  const authUrl = googleOAuth.getAuthUrl(state);

  return json({ url: authUrl });
};
