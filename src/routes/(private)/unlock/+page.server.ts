import { getAllUserProjects } from '$lib/server/db/projects.js';
import type { UserKek } from '$lib/server/db/schema';

export const load = async ({ url, locals }) => {
  const { session } = locals;


  // Get user's KEKs
  const userKeks = session!.user.keks as UserKek[];

  // Get redirect URL from query params
  const redirectUrl = url.searchParams.get('redirect') || '/tasks';

  const projects = await getAllUserProjects(locals.db, session!.user.id)

  return {
    userKeks,
    redirectUrl
    , projects
  };
};
