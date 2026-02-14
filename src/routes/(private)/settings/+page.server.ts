import { redirect, fail } from '@sveltejs/kit';
import * as schema from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load = async ({ locals }) => {
  if (!locals.session) {
    throw redirect(302, '/login');
  }

  const sessions = await locals.db.query.session.findMany({
    where: eq(schema.session.userId, locals.session.user.id),
    orderBy: (s, { desc }) => [desc(s.createdAt)]
  });

  const currentSessionId = locals.session.id;

  const devices = sessions.map(s => ({
    id: s.id,
    deviceName: s.deviceName || 'Unknown Device',
    devicePublicKey: s.devicePublicKey,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    isCurrentDevice: s.id === currentSessionId
  }));

  return {
    devices
  };
};

export const actions = {
  deleteDevice: async ({ request, locals }) => {
    if (!locals.session) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const deviceId = formData.get('deviceId') as string;

    if (!deviceId) {
      return fail(400, { error: 'Device ID is required' });
    }

    if (deviceId === locals.session.id) {
      return fail(400, { error: 'Cannot delete current device' });
    }

    await locals.db.delete(schema.session)
      .where(eq(schema.session.id, deviceId));

    return { success: true };
  }
};
