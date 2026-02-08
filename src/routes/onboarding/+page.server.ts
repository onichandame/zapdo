import { error, redirect } from '@sveltejs/kit';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { consumeTemporarySession } from '$lib/auth/session';

export const load = async ({ locals, cookies }) => {
  if (locals.device) {
    return { device: locals.device }
  }

  if (!locals.session) {
    return {}
  }

  return {
    session: locals.session,
  };
};

export const actions = {
  default: async ({ request, locals, cookies }) => {
    const session = locals.session;

    if (!session) throw error(401, `Unauthorized`)

    const formData = await request.formData();
    const authPublicKey = formData.get('authPublicKey') as string;
    const kekPublicKey = formData.get('kekPublicKey') as string;

    if (!authPublicKey || !kekPublicKey) {
      throw error(401, 'Both authPublicKey and kekPublicKey are required')
    }

    await locals.db
      .update(schema.user)
      .set({
        kekPublicKey,
        updatedAt: new Date().toISOString()
      })
      .where(eq(schema.user.id, session.user.id));

    const deviceName = 'First Device';
    const deviceType = 'browser';

    const [device] = await locals.db.insert(schema.devices).values({
      userId: session.user.id,
      name: deviceName,
      type: deviceType,
      publicKey: authPublicKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();

    cookies.delete('temp_session', { path: '/' });
    await consumeTemporarySession(locals.db, session.id);

    return {
      deviceId: device.id
    };
  }
};
