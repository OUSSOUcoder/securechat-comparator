/**
 * Primitives Cryptographiques de Production
 * 
 * Ce module fournit des fonctions cryptographiques robustes conformes
 * aux standards de l'industrie (Signal Protocol, NIST).
 */

/**
 * HKDF (HMAC-based Key Derivation Function) - RFC 5869
 * 
 * Dérive des clés cryptographiques à partir d'un matériel initial.
 * Utilisé pour créer plusieurs clés indépendantes à partir d'un secret partagé.
 * 
 * @param {ArrayBuffer} inputKeyMaterial - Matériel de clé initial (IKM)
 * @param {ArrayBuffer} salt - Sel cryptographique (optionnel mais recommandé)
 * @param {ArrayBuffer} info - Information contextuelle pour lier la clé à son usage
 * @param {number} length - Longueur de la clé de sortie en octets
 * @returns {Promise<ArrayBuffer>} Clé dérivée
 */
export async function hkdf(inputKeyMaterial, salt, info, length) {
  // 1. Extract: HMAC-Hash(salt, IKM) -> PRK (Pseudo-Random Key)
  const extractKey = await crypto.subtle.importKey(
    'raw',
    salt,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const prk = await crypto.subtle.sign('HMAC', extractKey, inputKeyMaterial);

  // 2. Expand: Génère la clé de sortie de la longueur désirée
  const prkKey = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const hashLength = 32; // SHA-256 = 32 bytes
  const iterations = Math.ceil(length / hashLength);
  
  if (iterations > 255) {
    throw new Error('HKDF: longueur de sortie trop grande');
  }

  let t = new Uint8Array(0);
  const result = new Uint8Array(length);
  let resultOffset = 0;

  for (let i = 1; i <= iterations; i++) {
    // T(i) = HMAC-Hash(PRK, T(i-1) | info | i)
    const input = new Uint8Array(t.length + info.byteLength + 1);
    input.set(new Uint8Array(t), 0);
    input.set(new Uint8Array(info), t.length);
    input[t.length + info.byteLength] = i;

    t = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, input));
    
    const bytesToCopy = Math.min(hashLength, length - resultOffset);
    result.set(t.subarray(0, bytesToCopy), resultOffset);
    resultOffset += bytesToCopy;
  }

  return result.buffer;
}

/**
 * Dérive une clé AES-GCM à partir d'un matériel de clé
 * 
 * @param {ArrayBuffer} keyMaterial - Matériel de clé source
 * @param {string} context - Contexte de dérivation (ex: "MessageKey-42")
 * @returns {Promise<CryptoKey>} Clé AES-GCM de 256 bits
 */
