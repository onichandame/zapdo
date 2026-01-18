import { index, integer, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const user = sqliteTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
});

export const userKek = sqliteTable(
  'user_kek',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    keyDerivationSalt: text('key_derivation_salt').notNull(),
    keyDerivationIterations: integer('key_derivation_iterations').notNull().default(100000),
    keyDerivationAlgorithm: text('key_derivation_algorithm').notNull().default('PBKDF2-SHA256'),
    keyVersion: integer('key_version').notNull().default(1),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
  },
  (table) => [
    uniqueIndex('user_kek_user_id_key_version_idx').on(table.userId, table.keyVersion)
  ]
);

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
    parentId: text('parent_id').references((): AnySQLiteColumn => project.id),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').notNull(),
    icon: text('icon').notNull(),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
  },
  (table) => [
    index('project_user_id_idx').on(table.userId),
    index('project_parent_id_idx').on(table.parentId)
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  oauthAccounts: many(oauthAccount),
  sessions: many(session),
  projects: many(project, {
    relationName: 'userProjects'
  }),
  kek: many(userKek, { relationName: `userkek` }),
  deks: many(userProjectDek, { relationName: 'userDeks' })
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
  })
}));

export const userKekRelations = relations(userKek, ({ one, many }) => ({
  user: one(user, {
    fields: [userKek.userId],
    references: [user.id]
    , relationName: `userkek`
  }),
  projectDeks: many(userProjectDek, { relationName: `userKeks` })
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
    userKekId: text('user_kek_id').notNull().references(() => userKek.id, { onDelete: 'set null' }),
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
  }),
  userKek: one(userKek, { fields: [userProjectDek.userKekId], references: [userKek.id], relationName: `userKeks` })
}));

export const projectRelations = relations(project, ({ one, many }) => ({
  user: one(user, {
    fields: [project.userId],
    references: [user.id]
  }),
  parent: one(project, {
    fields: [project.parentId],
    references: [project.id]
    , relationName: 'subprojects'
  }),
  subprojects: many(project, {
    relationName: 'subprojects'
  }),
  deks: many(userProjectDek, { relationName: 'projectDeks' })
}));

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type UserKek = typeof userKek.$inferSelect;
export type NewUserKek = typeof userKek.$inferInsert;
export type UserProjectDek = typeof userProjectDek.$inferSelect;
export type NewUserProjectDek = typeof userProjectDek.$inferInsert;
