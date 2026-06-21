import CryptoJS from 'crypto-js';

// WARNING: In a production environment, this key should be managed securely 
// (e.g., via a secure key management system, not hardcoded in the frontend).
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-secret-key-change-me';

export const encryptData = (data: string) => {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
};

export const decryptData = (ciphertext: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error("Decryption failed", e);
    return null;
  }
};
