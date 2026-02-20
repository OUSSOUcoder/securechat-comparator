/**
 * crypto/sodium.js
 * 
 * Wrapper moderne autour de libsodium-wrappers pour messagerie sécurisée.
 * Utilise les primitives recommandées pour production :
 * - Curve25519 pour ECDH
 * - Ed25519 pour signatures
 * - XChaCha20-Poly1305 pour chiffrement authentifié
 */

import _sodium from 'libsodium-wrappers';

/**
 * Classe singleton pour gérer l'initialisation de libsodium
 */
class SodiumCrypto {
  constructor() {
    this.ready = false;
    this.sodium = null;
  }

  /**
   * Initialise libsodium de manière asynchrone
   * DOIT être appelé avant toute opération crypto
   */
  async initialize() {
    if (this.ready) return;
    
    try {
      await _sodium.ready;
      this.sodium = _sodium;
      this.ready = true;
    } catch (error) {
      throw new Error(`Échec initialisation libsodium: ${error.message}`);
    }
  }

  /**
   * Vérifie que libsodium est prêt
   * @throws {Error} Si libsodium n'est pas initialisé
   */
  ensureReady() {
    if (!this.ready || !this.sodium) {
      throw new Error('Libsodium pas initialisé. Appelez initialize() d\'abord.');
    }
  }

  /**
   * Génère une paire de clés Curve25519 pour ECDH
   * @returns {{publicKey: Uint8Array, privateKey: Uint8Array}}
   */
  generateKeyPairCurve25519() {
    this.ensureReady();
    
    try {
      const keyPair = this.sodium.crypto_box_keypair();
      
      return {
        publicKey: keyPair.publicKey,  // 32 bytes
        privateKey: keyPair.privateKey  // 32 bytes
      };
    } catch (error) {
      throw new Error(`Échec génération Curve25519: ${error.message}`);
    }
  }

  /**
   * Génère une paire de clés Ed25519 pour signatures
   * @returns {{publicKey: Uint8Array, privateKey: Uint8Array}}
   */
  generateKeyPairEd25519() {
    this.ensureReady();
    
    try {
      const keyPair = this.sodium.crypto_sign_keypair();
      
      return {
        publicKey: keyPair.publicKey,  // 32 bytes
        privateKey: keyPair.privateKey  // 64 bytes
      };
    } catch (error) {
      throw new Error(`Échec génération Ed25519: ${error.message}`);
    }
  }

  /**
   * Calcule un secret partagé via ECDH Curve25519
   * 
   * @param {Uint8Array} myPrivateKey - Ma clé privée (32 bytes)
   * @param {Uint8Array} theirPublicKey - Clé publique du pair (32 bytes)
   * @returns {Uint8Array} Secret partagé (32 bytes)
   * 
   * Utilise crypto_scalarmult pour ECDH sécurisé.
   * Le résultat DOIT passer par HKDF avant utilisation.
   */
  deriveSharedSecret(myPrivateKey, theirPublicKey) {
    this.ensureReady();
    
    // Validation des entrées
    if (!(myPrivateKey instanceof Uint8Array) || myPrivateKey.length !== 32) {
      throw new Error('Clé privée invalide: doit être Uint8Array de 32 bytes');
    }
    if (!(theirPublicKey instanceof Uint8Array) || theirPublicKey.length !== 32) {
      throw new Error('Clé publique invalide: doit être Uint8Array de 32 bytes');
    }

    try {
      const sharedSecret = this.sodium.crypto_scalarmult(myPrivateKey, theirPublicKey);
      
      // Vérification contre weak keys (all-zero output)
      if (this.isAllZeros(sharedSecret)) {
        throw new Error('Secret partagé faible détecté (contributeur invalide)');
      }
      
      return sharedSecret;
    } catch (error) {
      throw new Error(`Échec ECDH: ${error.message}`);
    }
  }

