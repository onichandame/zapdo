import type * as schema from '$lib/server/db/schema';
import type { Database } from '$lib/server/db';

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
      session?: {
        id: string;
        user: schema.User,
      };
      db: Database;
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
