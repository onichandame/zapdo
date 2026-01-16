import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
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
export const userRelations = relations(user, ({ many }) => ({
  oauthAccounts: many(oauthAccount),
  sessions: many(session)
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

// Inferred types for easy usage
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type OAuthAccount = typeof oauthAccount.$inferSelect;
export type NewOAuthAccount = typeof oauthAccount.$inferInsert;
export type OAuthProvider = 'google' | 'github';

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
