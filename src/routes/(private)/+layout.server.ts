import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getAllUserProjects } from '$lib/server/db/projects';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.device) {
    throw redirect(302, '/login');
  }

  if (locals.session) {
    throw redirect(302, '/onboarding');
  }

  const projects = await getAllUserProjects(locals.db, locals.device.user.id)

  return { device: locals.device, projects };
};
