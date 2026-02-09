import { writable } from 'svelte/store';
import type * as schema from '$lib/server/db/schema'

// For projects/[project_id] route, stores the decrypted project data
export const projectStore = writable<{ project: schema.Project, dek: CryptoKey } | null>(null)
