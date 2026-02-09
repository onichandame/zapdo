import { fail } from '@sveltejs/kit';
import * as schema from '$lib/server/db/schema';
import { and, desc, eq, like } from 'drizzle-orm';

export const load = async ({ locals, url, params }) => {
  const { project_id: projectId } = params;

  const projectAccess = await locals.db.query.userProjectDek.findFirst({
    where: (table, { and, eq }) => and(
      eq(table.projectId, projectId),
      eq(table.userId, locals.session!.user.id)
    ),
    columns: { id: true }
  });

  if (!projectAccess) {
    throw fail(403, { error: 'Project not found or unauthorized' });
  }

  const query = locals.db.select().from(schema.tasks).orderBy(desc(schema.tasks.priority), desc(schema.tasks.createdAt))
  const searchQuery = btoa(url.searchParams.get('search')?.trim() || '');
  const statusFilter = url.searchParams.get('status')?.trim() as schema.Task['status'] || '';
  const priorityFilter = parseInt(url.searchParams.get('priority')?.trim() || '');
  const tagFilter = url.searchParams.get('tag')?.trim() || '';

  const conditions = [eq(schema.tasks.projectId, projectId)];

  if (searchQuery) {
    conditions.push(like(schema.tasks.title, `%${searchQuery}%`));
  }

  if (statusFilter && (['pending', 'in_progress', 'completed', 'cancelled'] as const).includes(statusFilter)) {
    conditions.push(eq(schema.tasks.status, statusFilter));
  }

  if (!isNaN(priorityFilter)) {
    conditions.push(eq(schema.tasks.priority, priorityFilter));
  }

  if (tagFilter) {
    const tasks = await query.innerJoin(schema.taskToTag, eq(schema.tasks.id, schema.taskToTag.taskId)).where(and(
      ...conditions,
      eq(schema.taskToTag.tagId, tagFilter)
    ))
    return { tasks, searchQuery, statusFilter, priorityFilter, tagFilter };
  }

  const tasks = await query.where(and(...conditions))
  return { tasks, searchQuery, statusFilter, priorityFilter, tagFilter };
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

    const projectAccess = await locals.db.query.userProjectDek.findFirst({
      where: (table, { eq, and }) => and(eq(table.projectId, projectId), eq(table.userId, locals.session!.user.id)),
      columns: { id: true, userId: true }
    });

    if (!projectAccess) {
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