export async function deriveAESKey(keyMaterial, context) {
  const encoder = new TextEncoder();
  const salt = new Uint8Array(32); // Salt de zéros pour la dérivation KDF
  const info = encoder.encode(context);
  
  const derivedBytes = await hkdf(keyMaterial, salt, info, 32);
  
  return await crypto.subtle.importKey(
    'raw',
    derivedBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Dérive une clé HMAC à partir d'un matériel de clé
 * 
 * @param {ArrayBuffer} keyMaterial - Matériel de clé source
 * @param {string} context - Contexte de dérivation
 * @returns {Promise<CryptoKey>} Clé HMAC-SHA256
 */
export async function deriveHMACKey(keyMaterial, context) {
  const encoder = new TextEncoder();
  const salt = new Uint8Array(32);
  const info = encoder.encode(context);
  
  const derivedBytes = await hkdf(keyMaterial, salt, info, 32);
  
  return await crypto.subtle.importKey(
    'raw',
    derivedBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Calcule le HMAC d'un message
 * 
 * @param {CryptoKey} key - Clé HMAC
 * @param {ArrayBuffer} data - Données à authentifier
 * @returns {Promise<ArrayBuffer>} MAC (32 bytes)
 */
export async function computeHMAC(key, data) {
  return await crypto.subtle.sign('HMAC', key, data);
}

/**
 * Vérifie le HMAC d'un message
 * 
 * @param {CryptoKey} key - Clé HMAC
 * @param {ArrayBuffer} data - Données à vérifier
 * @param {ArrayBuffer} mac - MAC à vérifier
 * @returns {Promise<boolean>} true si valide
 */
export async function verifyHMAC(key, data, mac) {
  return await crypto.subtle.verify('HMAC', key, mac, data);
}

/**
 * Chiffre des données avec AES-GCM (AEAD - Authenticated Encryption)
 * 
 * AES-GCM fournit à la fois confidentialité ET authenticité.
 * Pas besoin de HMAC séparé contrairement à AES-CBC.
 * 
 * @param {CryptoKey} key - Clé AES-GCM
 * @param {ArrayBuffer} plaintext - Données en clair
 * @param {ArrayBuffer} associatedData - Données authentifiées mais non chiffrées (AAD)
 * @returns {Promise<{ciphertext: ArrayBuffer, iv: ArrayBuffer}>}
 */
export async function encryptAESGCM(key, plaintext, associatedData = new ArrayBuffer(0)) {
  // IV de 96 bits (recommandé pour AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      additionalData: associatedData,
      tagLength: 128 // Tag d'authentification de 128 bits
    },
    key,
    plaintext
  );

  return { ciphertext, iv: iv.buffer };
}

/**
 * Déchiffre des données avec AES-GCM
 * 
 * @param {CryptoKey} key - Clé AES-GCM
 * @param {ArrayBuffer} ciphertext - Données chiffrées (inclut le tag)
 * @param {ArrayBuffer} iv - Vecteur d'initialisation
 * @param {ArrayBuffer} associatedData - Données associées (AAD)
 * @returns {Promise<ArrayBuffer>} Données déchiffrées
 * @throws {Error} Si l'authentification échoue
 */
export async function decryptAESGCM(key, ciphertext, iv, associatedData = new ArrayBuffer(0)) {
  return await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      additionalData: associatedData,
      tagLength: 128
    },
    key,
    ciphertext
  );
}

/**
 * Génère une paire de clés ECDH sur P-256
 * 
 * @returns {Promise<CryptoKeyPair>} Paire de clés publique/privée
 */
export async function generateECDHKeyPair() {
  return await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Effectue un échange Diffie-Hellman sur courbe elliptique
 * 
 * @param {CryptoKey} privateKey - Clé privée locale
 * @param {CryptoKey} publicKey - Clé publique distante
 * @returns {Promise<ArrayBuffer>} Secret partagé (32 bytes)
 */
export async function performECDH(privateKey, publicKey) {
  return await crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256 // 256 bits = 32 bytes
  );
}

/**
 * Exporte une clé publique au format JWK
 * 
 * @param {CryptoKey} publicKey - Clé publique à exporter
 * @returns {Promise<Object>} Clé au format JWK
 */
export async function exportPublicKey(publicKey) {
  return await crypto.subtle.exportKey('jwk', publicKey);
}

/**
 * Importe une clé publique depuis le format JWK
 * 
 * @param {Object} jwk - Clé au format JWK
 * @returns {Promise<CryptoKey>} Clé publique importée
 */
export async function importPublicKey(jwk) {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

/**
 * Génère des octets aléatoires cryptographiquement sécurisés
 * 
 * @param {number} length - Nombre d'octets à générer
 * @returns {Uint8Array} Octets aléatoires
 */
export function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Concatène plusieurs ArrayBuffers
 * 
 * @param {...ArrayBuffer} buffers - Buffers à concaténer
 * @returns {ArrayBuffer} Buffer concaténé
 */
export function concatBuffers(...buffers) {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  
  return result.buffer;
}

/**
 * Compare deux ArrayBuffers en temps constant
 * Protection contre les timing attacks
 * 
 * @param {ArrayBuffer} a - Premier buffer
 * @param {ArrayBuffer} b - Second buffer
 * @returns {boolean} true si identiques
 */
export function constantTimeEqual(a, b) {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  
  const aBytes = new Uint8Array(a);
  const bBytes = new Uint8Array(b);
  let result = 0;
  
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  
  return result === 0;
}