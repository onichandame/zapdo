import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (locals.session?.user) {
    if (locals.session.user.kekPublicKey) {
      throw redirect(302, '/tasks');
    } else {
      throw redirect(302, '/onboarding');
    }
  }

  return {};
};
