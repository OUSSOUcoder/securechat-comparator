/**
 * ECIES - Elliptic Curve Integrated Encryption Scheme
 * 
 * Remplace RSA-OAEP pour le Sealed Sender avec une approche moderne basée sur courbes elliptiques.
 * 
 * Avantages par rapport à RSA:
 * - Clés plus courtes (256 bits EC ≈ 3072 bits RSA)
 * - Opérations plus rapides
 * - Sécurité post-quantique améliorée (bien que toujours vulnérable)
 * - Conforme aux protocoles modernes (Signal, WhatsApp)
 * 
 * Schéma:
 * 1. Générer une paire éphémère ECDH
 * 2. Calculer le secret partagé avec la clé publique du destinataire
 * 3. Dériver clés de chiffrement et d'authentification via HKDF
 * 4. Chiffrer avec AES-GCM
 * 5. Transmettre: clé publique éphémère + message chiffré
 */

import {
  generateECDHKeyPair,
  performECDH,
  exportPublicKey,
  importPublicKey,
  hkdf,
  encryptAESGCM,
  decryptAESGCM
} from './Primitives.js';

/**
 * Chiffre un message avec ECIES
 * 
 * @param {ArrayBuffer} plaintext - Message en clair
 * @param {CryptoKey} recipientPublicKey - Clé publique du destinataire
 * @param {ArrayBuffer} associatedData - Données associées (AAD) optionnelles
 * @returns {Promise<{ephemeralPublicKey: Object, ciphertext: ArrayBuffer, iv: ArrayBuffer}>}
 */
