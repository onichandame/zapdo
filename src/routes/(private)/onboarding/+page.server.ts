import { error, redirect } from '@sveltejs/kit';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load = async ({ locals }) => {
  const session = locals.session;

  if (!session) {
    throw redirect(303, '/login');
  }

  const hasCompletedPasswordlessOnboarding = !!locals.session?.user.kekPublicKey;

  if (hasCompletedPasswordlessOnboarding) {
    throw redirect(303, '/tasks');
  }

  return {
    user: session.user
  };
};

export const actions = {
  default: async ({ request, locals }) => {
    const session = locals.session;

    if (!session) {
      throw error(401, 'Unauthorized');
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
        .where(eq(schema.user.id, session.user.id));

      const deviceId = crypto.randomUUID();
      const deviceName = 'First Device';
      const deviceType = 'browser';

      await locals.db.insert(schema.devices).values({
        id: deviceId,
        userId: session.user.id,
        name: deviceName,
        type: deviceType,
        publicKey: authPublicKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return {
        success: true
      };
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      return {
        error: 'Failed to complete onboarding. Please try again.'
      };
    }
  }
};
