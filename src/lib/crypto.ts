export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateAesKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportAesKey(key: CryptoKey): Promise<string> {
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exportedKey);
}

export async function importAesKey(keyData: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyData);
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function deriveKeyFromPassword(
  password: string,
  salt: string,
  iterations: number = 100000
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptWithAesGcm(
  plaintext: string,
  key: CryptoKey
): Promise<{ encryptedData: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    data
  );
  
  return {
    encryptedData: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer)
  };
}

export async function decryptWithAesGcm(
  encryptedData: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const encryptedDataBuffer = base64ToArrayBuffer(encryptedData);
  const ivBuffer = base64ToArrayBuffer(iv);
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer
    },
    key,
    encryptedDataBuffer
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

export async function encryptWithKek(
  data: ArrayBuffer,
  kek: CryptoKey
) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    kek,
    data
  );

  return {
    encryptedData: arrayBufferToBase64(encryptedData),
    iv: arrayBufferToBase64(iv.buffer)
  };
}

export async function decryptWithKek(
  encryptedDataBase64: string,
  ivBase64: string,
  kek: CryptoKey
) {
  const encryptedDataBuffer = base64ToArrayBuffer(encryptedDataBase64);
  const ivBuffer = base64ToArrayBuffer(ivBase64);
  
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer
    },
    kek,
    encryptedDataBuffer
  );

  return decryptedData;
}

export async function generateRsaKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey
  };
}

export async function exportKeyToJwk(key: CryptoKey) {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return jwk;
}

export async function importJwkToKey(jwk: JsonWebKey, keyType: 'public' | 'private') {
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    keyType === 'public' ? ['encrypt'] : ['decrypt']
  );
  
  return key;
}

export async function encryptWithRsaOaep(plaintext: string, publicKey: CryptoKey) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
    publicKey,
    data
  );
  
  return arrayBufferToBase64(encrypted);
}

export async function decryptWithRsaOaep(encryptedData: string, privateKey: CryptoKey) {
  const encryptedDataBuffer = base64ToArrayBuffer(encryptedData);
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP'
    },
    privateKey,
    encryptedDataBuffer
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}