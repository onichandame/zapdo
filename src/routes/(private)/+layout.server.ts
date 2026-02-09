import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getAllUserProjects } from '$lib/server/db/projects';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.session) {
    throw redirect(302, '/login');
  }
  console.log(locals.session.user.kekPublicKey)

  if (!locals.session.user.kekPublicKey) throw redirect(302, `/onboarding`)

  const projects = await getAllUserProjects(locals.db, locals.session.user.id)

  return { session: locals.session, projects };
};
