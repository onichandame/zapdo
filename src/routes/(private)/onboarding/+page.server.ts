import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { createUserKek } from '$lib/server/auth/session';

export const load = async ({ locals }: RequestEvent) => {
  const session = locals.session;

  if (!session) {
    throw redirect(303, '/login');
  }

  const hasKek = !!locals.session?.user.keks.length

  if (hasKek) {
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

    const formData = await request.formData();
    const keyDerivationSalt = formData.get('keyDerivationSalt') as string;
    const keyDerivationIterations = parseInt(formData.get('keyDerivationIterations') as string);
    const publicKey = formData.get('publicKey') as string;
    const encryptedPrivateKey = formData.get('encryptedPrivateKey') as string;

    if (!keyDerivationSalt || !keyDerivationIterations || !publicKey || !encryptedPrivateKey) {
      return {
        error: 'Required fields are missing'
      };
    }

    try {
      await createUserKek(
        locals.db,
        session.user.id,
        keyDerivationSalt,
        keyDerivationIterations,
        publicKey,
        encryptedPrivateKey
      );

      return {
        success: true
      };
    } catch (err) {
      console.error('Failed to create master password:', err);
      return {
        error: 'Failed to set master password. Please try again.'
      };
    }
  }
};
