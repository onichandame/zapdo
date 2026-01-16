import { redirect, type RequestHandler } from '@sveltejs/kit';
import { createSession } from '$lib/server/auth';
import { CloudflareGoogleOAuth } from '$lib/server/auth/oauth';

export const GET: RequestHandler = async ({ platform, url, cookies, locals }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    throw redirect(302, '/error?message=' + encodeURIComponent(error));
  }

  // Validate required params
  if (!code || !state) {
    throw redirect(302, '/error?message=missing_params');
  }

  // Validate state (CSRF protection)
  const storedState = cookies.get('oauth_state');
  if (!storedState || storedState !== state) {
    throw redirect(302, '/error?message=invalid_state');
  }

  // Clear state cookie
  cookies.delete('oauth_state', { path: '/' });

  try {
    const googleOAuth = new CloudflareGoogleOAuth(platform!.env);

    // Exchange code for tokens
    const tokens = await googleOAuth.exchangeCodeForTokens(code);

    // Get user info from Google
    const userInfo = await googleOAuth.getUserInfo(tokens.access_token);

    // Find or create user in database
    const { user, isNewUser } = await googleOAuth.findOrCreateUser({
      db: locals.db,
      providerAccountId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      avatarUrl: userInfo.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope
    });

    // Create session
    const session = await createSession(locals.db, user.id);

    // Set session cookie
    cookies.set('session_token', session.id, {
      path: '/',
      httpOnly: true,
      secure: url.protocol === 'https:',
      sameSite: 'lax',
      expires: new Date(session.expiresAt)
    });

    // Redirect to home page or dashboard
    throw redirect(302, '/');
  } catch (err) {
    console.error('OAuth callback error:', err);
    throw redirect(302, '/error?message=callback_failed');
  }
};
