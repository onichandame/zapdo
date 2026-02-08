import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import type { Database } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { importEcToKey, verifyEcdsaSignature } from '$lib/crypto';

export const TEMP_SESSION_COOKIE_NAME = 'temp_session';
const TEMP_SESSION_EXPIRY_MINUTES = 15;

export async function createTemporarySession(
  db: Database,
  userId: string
) {
  const tempSessionId = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TEMP_SESSION_EXPIRY_MINUTES);

  const [session] = await db.insert(schema.session).values({
    id: tempSessionId,
    userId,
    expiresAt: expiresAt.toISOString()
  }).returning();

  return session;
}

export async function validateTemporarySession(
  db: Database,
  tempSessionId: string
) {
  const tempSession = await db.query.session.findFirst({
    where: (session, { eq }) => eq(session.id, tempSessionId)
    , with: { user: { with: { oauthAccounts: true } } }
  });

  if (!tempSession) {
    return null;
  }

  if (new Date(tempSession.expiresAt) < new Date()) {
    await db.delete(schema.session)
      .where(eq(schema.session.id, tempSessionId));
    return null;
  }

  return tempSession;
}

export async function consumeTemporarySession(
  db: Database,
  tempSessionId: string
): Promise<void> {
  await db.delete(schema.session)
    .where(eq(schema.session.id, tempSessionId));
}

export async function parseDeviceToken(db: Database, token: string) {
  const [deviceId, authToken, signature] = token.split(`;`)
  const device = await db.query.devices.findFirst({ where: (device, { eq }) => eq(device.id, deviceId), with: { user: true } })
  if (!device) throw error(400, `device not found`)
  const devicePubKey = await importEcToKey(device.publicKey, `public`, `ECDSA`)
  const signatureValid = await verifyEcdsaSignature(devicePubKey, signature, authToken)
  if (!signatureValid) throw error(401, `signature broken`)
  const timestamp = new Date(btoa(authToken))
  if (Math.abs(timestamp.getTime() - Date.now()) < 1000 * 60 * 5) throw error(401, `auth token expired`)
  return device
}
