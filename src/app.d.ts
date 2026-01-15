import type * as schema from '$lib/server/db/schema';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Platform {
      env: Env;
      ctx: ExecutionContext;
      caches: CacheStorage;
      cf?: IncomingRequestCfProperties
    }

    interface Locals {
      user?: {
        id: string;
        email: string;
        name: string;
      };
      db: DrizzleD1Database<typeof schema>;
    }

    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  interface Env {
    DB: D1Database;
  }
}

export { };
