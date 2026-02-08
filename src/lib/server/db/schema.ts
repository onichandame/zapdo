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
  devices: many(devices),
  deviceRequests: many(deviceRequests)
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

export const devices = sqliteTable(
  'devices',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').notNull(),
    publicKey: text('public_key').notNull(),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
  },
  (table) => [
    index('devices_user_id_idx').on(table.userId)
  ]
);

export const deviceRequests = sqliteTable(
  'device_requests',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    requestingDeviceName: text('requesting_device_name').notNull(),
    requestingDeviceType: text('requesting_device_type').notNull(),
    requestingDeviceTempPublicKey: text('requesting_device_temp_public_key').notNull(),
    status: text('status', { enum: ['pending', 'approved', 'rejected', 'expired'] }).notNull().default('pending'),
    encryptedKekPrivateKey: text('encrypted_kek_private_key'),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
  },
  (table) => [
    index('device_requests_user_id_idx').on(table.userId),
    index('device_requests_status_idx').on(table.status),
    index('device_requests_expires_at_idx').on(table.expiresAt)
  ]
);

export const projectRelations = relations(project, ({ one, many }) => ({
  user: one(user, {
    fields: [project.userId],
    references: [user.id]
  }),
  deks: many(userProjectDek, { relationName: 'projectDeks' })
}));

export const devicesRelations = relations(devices, ({ one }) => ({
  user: one(user, {
    fields: [devices.userId],
    references: [user.id]
  })
}));

export const deviceRequestsRelations = relations(deviceRequests, ({ one }) => ({
  user: one(user, {
    fields: [deviceRequests.userId],
    references: [user.id]
  })
}));

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type UserProjectDek = typeof userProjectDek.$inferSelect;
export type NewUserProjectDek = typeof userProjectDek.$inferInsert;
export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type DeviceRequest = typeof deviceRequests.$inferSelect;
export type NewDeviceRequest = typeof deviceRequests.$inferInsert;
