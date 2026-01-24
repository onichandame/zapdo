import { decryptWithAesGcm } from '$lib/crypto';

export async function decryptDataWithDek(
  encryptedData: { encryptedData: string; iv: string } | null,
  dek: CryptoKey
): Promise<string> {
  if (!encryptedData) {
    return '';
  }

  try {
    const decrypted = await decryptWithAesGcm(
      encryptedData.encryptedData,
      encryptedData.iv,
      dek
    );
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt project field:', error);
    throw new Error('Decryption failed');
  }
}
