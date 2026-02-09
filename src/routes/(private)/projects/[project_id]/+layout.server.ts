import { error } from '@sveltejs/kit';

export const load = async ({ locals, params }) => {
  const projectId = params.project_id
  const project = await locals.db.query.project.findFirst({ where: (projects, { eq }) => eq(projects.id, projectId), with: { deks: { where: (deks, { eq }) => eq(deks.userId, locals.session!.user.id) } } })
  if (!project?.deks[0]) throw error(403, `Unauthorized`)
  return { project };
};
