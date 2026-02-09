import { error, redirect } from '@sveltejs/kit';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load = async ({ locals }) => {
  if (!locals.session) {
    return {}
  }

  if (locals.session.user.kekPublicKey) throw redirect(302, `/projects`)

  return {
    session: locals.session,
  };
};

export const actions = {
  default: async ({ request, locals, }) => {
    const session = locals.session;

    if (!session) throw error(401, `Unauthorized`)

    if (session.user.kekPublicKey) throw error(400, `Duplicate Onboarding`)

    const formData = await request.formData();
    const kekPublicKey = formData.get('kekPublicKey') as string;

    if (!kekPublicKey) {
      throw error(401, 'kekPublicKey is required')
    }

    await locals.db
      .update(schema.user)
      .set({
        kekPublicKey,
        updatedAt: new Date().toISOString()
      })
      .where(eq(schema.user.id, session.user.id));

    const deviceName = 'First Device';

    const [newSession] = await locals.db.update(schema.session).set({
      deviceName: deviceName,
    }).returning();

    return {
      session: newSession
    };
  }
};