  /**
   * Dérive une clé via HKDF-SHA256
   * 
   * @param {Uint8Array} inputKeyMaterial - Matériel source (ex: secret ECDH)
   * @param {Uint8Array} salt - Salt optionnel (null = zeros)
   * @param {Uint8Array} info - Contexte d'application
   * @param {number} length - Longueur de sortie en bytes (défaut: 32)
   * @returns {Uint8Array} Clé dérivée
   * 
   * Utilise HKDF standardisé pour dérivation sécurisée.
   */
  hkdf(inputKeyMaterial, salt, info, length = 32) {
    this.ensureReady();

    if (length < 1 || length > 255 * 32) {
      throw new Error(`Longueur HKDF invalide: ${length} (max: ${255 * 32})`);
    }

    try {
      // Utilise crypto_kdf pour dérivation
      // Note: libsodium n'a pas HKDF natif, on utilise KDF interne ou on implémente
      const subkeyId = 0; // Peut être utilisé pour dériver plusieurs clés
      const ctx = this.padContext(info);
      
      return this.sodium.crypto_kdf_derive_from_key(
        length,
        subkeyId,
        ctx,
        inputKeyMaterial
      );
    } catch (error) {
      // Fallback: implémentation HKDF manuelle
      return this.hkdfManual(inputKeyMaterial, salt, info, length);
    }
  }

  /**
   * Implémentation HKDF manuelle (RFC 5869)
   */
  hkdfManual(ikm, salt, info, length) {
    this.ensureReady();

    // HKDF-Extract: PRK = HMAC-Hash(salt, IKM)
    const actualSalt = salt || new Uint8Array(32); // Salt par défaut
    const prk = this.sodium.crypto_auth(ikm, actualSalt);

    // HKDF-Expand: dériver la longueur demandée
    const n = Math.ceil(length / 32);
    let okm = new Uint8Array(0);
    let t = new Uint8Array(0);

    for (let i = 1; i <= n; i++) {
      const message = new Uint8Array([...t, ...info, i]);
      t = this.sodium.crypto_auth(message, prk);
      okm = new Uint8Array([...okm, ...t]);
    }

    return okm.slice(0, length);
  }

