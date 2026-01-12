/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Locals {
			user?: {
				id: number;
			};
		}
		interface Platform {
			env: {
				DB: D1Database;
				R2: R2Bucket;
				KV: KVNamespace;
				ENVIRONMENT: string;
			};
		}
	}
}

interface Env {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  ENVIRONMENT: string;
}

export {};
