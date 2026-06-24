/**
 * Utility for Decrypted Memory Cache feature.
 * Uses a FIXED_SALT stored in sessionStorage to avoid repeating PBKDF2 for every row.
 */

const getFixedSalt = () => {
  if (typeof window === 'undefined') return 'default-salt';
  let salt = sessionStorage.getItem('TAWA_FIXED_SALT');
  if (!salt) {
    salt = crypto.randomUUID();
    sessionStorage.setItem('TAWA_FIXED_SALT', salt);
  }
  return salt;
};

let cachedKey: CryptoKey | null = null;
let lastPassword = '';

export async function getCryptoKey(password: string): Promise<CryptoKey> {
  if (cachedKey && password === lastPassword) return cachedKey;
  
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', 
    enc.encode(password), 
    { name: 'PBKDF2' }, 
    false, 
    ['deriveKey']
  );
  
  cachedKey = await crypto.subtle.deriveKey(
    { 
      name: 'PBKDF2', 
      salt: enc.encode(getFixedSalt()), 
      iterations: 100000, 
      hash: 'SHA-256' 
    },
    keyMaterial, 
    { name: 'AES-GCM', length: 256 }, 
    true, 
    ['encrypt', 'decrypt']
  );
  
  lastPassword = password;
  return cachedKey;
}

export async function encryptText(text: string, password?: string): Promise<string> {
  if (!password) return text; // If no password, fallback to plaintext
  
  const key = await getCryptoKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  
  const cipherBytes = new Uint8Array(cipher);
  const merged = new Uint8Array(iv.length + cipherBytes.length);
  merged.set(iv);
  merged.set(cipherBytes, iv.length);
  
  return btoa(String.fromCharCode(...merged));
}

export async function decryptText(base64: string, password?: string): Promise<string> {
  if (!password) return base64; // If no password, assume plaintext
  if (!base64.startsWith('ey') && !base64.includes('=')) return base64; // heuristic for plaintext
  
  try {
    const key = await getCryptoKey(password);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    
    const iv = bytes.slice(0, 12);
    const cipher = bytes.slice(12);
    
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return new TextDecoder().decode(decrypted);
  } catch {
    // If decryption fails, it might just be plaintext.
    return base64;
  }
}
