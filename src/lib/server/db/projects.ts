import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import type { Database } from '$lib/server/db';

export async function createProject(
  db: Database,
  userId: string,
  projectData: {
    name: string;
    description?: string;
    color: string;
    icon: string;
    parentId?: string;
  }
) {
  const projectId = crypto.randomUUID();
  const [project] = await db
    .insert(schema.project)
    .values({
      id: projectId,
      userId,
      name: projectData.name,
      description: projectData.description,
      color: projectData.color,
      icon: projectData.icon,
      parentId: projectData.parentId
    })
    .returning();

  if (!project) {
    throw new Error('Failed to create project');
  }

  return project;
}

export async function getProjectsByUserId(db: Database, userId: string) {
  const projects = await db.query.project.findMany({
    where: (project, { eq }) => eq(project.userId, userId),
    orderBy: (project, { desc }) => [desc(project.createdAt)]
  });

  return projects;
}

export async function getProjectById(db: Database, projectId: string) {
  const project = await db.query.project.findFirst({
    where: (project, { eq }) => eq(project.id, projectId)
  });

  return project;
}

export async function updateProject(
  db: Database,
  projectId: string,
  projectData: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    parentId?: string;
  }
) {
  const [project] = await db
    .update(schema.project)
    .set({
      ...projectData,
      updatedAt: new Date().toISOString()
    })
    .where(eq(schema.project.id, projectId))
    .returning();

  if (!project) {
    throw new Error('Failed to update project');
  }

  return project;
}

export async function deleteProject(db: Database, projectId: string) {
  await db.delete(schema.project).where(eq(schema.project.id, projectId));
}

export async function getSubprojectsByParentId(db: Database, parentId: string) {
  const subprojects = await db.query.project.findMany({
    where: (project, { eq }) => eq(project.parentId, parentId),
    orderBy: (project, { desc }) => [desc(project.createdAt)]
  });

  return subprojects;
}

export async function getProjectsWithoutParent(db: Database, userId: string) {
  const projects = await db.query.project.findMany({
    where: (project, { eq, and, isNull }) =>
      and(
        eq(project.userId, userId),
        isNull(project.parentId)
      ),
    orderBy: (project, { desc }) => [desc(project.createdAt)]
  });

  return projects;
}
