import { browser } from '$app/environment';

export const STORAGE_KEYS = {
  KEK_PRIVATE_KEY: 'zapdo_kek_private_key',
  DEVICE_AUTH_PRIVATE_KEY: 'zapdo_device_auth_private_key',
  DEVICE_ID: 'zapdo_device_id',
} as const;

export function setStorageItem(key: string, value: unknown): void {
  if (!browser) return;

  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
  } catch (error) {
    console.error(`Failed to set storage item ${key}:`, error);
  }
}

export function getStorageItem<T>(key: string, defaultValue: T = null as T): T {
  if (!browser) return defaultValue;

  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;

    try {
      return JSON.parse(item) as T;
    } catch {
      return item as T;
    }
  } catch (error) {
    console.error(`Failed to get storage item ${key}:`, error);
    return defaultValue;
  }
}

export function removeStorageItem(key: string): void {
  if (!browser) return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove storage item ${key}:`, error);
  }
}

export function clearZapDoStorage(): void {
  if (!browser) return;

  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear ZapDo storage:', error);
  }
}

export function hasStorageItem(key: string): boolean {
  if (!browser) return false;

  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error(`Failed to check storage item ${key}:`, error);
    return false;
  }
}
