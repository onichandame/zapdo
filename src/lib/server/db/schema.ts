import { index, integer, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export type OAuthProvider = 'google' | 'github';

export const user = sqliteTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  pictureUrl: text('picture_url'),
  kekPublicKey: text('kek_public_key'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
});

export const oauthAccount = sqliteTable(
  'oauth_account',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    provider: text('provider', { enum: ['google', 'github'] }).notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    expiresAt: text('expires_at'),
    scope: text('scope'),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
  },
  (table) => [
    index('oauth_account_provider_account_idx').on(table.provider, table.providerAccountId),
    index('oauth_account_user_id_idx').on(table.userId)
  ]
);

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    deviceName: text(`device_name`),
    devicePublicKey: text(`device_public_key`),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString())
  },
  (table) => [
    index('session_user_id_idx').on(table.userId),
    index('session_expires_at_idx').on(table.expiresAt)
  ]
);

export const project = sqliteTable(
  'project',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').notNull(),
    icon: text('icon').notNull(),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
  },
  (table) => [
    index('project_user_id_idx').on(table.userId),
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  oauthAccounts: many(oauthAccount),
  sessions: many(session),
  projects: many(project, {
    relationName: 'userProjects'
  }),
  deks: many(userProjectDek, { relationName: 'userDeks' }),
}));

export const oauthAccountRelations = relations(oauthAccount, ({ one }) => ({
  user: one(user, {
    fields: [oauthAccount.userId],
    references: [user.id]
  })
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  }),
}));

export const userProjectDek = sqliteTable(
  'user_project_dek',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    encryptedDek: text('encrypted_dek').notNull(),
    encryptionAlgorithm: text('encryption_algorithm').notNull().default('AES-GCM'),
    keyDerivationVersion: integer('key_derivation_version').notNull().default(1),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
  },
  (table) => [
    uniqueIndex('user_project_dek_user_project_idx').on(table.userId, table.projectId,),
    index('user_project_dek_user_id_idx').on(table.userId),
    index('user_project_dek_project_id_idx').on(table.projectId)
  ]
);

export const userProjectDekRelations = relations(userProjectDek, ({ one }) => ({
  user: one(user, {
    fields: [userProjectDek.userId],
    references: [user.id],
    relationName: 'userDeks'
  }),
  project: one(project, {
    fields: [userProjectDek.projectId],
    references: [project.id],
    relationName: 'projectDeks'
  })
}));

export const projectRelations = relations(project, ({ one, many }) => ({
  user: one(user, {
    fields: [project.userId],
    references: [user.id]
  }),
  deks: many(userProjectDek, { relationName: 'projectDeks' }),
  tasks: many(tasks)
}));

export const tasks = sqliteTable(
  'task',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: ['pending', 'in_progress', 'completed', 'cancelled'] }).notNull().default('pending'),
    priority: text('priority', { enum: ['urgent', 'high', 'medium', 'low'] }).notNull().default('medium'),
    dueDate: text('due_date'),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
  },
  (table) => [
    index('task_project_id_idx').on(table.projectId),
    index('task_status_idx').on(table.status),
    index('task_priority_idx').on(table.priority),
    index('task_due_date_idx').on(table.dueDate)
  ]
);

export const tags = sqliteTable(`tags`, {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tag: text().notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const taskToTag = sqliteTable(`task_to_tag`, {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId: text(`task_id`).notNull().references(() => tasks.id, { onDelete: `cascade` }),
  tagId: text(`tag_id`).notNull().references(() => tags.id, { onDelete: `cascade` })
}, table => [
  index(`task_to_tag_task_id_idx`).on(table.taskId),
  index(`task_to_tag_tag_id_idx`).on(table.tagId),
])

export const tagRelations = relations(tags, ({ one, many }) => ({
  taskToTag: many(taskToTag)
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  project: one(project, {
    fields: [tasks.projectId],
    references: [project.id]
  }),
  taskToTag: many(taskToTag)
}));

export const taskToTagRelations = relations(taskToTag, ({ one }) => ({
  tasks: one(tasks, { fields: [taskToTag.taskId], references: [tasks.id] }),
  tags: one(tags, { fields: [taskToTag.tagId], references: [tags.id] })
}))

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type UserProjectDek = typeof userProjectDek.$inferSelect;
export type NewUserProjectDek = typeof userProjectDek.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
