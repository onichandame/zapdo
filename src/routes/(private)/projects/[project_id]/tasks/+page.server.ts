import { fail } from '@sveltejs/kit';
import * as schema from '$lib/server/db/schema';

export const load = async ({ locals }) => {
  return {};
};

export const actions = {
  createTask: async ({ request, locals, params }) => {
    const { project_id: projectId } = params;


    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const status = formData.get('status') as string;
    const priority = formData.get('priority') as string;
    const dueDate = formData.get('dueDate') as string | null;

    if (!title || !title.trim()) {
      throw fail(400, { error: 'Task title is required' });
    }


    const dek = await locals.db.query.userProjectDek.findFirst({
      where: (table, { eq, and }) => and(eq(table.projectId, projectId), eq(table.userId, locals.session!.user.id)),
      columns: { id: true, userId: true }
    });

    if (!dek) {
      throw fail(403, { error: 'Project not found or unauthorized' });
    }

    const [task] = await locals.db.insert(schema.tasks).values({
      projectId,
      title: title.trim(),
      description: description?.trim() || undefined,
      status: status || 'pending',
      priority: priority || 'medium',
      dueDate: dueDate || undefined,
    }).returning();

    return { success: true, task };
  }
};
