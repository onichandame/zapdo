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

export async function exportKeyToBase64(key: CryptoKey) {
  const keyFormat = key.algorithm.name === `AES-GCM` ? `raw` : key.type === `private` ? `pkcs8` : `spki`
  const res = await crypto.subtle.exportKey(keyFormat, key);
  return arrayBufferToBase64(res);
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

export async function encryptWithAesGcm(
  plaintext: string,
  key: CryptoKey
) {
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

  return `${arrayBufferToBase64(encrypted)};${arrayBufferToBase64(iv.buffer)}`
}

export async function decryptWithAesGcm(
  encrypted: string,
  key: CryptoKey
): Promise<string> {
  const [encryptedData, iv] = encrypted.split(`;`)
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

export async function generateEcP256KeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey', 'deriveBits']
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey
  };
}

export async function importEcToKey(ec: string, keyType: 'public' | 'private', algo: `ECDH` | `ECDSA`) {
  const key = await crypto.subtle.importKey(
    keyType === `private` ? `pkcs8` : `spki`,
    base64ToArrayBuffer(ec),
    {
      name: algo,
      namedCurve: 'P-256'
    },
    true,
    keyType === 'public' ? [] : ['deriveKey', 'deriveBits']
  );

  return key;
}

export async function deriveSharedSecret(privateKey: CryptoKey, publicKey: CryptoKey) {
  const sharedBits = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: publicKey
    },
    privateKey,
    256
  );
  const aesKey = await crypto.subtle.importKey(`raw`, sharedBits, { name: `AES-GCM` }, false, ['encrypt', 'decrypt'])
  return aesKey;
}

export async function generateEcdsaP256KeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true,
    ['sign', 'verify']
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey
  };
}

export async function signWithEcdsa(privateKey: CryptoKey, data: ArrayBuffer): Promise<string> {
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' }
    },
    privateKey,
    data
  );

  return arrayBufferToBase64(signature);
}

export async function verifyEcdsaSignature(publicKey: CryptoKey, signature: string, data: ArrayBuffer | string): Promise<boolean> {
  const signatureBuffer = base64ToArrayBuffer(signature);

  const normalizedData = typeof data === `string` ? base64ToArrayBuffer(data) : data

  const isValid = await crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' }
    },
    publicKey,
    signatureBuffer,
    normalizedData
  );

  return isValid;
}
