import type { OAuthProvider } from '$lib/server/db/schema';
import type { Database } from '$lib/server/db';
import type { User } from '$lib/server/db/schema';
import * as schema from '$lib/server/db/schema'
import { eq } from 'drizzle-orm';

/**
 * Represents the OAuth token response from the identity provider.
 * Contains access token, refresh token (if applicable), and expiration info.
 */
export interface TokenResponse {
  /** The token used to access protected resources */
  access_token: string;
  /** Token used to obtain a new access token when the current one expires */
  refresh_token?: string;
  /** Time in seconds until the access token expires */
  expires_in: number;
  /** Type of token (typically "Bearer") */
  token_type: string;
  /** Scopes granted by the token */
  scope?: string;
}

/**
 * Standardized user information returned by OAuth providers.
 * Different providers may return different field names, but this interface
 * normalizes the common fields needed for user identification.
 */
export interface UserInfo {
  /** Unique identifier from the identity provider */
  sub: string;
  /** User's email address */
  email: string;
  /** Whether the email has been verified by the identity provider */
  email_verified: boolean;
  /** User's display name */
  name: string;
  /** URL to user's profile picture */
  picture?: string;
}

/**
 * Result of the findOrCreateUser operation.
 * Indicates whether a new user was created or an existing one was found.
 */
export interface AuthResult {
  /** The user record from the database */
  user: User;
  /** True if this is a newly created user, false if the user already existed */
  isNewUser: boolean;
  /** OAuth access token for the user */
  accessToken?: string;
  /** OAuth refresh token for the user */
  refreshToken?: string;
  /** ISO timestamp when the access token expires */
  expiresAt?: string;
  /** OAuth scopes granted to the application */
  scope?: string;
}

interface FindOrCreateUserParams {
  db: Database;
  providerAccountId: string;
  email: string;
  name: string;
  pictureUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

/**
 * Abstract base class for OAuth provider implementations.
 * Provides common functionality for OAuth authentication flows and user management.
 * Subclasses implement provider-specific details like URLs and token exchange.
 *
 * @example
 * ```typescript
 * const env = process.env as Record<string, string | undefined>;
 * const googleOAuth = new GoogleOAuth(env);
 *
 * const authUrl = googleOAuth.getAuthUrl(state);
 * const tokens = await googleOAuth.exchangeCodeForTokens(code);
 * const userInfo = await googleOAuth.getUserInfo(tokens.access_token);
 * const { user, isNewUser } = await googleOAuth.findOrCreateUser(db, ...);
 * ```
 */
export abstract class OAuthProviderBase {
  /** The OAuth provider identifier (e.g., 'google', 'github') */
  protected abstract readonly provider: OAuthProvider;
  /** URL to initiate OAuth authorization flow */
  protected abstract readonly authUrl: string;
  /** URL to exchange authorization code for tokens */
  protected abstract readonly tokenUrl: string;
  /** URL to fetch user profile information */
  protected abstract readonly userInfoUrl: string;
  /** Space-separated list of OAuth scopes to request */
  protected abstract readonly scopes: string;

  /**
   * Generates the OAuth authorization URL with appropriate parameters.
   * The state parameter should be stored for validation in the callback.
   *
   * @param state - A random string used for CSRF protection
   * @returns The full authorization URL to redirect the user to
   */
  abstract getAuthUrl(state: string): string;

  /**
   * Exchanges an authorization code for OAuth tokens.
   * This typically requires the client secret.
   *
   * @param code - The authorization code received from the OAuth callback
   * @returns TokenResponse containing access and refresh tokens
   */
  abstract exchangeCodeForTokens(code: string): Promise<TokenResponse>;

  /**
   * Fetches user profile information using an access token.
   *
   * @param accessToken - The OAuth access token with appropriate scopes
   * @returns UserInfo containing the user's profile data
   */
  abstract getUserInfo(accessToken: string): Promise<UserInfo>;



  /**
   * Finds an existing user or creates a new one based on OAuth provider data.
   * This method handles:
   * - Finding existing OAuth accounts by provider account ID
   * - Linking new OAuth accounts to existing users by email
   * - Creating new users with associated OAuth accounts
   *
   * @param params - Object containing all parameters for finding or creating a user
   * @returns AuthResult with the user record and whether it's new
   */
  async findOrCreateUser(params: FindOrCreateUserParams): Promise<AuthResult> {
    const { db, providerAccountId, email, name, pictureUrl, accessToken, refreshToken, expiresAt, scope } = params;

    // Check if oauth account exists
    const existingAccount = await db.query.oauthAccount.findFirst({
      where: (account, { eq }) => eq(account.providerAccountId, providerAccountId)
    });

    if (existingAccount) {
      // Update the existing account's tokens
      await db.update(schema.oauthAccount)
        .set({
          accessToken,
          refreshToken,
          expiresAt: expiresAt?.toISOString(),
          scope,
          updatedAt: new Date().toISOString()
        })
        .where(eq(schema.oauthAccount.id, existingAccount.id)).returning();

      // Get the user
      const user = await db.query.user.findFirst({
        where: (user, { eq }) => eq(user.id, existingAccount.userId)
      });

      if (!user) {
        throw new Error('User not found for existing oauth account');
      }

      return { user, isNewUser: false };
    }

    // Check if user with email exists
    const existingUser = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.email, email)
    });

    if (existingUser) {
      // Link the existing user to the new oauth account
      const accountId = crypto.randomUUID();
      await db.insert(schema.oauthAccount).values({
        id: accountId,
        userId: existingUser.id,
        provider: this.provider,
        providerAccountId,
        accessToken,
        refreshToken,
        expiresAt: expiresAt?.toISOString(),
        scope
      });

      return { user: existingUser, isNewUser: false };
    }

    // Create new user
    const [user] = await db.insert(schema.user).values({
      email,
      name,
      pictureUrl
    }).returning();

    const accountId = crypto.randomUUID();
    await db.insert(schema.oauthAccount).values({
      id: accountId,
      userId: user.id,
      provider: this.provider,
      providerAccountId,
      accessToken,
      refreshToken,
      expiresAt: expiresAt?.toISOString(),
      scope
    });

    if (!user) {
      throw new Error('Failed to create user');
    }

    return { user, isNewUser: true };
  }
}