export async function eciesEncrypt(plaintext, recipientPublicKey, associatedData = new ArrayBuffer(0)) {
  // 1. Générer une paire de clés éphémère
  const ephemeralKeyPair = await generateECDHKeyPair();
  
  // 2. Calculer le secret partagé ECDH
  const sharedSecret = await performECDH(
    ephemeralKeyPair.privateKey,
    recipientPublicKey
  );
  
  // 3. Dériver la clé de chiffrement avec HKDF
  // Utilise le secret partagé comme matériel de clé initial
  const encoder = new TextEncoder();
  const salt = new Uint8Array(32); // Salt de zéros
  const info = encoder.encode('ECIES-AES-256-GCM');
  
  const encryptionKeyBytes = await hkdf(sharedSecret, salt, info, 32);
  
  const encryptionKey = await crypto.subtle.importKey(
    'raw',
    encryptionKeyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // 4. Chiffrer avec AES-GCM (fournit authentification intégrée)
  const { ciphertext, iv } = await encryptAESGCM(
    encryptionKey,
    plaintext,
    associatedData
  );
  
  // 5. Exporter la clé publique éphémère pour transmission
  const ephemeralPublicKeyJWK = await exportPublicKey(ephemeralKeyPair.publicKey);
  
  return {
    ephemeralPublicKey: ephemeralPublicKeyJWK,
    ciphertext,
    iv
  };
}

/**
 * Déchiffre un message ECIES
 * 
 * @param {Object} ephemeralPublicKey - Clé publique éphémère (JWK)
 * @param {ArrayBuffer} ciphertext - Message chiffré
 * @param {ArrayBuffer} iv - Vecteur d'initialisation
 * @param {CryptoKey} recipientPrivateKey - Clé privée du destinataire
 * @param {ArrayBuffer} associatedData - Données associées (AAD)
 * @returns {Promise<ArrayBuffer>} Message déchiffré
 */
export async function eciesDecrypt(
  ephemeralPublicKey,
  ciphertext,
  iv,
  recipientPrivateKey,
  associatedData = new ArrayBuffer(0)
) {
  // 1. Importer la clé publique éphémère
  const ephemeralPublicKeyImported = await importPublicKey(ephemeralPublicKey);
  
  // 2. Recalculer le même secret partagé
  const sharedSecret = await performECDH(
    recipientPrivateKey,
    ephemeralPublicKeyImported
  );
  
  // 3. Dériver la même clé de chiffrement
  const encoder = new TextEncoder();
  const salt = new Uint8Array(32);
  const info = encoder.encode('ECIES-AES-256-GCM');
  
  const encryptionKeyBytes = await hkdf(sharedSecret, salt, info, 32);
  
  const encryptionKey = await crypto.subtle.importKey(
    'raw',
    encryptionKeyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  // 4. Déchiffrer et vérifier l'authentification
  const plaintext = await decryptAESGCM(
    encryptionKey,
    ciphertext,
    iv,
    associatedData
  );
  
  return plaintext;
}

/**
 * Classe pour gérer une paire de clés Sealed Sender
 */
export class SealedSenderKeyPair {
  constructor() {
    this.keyPair = null;
  }
  
  /**
   * Génère une nouvelle paire de clés
   */
  async generate() {
    this.keyPair = await generateECDHKeyPair();
    return this;
  }
  
  /**
   * Obtient la clé publique au format JWK
   */
  async getPublicKey() {
    if (!this.keyPair) {
      throw new Error('Paire de clés non générée');
    }
    return await exportPublicKey(this.keyPair.publicKey);
  }
  
  /**
   * Obtient la clé privée (pour le déchiffrement)
   */
  getPrivateKey() {
    if (!this.keyPair) {
      throw new Error('Paire de clés non générée');
    }
    return this.keyPair.privateKey;
  }
  
  /**
   * Chiffre un message pour ce destinataire
   */
  async encrypt(plaintext, associatedData) {
    if (!this.keyPair) {
      throw new Error('Paire de clés non générée');
    }
    return await eciesEncrypt(plaintext, this.keyPair.publicKey, associatedData);
  }
  
  /**
   * Déchiffre un message reçu
   */
  async decrypt(ephemeralPublicKey, ciphertext, iv, associatedData) {
    if (!this.keyPair) {
      throw new Error('Paire de clés non générée');
    }
    return await eciesDecrypt(
      ephemeralPublicKey,
      ciphertext,
      iv,
      this.keyPair.privateKey,
      associatedData
    );
  }
  
  /**
   * Exporte la paire de clés pour sauvegarde
   */
  async export() {
    if (!this.keyPair) {
      throw new Error('Paire de clés non générée');
    }
    
    return {
      publicKey: await exportPublicKey(this.keyPair.publicKey),
      privateKey: await crypto.subtle.exportKey('jwk', this.keyPair.privateKey)
    };
  }
  
  /**
   * Importe une paire de clés sauvegardée
   */
  async import(exportedKeys) {
    const publicKey = await importPublicKey(exportedKeys.publicKey);
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      exportedKeys.privateKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );
    
    this.keyPair = { publicKey, privateKey };
    return this;
  }
}

/**
 * Enveloppe Sealed Sender complète
 * 
 * Structure du message:
 * - Métadonnées chiffrées (expéditeur, timestamp)
 * - Message chiffré avec Double Ratchet
 */
export class SealedSenderEnvelope {
  /**
   * Crée une enveloppe sealed sender
   * 
   * @param {string} senderIdentifier - Identifiant de l'expéditeur
   * @param {ArrayBuffer} encryptedMessage - Message déjà chiffré avec Double Ratchet
   * @param {CryptoKey} recipientSealedSenderPublicKey - Clé publique sealed sender du destinataire
   * @returns {Promise<Object>} Enveloppe complète
   */
  static async create(senderIdentifier, encryptedMessage, recipientSealedSenderPublicKey) {
    const encoder = new TextEncoder();
    
    // Métadonnées à protéger
    const metadata = {
      sender: senderIdentifier,
      timestamp: Date.now(),
      version: 1
    };
    
    const metadataJSON = JSON.stringify(metadata);
    const metadataBytes = encoder.encode(metadataJSON);
    
    // Chiffrer les métadonnées avec ECIES
    const encryptedMetadata = await eciesEncrypt(
      metadataBytes,
      recipientSealedSenderPublicKey
    );
    
    return {
      version: 1,
      encryptedMetadata,
      encryptedMessage: {
        ciphertext: encryptedMessage.ciphertext,
        iv: encryptedMessage.iv,
        messageNumber: encryptedMessage.messageNumber,
        dhPublicKey: encryptedMessage.dhPublicKey
      }
    };
  }
  
  /**
   * Ouvre une enveloppe sealed sender
   * 
   * @param {Object} envelope - Enveloppe reçue
   * @param {CryptoKey} recipientSealedSenderPrivateKey - Clé privée sealed sender
   * @returns {Promise<{sender: string, timestamp: number, encryptedMessage: Object}>}
   */
  static async open(envelope, recipientSealedSenderPrivateKey) {
    // Déchiffrer les métadonnées
    const metadataBytes = await eciesDecrypt(
      envelope.encryptedMetadata.ephemeralPublicKey,
      envelope.encryptedMetadata.ciphertext,
      envelope.encryptedMetadata.iv,
      recipientSealedSenderPrivateKey
    );
    
    const decoder = new TextDecoder();
    const metadataJSON = decoder.decode(metadataBytes);
    const metadata = JSON.parse(metadataJSON);
    
    return {
      sender: metadata.sender,
      timestamp: metadata.timestamp,
      encryptedMessage: envelope.encryptedMessage
    };
  }
}