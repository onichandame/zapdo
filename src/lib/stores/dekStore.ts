import { writable } from 'svelte/store';

export const dekStore = writable<Record<string, CryptoKey>>({})
