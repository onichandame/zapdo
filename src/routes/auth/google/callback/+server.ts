import { redirect, type RequestHandler } from '@sveltejs/kit';
import { CloudflareGoogleOAuth } from '$lib/server/auth/oauth/google';
import { createSession, SESSION_COOKIE_NAME, } from '$lib/auth/session';

export const GET: RequestHandler = async ({ platform, url, cookies, locals }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    throw redirect(302, '/login?error=' + encodeURIComponent(error));
  }

  if (!code || !state) {
    throw redirect(302, '/login?error=missing_params');
  }

  const storedState = cookies.get('oauth_state');
  if (!storedState || storedState !== state) {
    throw redirect(302, '/login?error=invalid_state');
  }

  cookies.delete('oauth_state', { path: '/' });

  const googleOAuth = new CloudflareGoogleOAuth(platform!.env);
  const tokens = await googleOAuth.exchangeCodeForTokens(code);
  const userInfo = await googleOAuth.getUserInfo(tokens.access_token);

  const { user } = await googleOAuth.findOrCreateUser({
    db: locals.db,
    providerAccountId: userInfo.sub,
    email: userInfo.email,
    name: userInfo.name,
    pictureUrl: userInfo.picture,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    scope: tokens.scope
  });

  const session = await createSession(locals.db, user.id);
  cookies.set(SESSION_COOKIE_NAME.PERM_SESSION, session.id, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    expires: new Date(session.expiresAt)
  });

  const hasCompletedPasswordlessOnboarding = !!user.kekPublicKey;
  if (!hasCompletedPasswordlessOnboarding) {
    throw redirect(302, '/onboarding');
  }

  throw redirect(302, '/projects');
};
