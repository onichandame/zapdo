import { fail } from '@sveltejs/kit';
import { createProject } from '$lib/server/db/projects';

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
      const project = await createProject(db, session.user.id, {
        name: name.trim(),
        description: description?.trim() || undefined,
        color,
        icon
      });

      return { success: true, project };
    } catch (error) {
      console.error('Failed to create project:', error);
      return fail(500, { error: 'Failed to create project' });
    }
  }
};