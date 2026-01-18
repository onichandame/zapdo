import { fail, type RequestEvent } from '@sveltejs/kit';
import { deleteProject, updateProject, createProject, getProjectsByUserId, getProjectPath, getAllUserProjects, validatePotentialParent } from '$lib/server/db/projects';

export const load = async ({ locals, url }) => {
  const { session, db } = locals;
  const parentId = url.searchParams.get('parent');

  const projects = await getProjectsByUserId(
    db,
    session!.userId,
    parentId || null
  );

  const allProjects = await getAllUserProjects(db, session!.userId);

  const breadcrumbPath = parentId ? await getProjectPath(db, parentId) : null;

  return {
    projects,
    allProjects,
    currentParentId: parentId,
    breadcrumbPath
  };
};

export const actions = {
  createProject: async ({ request, locals }) => {
    const { session, db } = locals;

    if (!session) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    const color = formData.get('color') as string;
    const icon = formData.get('icon') as string;
    const parentId = formData.get('parentId') as string | null;

    if (!name || !name.trim()) {
      return fail(400, { error: 'Project name is required' });
    }

    if (!color) {
      return fail(400, { error: 'Project color is required' });
    }

    if (!icon) {
      return fail(400, { error: 'Project icon is required' });
    }

    if (parentId) {
      const result = await validatePotentialParent(db, null, parentId);
      if (result) {
        return fail(400, { error: result.error });
      }
    }

    try {
      const project = await createProject(db, session.userId, {
        name: name.trim(),
        description: description?.trim() || undefined,
        color,
        icon,
        parentId: parentId || undefined
      });

      return { success: true, project };
    } catch (error) {
      console.error('Failed to create project:', error);
      return fail(500, { error: 'Failed to create project' });
    }
  },

  deleteProject: async ({ request, locals }: RequestEvent) => {
    const { session, db } = locals;

    if (!session) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const projectId = formData.get('projectId') as string;

    if (!projectId) {
      return fail(400, { error: 'Project ID is required' });
    }

    try {
      await deleteProject(db, projectId);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete project:', error);
      return fail(500, { error: 'Failed to delete project' });
    }
  },

  updateProject: async ({ request, locals }: RequestEvent) => {
    const { session, db } = locals;

    if (!session) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const projectId = formData.get('projectId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    const color = formData.get('color') as string;
    const icon = formData.get('icon') as string;
    const parentId = formData.get('parentId') as string | null;

    if (!projectId) {
      return fail(400, { error: 'Project ID is required' });
    }

    if (!name || !name.trim()) {
      return fail(400, { error: 'Project name is required' });
    }

    if (!color) {
      return fail(400, { error: 'Project color is required' });
    }

    if (!icon) {
      return fail(400, { error: 'Project icon is required' });
    }

    if (parentId) {
      const result = await validatePotentialParent(db, projectId, parentId);
      if (result) {
        return fail(400, { error: result.error });
      }
    }

    try {
      const existingProject = await db.query.project.findMany({
        where: (project: any, { eq }: any) => eq(project.userId, session.userId)
      });
      const projectExists = existingProject.some((p: any) => p.id === projectId);

      if (!projectExists) {
        return fail(403, { error: 'Project not found or unauthorized' });
      }

      const project = await updateProject(db, projectId, {
        name: name.trim(),
        description: description?.trim() || undefined,
        color,
        icon,
        parentId: parentId || undefined
      });

      return { success: true, project };
    } catch (error) {
      console.error('Failed to update project:', error);
      return fail(500, { error: 'Failed to update project' });
    }
  }
};
