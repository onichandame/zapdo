import { writable } from 'svelte/store';

export const kekStore = writable<CryptoKey | null>(null)
