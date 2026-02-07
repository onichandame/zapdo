import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.session) {
    throw redirect(302, '/login');
  }

  const hasKek = !!locals.session.user.kekPublicKey

  if (!hasKek) {
    throw redirect(302, '/login');
  }

  return {};
};
