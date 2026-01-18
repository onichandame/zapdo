import { eq, and, isNull } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import type { Database } from '$lib/server/db';
import type { Project } from '$lib/server/db/schema';

const MAX_DEPTH = 5

export async function getAllUserProjects(
  db: Database,
  userId: string
) {
  const projects = await db.query.project.findMany({
    where: (project, { eq }) => eq(project.userId, userId),
    orderBy: (project, { desc }) => [desc(project.createdAt)],
  });

  return projects;
}

export async function validatePotentialParent(
  db: Database,
  projectId: string | null,
  potentialParentId: string
) {
  let currentId = potentialParentId;
  let depth = projectId ? 1 : 0;
  let reachRoot = false

  while (depth < MAX_DEPTH) {
    if (currentId === projectId) {
      return { error: `Project may have loop!` }
    }

    const project = await db.query.project.findFirst({
      where: (project, { eq }) => eq(project.id, currentId),
    });

    if (!project) {
      break;
    }
    if (!project.parentId) { reachRoot = true; break }
    else {
      currentId = project.parentId
      depth++;
    }
  }
  if (!reachRoot)
    return { error: `Projects can only have at maximum 5 ancesters` }
}

export async function getProjectPath(
  db: Database,
  projectId: string
) {
  const path: Project[] = [];

  let currentId: string = projectId;
  let depth = 0;

  while (depth < MAX_DEPTH) {
    if (path.some(proj => proj.id === currentId)) throw new Error(`${currentId} has loop!`)
    const project = await db.query.project.findFirst({
      where: (project, { eq }) => eq(project.id, currentId),
    })

    if (!project) {
      break;
    }

    path.unshift(project);
    if (!project.parentId) break
    currentId = project.parentId;
    depth++;
  }

  return path;
}

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

export async function getProjectsByUserId(
  db: Database,
  userId: string,
  parentId: string | null = null
) {
  const whereClause = parentId === null
    ? and(
      eq(schema.project.userId, userId),
      isNull(schema.project.parentId)
    )
    : and(
      eq(schema.project.userId, userId),
      eq(schema.project.parentId, parentId)
    );
  const projects = await db.query.project.findMany({
    where: whereClause,
    orderBy: (project, { desc }) => [desc(project.createdAt)],
    with: {
      subprojects: {
        columns: {
          id: true
        }
      }
    }
  }).then(projects => projects.map(project => ({ ...project, subprojectsCount: project.subprojects.length, hasSubprojects: project.subprojects.length > 0 })))
  return projects
}

export async function getProjectById(db: Database, projectId: string) {
  const project = await db.query.project.findFirst({
    where: (project, { eq }) => eq(project.id, projectId),
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
