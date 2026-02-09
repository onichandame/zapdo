import { writable } from 'svelte/store';
import * as schema from '$lib/server/db/schema'

// For projects/[project_id] route, stores the decrypted project data
export const projectStore = writable<schema.Project | null>(null)
