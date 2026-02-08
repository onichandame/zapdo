import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (locals.device)
    throw redirect(302, `/projects`)
  if (locals.session)
    throw redirect(302, `/onboarding`)

  return {};
};
