import { writable } from 'svelte/store';

/**
 * In-memory store for the user's Key Encryption Key (KEK).
 * This store holds the derived KEK (CryptoKey) that is used to encrypt/decrypt
 * project DEKs and other sensitive data.
 * 
 * Security considerations:
 * - KEK is stored ONLY in memory (never persisted to disk)
 * - KEK is automatically cleared when the browser tab is closed
 * - KEK should be validated before use by attempting to decrypt the private key
 */
export const kekStore = writable<CryptoKey | null>(null);