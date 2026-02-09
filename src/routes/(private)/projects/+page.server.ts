import { fail } from '@sveltejs/kit';
import { deleteProject, updateProject, createProject, getAllUserProjects } from '$lib/server/db/projects';

export const load = async ({ }) => {
  return {};
};

export const actions = {
  createProject: async ({ request, locals }) => {
    const { session, db } = locals;

    if (!session) {
      throw fail(401, { error: 'Unauthorized' });
    }

    const userKek = session.user.kekPublicKey;
    if (!userKek) {
      throw fail(400, { error: 'Master password not set up. Please complete onboarding first.' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    const color = formData.get('color') as string;
    const icon = formData.get('icon') as string;
    const encryptedDek = formData.get('encryptedDek') as string;
    const encryptionAlgorithm = formData.get('encryptionAlgorithm') as string;

    if (!name || !name.trim()) {
      throw fail(400, { error: 'Project name is required' });
    }

    if (!color) {
      throw fail(400, { error: 'Project color is required' });
    }

    if (!icon) {
      throw fail(400, { error: 'Project icon is required' });
    }

    if (!encryptedDek) {
      throw fail(400, { error: 'Encrypted DEK is required' });
    }

    if (!encryptionAlgorithm) {
      throw fail(400, { error: 'Encryption algorithm is required' });
    }

    const project = await createProject(db, session.userId, {
      name: name.trim(),
      description: description?.trim() || undefined,
      color,
      icon,
    }, { encryptedDek, encryptionAlgorithm, });

    return { success: true, project };
  },

  deleteProject: async ({ request, locals }) => {
    const { session, db } = locals;

    if (!session) {
      throw fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const projectId = formData.get('projectId') as string;

    if (!projectId) {
      throw fail(400, { error: 'Project ID is required' });
    }

    await deleteProject(db, projectId);
    return { success: true };
  },

  updateProject: async ({ request, locals }) => {
    const { session, db } = locals;

    if (!session) {
      throw fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const projectId = formData.get('projectId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    const color = formData.get('color') as string;
    const icon = formData.get('icon') as string;

    if (!projectId) {
      throw fail(400, { error: 'Project ID is required' });
    }

    if (!name || !name.trim()) {
      throw fail(400, { error: 'Project name is required' });
    }

    if (!color) {
      throw fail(400, { error: 'Project color is required' });
    }

    if (!icon) {
      throw fail(400, { error: 'Project icon is required' });
    }

    const existingProject = await db.query.project.findMany({
      where: (project: any, { eq }: any) => eq(project.userId, session.userId)
    });
    const projectExists = existingProject.some((p: any) => p.id === projectId);

    if (!projectExists) {
      throw fail(403, { error: 'Project not found or unauthorized' });
    }

    const project = await updateProject(db, projectId, {
      name: name.trim(),
      description: description?.trim() || undefined,
      color,
      icon,
    });

    return { success: true, project };
  }
};
