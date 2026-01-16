import { OAuthProviderBase } from '$lib/server/auth/oauth/base';
import type { TokenResponse, UserInfo } from '$lib/server/auth/oauth/base';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

type GoogleUserInfo = {
  id: string
  email: string
  verified_email: boolean,
  name: string,
  given_name: string,
  family_name: string,
  picture: string
}

export class CloudflareGoogleOAuth extends OAuthProviderBase {
  readonly provider = 'google' as const;
  protected readonly authUrl = GOOGLE_AUTH_URL;
  protected readonly tokenUrl = GOOGLE_TOKEN_URL;
  protected readonly userInfoUrl = GOOGLE_USERINFO_URL;
  protected readonly scopes = 'openid email profile';

  constructor(private env: Cloudflare.Env) { super() }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.env.GOOGLE_CLIENT_ID,
      redirect_uri: this.env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: this.scopes,
      state,
      access_type: 'offline',
      prompt: 'consent'
    });
    const authUrl = new URL(this.authUrl)
    authUrl.search = params.toString()

    return authUrl.href
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.env.GOOGLE_CLIENT_ID,
        client_secret: this.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.env.GOOGLE_CALLBACK_URL
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    return response.json() as Promise<TokenResponse>;
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(this.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Google user info: ${error}`);
    }

    const userInfo: GoogleUserInfo = await response.json()
    return { email: userInfo.email, email_verified: userInfo.verified_email, name: userInfo.name, sub: userInfo.id, picture: userInfo.picture }
  }
}

