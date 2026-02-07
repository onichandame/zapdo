import { getAllUserProjects } from '$lib/server/db/projects.js';

export const load = async ({ url, locals }: { url: URL; locals: App.Locals }) => {
  const { session } = locals;

  // Get redirect URL from query params
  const redirectUrl = url.searchParams.get('redirect') || '/tasks';

  const projects = await getAllUserProjects(locals.db, session!.user.id);

  return {
    redirectUrl,
    projects
  };
};