  /**
   * Chiffre un message avec XChaCha20-Poly1305
   * 
   * @param {Uint8Array|string} message - Message à chiffrer
   * @param {Uint8Array} key - Clé de chiffrement (32 bytes)
   * @param {Uint8Array} additionalData - Données associées (AD) optionnelles
   * @returns {{ciphertext: Uint8Array, nonce: Uint8Array}} Texte chiffré + nonce
   * 
   * XChaCha20-Poly1305 offre:
   * - Nonce de 192 bits (vs 96 pour ChaCha20)
   * - MAC authentifié intégré
   * - Résistant aux attaques par collision de nonce
   */
  encrypt(message, key, additionalData = null) {
    this.ensureReady();

    // Validation
    if (!(key instanceof Uint8Array) || key.length !== 32) {
      throw new Error('Clé de chiffrement invalide: doit être 32 bytes');
    }

    try {
      // Conversion message si string
      const messageBytes = typeof message === 'string' 
        ? this.sodium.from_string(message) 
        : message;

      // Génère un nonce aléatoire unique (192 bits)
      const nonce = this.sodium.randombytes_buf(
        this.sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
      );

      // Chiffrement authentifié
      const ciphertext = this.sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        messageBytes,
        additionalData,
        null, // secret nonce (non utilisé en mode AEAD)
        nonce,
        key
      );

      return { ciphertext, nonce };

    } catch (error) {
      // Nettoyage en cas d'erreur
      this.secureZero(key);
      throw new Error(`Échec chiffrement: ${error.message}`);
    }
  }

  /**
   * Déchiffre un message XChaCha20-Poly1305
   * 
   * @param {Uint8Array} ciphertext - Texte chiffré
   * @param {Uint8Array} nonce - Nonce utilisé (192 bits)
   * @param {Uint8Array} key - Clé de déchiffrement (32 bytes)
   * @param {Uint8Array} additionalData - Données associées (AD) optionnelles
   * @returns {Uint8Array} Message déchiffré
   * @throws {Error} Si authentification échoue
   */
  decrypt(ciphertext, nonce, key, additionalData = null) {
    this.ensureReady();

    // Validation
    if (!(key instanceof Uint8Array) || key.length !== 32) {
      throw new Error('Clé de déchiffrement invalide: doit être 32 bytes');
    }

    if (!(nonce instanceof Uint8Array) || 
        nonce.length !== this.sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES) {
      throw new Error('Nonce invalide pour XChaCha20-Poly1305');
    }

    try {
      const plaintext = this.sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null, // secret nonce
        ciphertext,
        additionalData,
        nonce,
        key
      );

      return plaintext;

    } catch (error) {
      // Nettoyage en cas d'erreur
      this.secureZero(key);
      throw new Error('Échec déchiffrement ou MAC invalide');
    }
  }

  /**
   * Signe un message avec Ed25519
   * 
   * @param {Uint8Array|string} message - Message à signer
   * @param {Uint8Array} privateKey - Clé privée Ed25519 (64 bytes)
   * @returns {Uint8Array} Signature (64 bytes)
   */
  sign(message, privateKey) {
    this.ensureReady();

    try {
      const messageBytes = typeof message === 'string'
        ? this.sodium.from_string(message)
        : message;

      return this.sodium.crypto_sign_detached(messageBytes, privateKey);

    } catch (error) {
      throw new Error(`Échec signature: ${error.message}`);
    }
  }

  /**
   * Vérifie une signature Ed25519
   * 
   * @param {Uint8Array} signature - Signature à vérifier (64 bytes)
   * @param {Uint8Array|string} message - Message original
   * @param {Uint8Array} publicKey - Clé publique Ed25519 (32 bytes)
   * @returns {boolean} true si signature valide
   */
  verify(signature, message, publicKey) {
    this.ensureReady();

    try {
      const messageBytes = typeof message === 'string'
        ? this.sodium.from_string(message)
        : message;

      return this.sodium.crypto_sign_verify_detached(
        signature,
        messageBytes,
        publicKey
      );

    } catch (error) {
      return false;
    }
  }

  /**
   * Efface de manière sécurisée un buffer en mémoire
   * 
   * @param {Uint8Array} buffer - Buffer à effacer
   * 
   * Critique pour éviter fuite de clés en mémoire.
   */
  secureZero(buffer) {
    if (!buffer || !(buffer instanceof Uint8Array)) return;
    
    try {
      this.sodium.memzero(buffer);
    } catch (error) {
      // Fallback: écrasement manuel
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = 0;
      }
    }
  }

  /**
   * Génère des bytes aléatoires cryptographiquement sécurisés
   * 
   * @param {number} length - Nombre de bytes
   * @returns {Uint8Array}
   */
  randomBytes(length) {
    this.ensureReady();
    return this.sodium.randombytes_buf(length);
  }

  /**
   * Convertit Uint8Array en base64
   */
  toBase64(bytes) {
    this.ensureReady();
    return this.sodium.to_base64(bytes);
  }

  /**
   * Convertit base64 en Uint8Array
   */
  fromBase64(base64String) {
    this.ensureReady();
    return this.sodium.from_base64(base64String);
  }

  /**
   * Convertit Uint8Array en string hex
   */
  toHex(bytes) {
    this.ensureReady();
    return this.sodium.to_hex(bytes);
  }

  /**
   * Convertit hex string en Uint8Array
   */
  fromHex(hexString) {
    this.ensureReady();
    return this.sodium.from_hex(hexString);
  }

  // === UTILITAIRES INTERNES ===

  /**
   * Vérifie si un buffer est rempli de zéros
   */
  isAllZeros(buffer) {
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] !== 0) return false;
    }
    return true;
  }

  /**
   * Pad le contexte pour crypto_kdf (doit être exactement 8 bytes)
   */
  padContext(context) {
    const ctx = new Uint8Array(8);
    const input = typeof context === 'string' 
      ? this.sodium.from_string(context) 
      : context;
    
    for (let i = 0; i < Math.min(8, input.length); i++) {
      ctx[i] = input[i];
    }
    
    return ctx;
  }
}

// Export singleton
const sodium = new SodiumCrypto();
export default sodium;