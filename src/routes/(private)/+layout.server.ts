import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.session) {
    throw redirect(302, '/login');
  }

  const hasKek = locals.session.user.keks.length > 0

  if (!hasKek && !url.pathname.startsWith('/onboarding')) {
    throw redirect(302, '/onboarding');
  }

  return {};
};
