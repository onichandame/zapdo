import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { deviceKeyStore } from '../stores/deviceKeyStore';
import { signWithEcdsa } from '../crypto';

async function createDeviceToken(): Promise<string | null> {
  if (!browser) {
    return null;
  }

  try {
    const deviceKey = get(deviceKeyStore)!;

    const timestamp = new Date().toISOString();
    const authToken = btoa(timestamp);
    const encodedAuthToken = new TextEncoder().encode(authToken);
    const signature = await signWithEcdsa(deviceKey.privateKey, encodedAuthToken.buffer);

    return `${deviceKey.deviceId};${authToken};${signature}`;
  } catch (error) {
    console.error('Failed to create device token:', error);
    return null;
  }
}

export async function authorizedFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const fetchInit: RequestInit = {
    ...init,
    headers: {
      ...init?.headers,
    }
  };

  if (browser) {
    const deviceToken = await createDeviceToken();
    if (deviceToken) {
      fetchInit.headers = {
        ...fetchInit.headers,
        Authorization: `Device ${deviceToken}`
      };
    }
  }

  return fetch(input, fetchInit);
}
