import { fail } from '@sveltejs/kit';
import type { Session } from '$lib/server/db/schema';
import type { Database } from '$lib/server/db';
import { getProjectsByUserId, deleteProject, updateProject } from '$lib/server/db/projects';

interface Locals {
  session: Session | null;
  db: Database;
}

export const load = async ({ locals }: { locals: Locals }) => {
  const { session, db } = locals;

  if (!session) {
    return {
      projects: []
    };
  }

  const projects = await getProjectsByUserId(db, session.userId);

  return {
    projects
  };
};

export const actions = {
  deleteProject: async ({ request, locals }) => {
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

  updateProject: async ({ request, locals }) => {
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

    try {
      const existingProject = await getProjectsByUserId(db, session.userId);
      const projectExists = existingProject.some(p => p.id === projectId);

      if (!projectExists) {
        return fail(403, { error: 'Project not found or unauthorized' });
      }

      const project = await updateProject(db, projectId, {
        name: name.trim(),
        description: description?.trim() || undefined,
        color,
        icon
      });

      return { success: true, project };
    } catch (error) {
      console.error('Failed to update project:', error);
      return fail(500, { error: 'Failed to update project' });
    }
  }
};
