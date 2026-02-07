import { error, redirect } from '@sveltejs/kit';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { validateTemporarySession, consumeTemporarySession, TEMP_SESSION_COOKIE_NAME } from '$lib/auth/session';

export const load = async ({ locals, cookies }) => {
  if (locals.session) {
    const hasCompletedPasswordlessOnboarding = !!locals.session.user.kekPublicKey;

    if (hasCompletedPasswordlessOnboarding) {
      throw redirect(303, '/tasks');
    }

    return {
      user: locals.session.user
    };
  }

  const tempSessionId = cookies.get(TEMP_SESSION_COOKIE_NAME)

  if (!tempSessionId) {
    return {
      error: 'Invalid or expired onboarding session. Please log in again.',
      showLoginButton: true
    };
  }

  const userId = await validateTemporarySession(locals.db, tempSessionId);

  if (!userId) {
    return {
      error: 'Invalid or expired onboarding session. Please log in again.',
      showLoginButton: true
    };
  }

  const user = await locals.db.query.user.findFirst({
    where: eq(schema.user.id, userId)
  });

  if (!user) {
    return {
      error: 'User not found. Please log in again.',
      showLoginButton: true
    };
  }

  return {
    user,
    tempSessionId
  };
};

export const actions = {
  default: async ({ request, locals, cookies }) => {
    const session = locals.session;
    let userId: string;
    let tempSessionId: string | undefined;

    if (session) {
      userId = session.user.id;
    } else {
      tempSessionId = cookies.get(TEMP_SESSION_COOKIE_NAME);

      if (!tempSessionId) {
        throw error(401, 'Unauthorized');
      }

      const validatedUserId = await validateTemporarySession(locals.db, tempSessionId);
      if (!validatedUserId) {
        throw error(401, 'Unauthorized');
      }
      userId = validatedUserId;
    }

    const data: { authPublicKey?: string; kekPublicKey?: string } = await request.json();
    const authPublicKey = data.authPublicKey;
    const kekPublicKey = data.kekPublicKey;

    if (!authPublicKey || !kekPublicKey) {
      return {
        error: 'Both authPublicKey and kekPublicKey are required'
      };
    }

    try {
      await locals.db
        .update(schema.user)
        .set({
          kekPublicKey,
          updatedAt: new Date().toISOString()
        })
        .where(eq(schema.user.id, userId));

      const deviceName = 'First Device';
      const deviceType = 'browser';

      const [device] = await locals.db.insert(schema.devices).values({
        userId,
        name: deviceName,
        type: deviceType,
        publicKey: authPublicKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      if (tempSessionId) {
        await consumeTemporarySession(locals.db, tempSessionId);
        cookies.delete('temp_session', { path: '/' });
      }

      return {
        success: true,
        deviceId: device.id
      };
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      return {
        error: 'Failed to complete onboarding. Please try again.'
      };
    }
  }
};
