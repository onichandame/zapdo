import { writable } from 'svelte/store';

export const deviceKeyStore = writable<{ deviceId: string, privateKey: CryptoKey } | null>(null);
