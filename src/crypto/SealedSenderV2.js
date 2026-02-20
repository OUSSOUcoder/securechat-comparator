/**
 * crypto/SealedSenderV2.js
 * 
 * Implémentation moderne de Sealed Sender sans RSA.
 * 
 * Utilise:
 * - ECDH Curve25519 pour établir un secret partagé éphémère
 * - HKDF pour dériver les clés de chiffrement
 * - XChaCha20-Poly1305 pour chiffrer l'enveloppe
 * 
 * Architecture:
 * 1. Expéditeur génère une paire éphémère ECDH
 * 2. Calcule secret partagé avec clé publique du destinataire
 * 3. Dérive clé de chiffrement via HKDF
 * 4. Chiffre l'enveloppe (certificat + message chiffré)
 * 5. Transmet: [clé_publique_éphémère || enveloppe_chiffrée]
 * 
 * Avantages vs RSA:
 * - Forward secrecy: clé éphémère détruite après usage
 * - Plus rapide (ECDH vs RSA)
 * - Clés plus courtes (32 bytes vs 256+ bytes)
 * - Meilleure résistance quantique (si on passe à post-quantum curves)
 */

import sodium from './sodium.js';

/**
 * Enveloppe scellée contenant l'identité de l'expéditeur
 */
class SealedEnvelope {
  /**
   * @param {Uint8Array} senderCertificate - Certificat signé de l'expéditeur
   * @param {Uint8Array} encryptedMessage - Message chiffré par Double Ratchet
   */
  constructor(senderCertificate, encryptedMessage) {
    this.senderCertificate = senderCertificate;
    this.encryptedMessage = encryptedMessage;
  }

  /**
   * Sérialise l'enveloppe pour transmission
   * Format: [longueur_cert(4) || certificat || message]
   */
  serialize() {
    const certLength = new Uint8Array(4);
    const view = new DataView(certLength.buffer);
    view.setUint32(0, this.senderCertificate.length, false);

    return new Uint8Array([
      ...certLength,
      ...this.senderCertificate,
      ...this.encryptedMessage
    ]);
  }

  /**
   * Désérialise une enveloppe
   */
  static deserialize(bytes) {
    if (bytes.length < 4) {
      throw new Error('Enveloppe trop courte');
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
    const certLength = view.getUint32(0, false);

    if (bytes.length < 4 + certLength) {
      throw new Error('Enveloppe corrompue: certificat incomplet');
    }

    const senderCertificate = bytes.slice(4, 4 + certLength);
    const encryptedMessage = bytes.slice(4 + certLength);

    return new SealedEnvelope(senderCertificate, encryptedMessage);
  }
}

/**
 * Gestionnaire de Sealed Sender moderne
 */
export class SealedSenderV2 {
  /**
   * Scelle un message pour masquer l'expéditeur
   * 
   * @param {Uint8Array} senderCertificate - Certificat de l'expéditeur
   * @param {Uint8Array} encryptedMessage - Message déjà chiffré (Double Ratchet)
   * @param {Uint8Array} recipientPublicKey - Clé publique Curve25519 du destinataire
   * @returns {Uint8Array} Message scellé
   * 
   * Process:
   * 1. Génère paire éphémère ECDH
   * 2. Dérive secret avec clé publique destinataire
   * 3. Dérive clé de chiffrement via HKDF
   * 4. Chiffre enveloppe avec XChaCha20-Poly1305
   * 5. Retourne [ephemeral_public_key || nonce || ciphertext]
   */
  static async seal(senderCertificate, encryptedMessage, recipientPublicKey) {
    try {
      // Validation des entrées
      if (!(recipientPublicKey instanceof Uint8Array) || recipientPublicKey.length !== 32) {
        throw new Error('Clé publique destinataire invalide');
      }

      // 1. Générer paire de clés éphémère
      const ephemeralKeyPair = sodium.generateKeyPairCurve25519();

      // 2. Calculer secret partagé ECDH
      const sharedSecret = sodium.deriveSharedSecret(
        ephemeralKeyPair.privateKey,
        recipientPublicKey
      );

      // 3. Dériver clé de chiffrement avec HKDF
      const info = sodium.sodium.from_string('SealedSender-v2-envelope');
      const salt = new Uint8Array(32); // Salt null OK pour single-use ephemeral key
      
      const encryptionKey = sodium.hkdf(
        sharedSecret,
        salt,
        info,
        32 // 256-bit key
      );

      // 4. Créer et sérialiser l'enveloppe
      const envelope = new SealedEnvelope(senderCertificate, encryptedMessage);
      const envelopeBytes = envelope.serialize();

      // 5. Chiffrer l'enveloppe
      const { ciphertext, nonce } = sodium.encrypt(envelopeBytes, encryptionKey);

      // 6. Nettoyer les secrets
      sodium.secureZero(ephemeralKeyPair.privateKey);
      sodium.secureZero(sharedSecret);
      sodium.secureZero(encryptionKey);

      // 7. Format final: [ephemeral_pk(32) || nonce(24) || ciphertext]
      return new Uint8Array([
        ...ephemeralKeyPair.publicKey,
        ...nonce,
        ...ciphertext
      ]);

    } catch (error) {
      throw new Error(`Échec scellement: ${error.message}`);
    }
  }

  /**
   * Descelle un message pour révéler l'expéditeur
   * 
   * @param {Uint8Array} sealedMessage - Message scellé
   * @param {Uint8Array} recipientPrivateKey - Clé privée Curve25519 du destinataire
   * @returns {{envelope: SealedEnvelope, senderCertificate: Uint8Array, encryptedMessage: Uint8Array}}
   * 
   * Process:
   * 1. Extrait clé publique éphémère
   * 2. Calcule secret partagé avec notre clé privée
   * 3. Dérive clé de déchiffrement via HKDF
   * 4. Déchiffre et vérifie MAC
   * 5. Désérialise l'enveloppe
   */
  static async unseal(sealedMessage, recipientPrivateKey) {
    try {
      // Validation
      if (!(recipientPrivateKey instanceof Uint8Array) || recipientPrivateKey.length !== 32) {
        throw new Error('Clé privée destinataire invalide');
      }

      const EPHEMERAL_KEY_SIZE = 32;
      const NONCE_SIZE = sodium.sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES; // 24 bytes

      if (sealedMessage.length < EPHEMERAL_KEY_SIZE + NONCE_SIZE) {
        throw new Error('Message scellé trop court');
      }

      // 1. Extraire les composants
      const ephemeralPublicKey = sealedMessage.slice(0, EPHEMERAL_KEY_SIZE);
      const nonce = sealedMessage.slice(EPHEMERAL_KEY_SIZE, EPHEMERAL_KEY_SIZE + NONCE_SIZE);
      const ciphertext = sealedMessage.slice(EPHEMERAL_KEY_SIZE + NONCE_SIZE);

      // 2. Calculer secret partagé ECDH
      const sharedSecret = sodium.deriveSharedSecret(
        recipientPrivateKey,
        ephemeralPublicKey
      );

      // 3. Dériver clé de déchiffrement avec HKDF
      const info = sodium.sodium.from_string('SealedSender-v2-envelope');
      const salt = new Uint8Array(32);
      
      const decryptionKey = sodium.hkdf(
        sharedSecret,
        salt,
        info,
        32
      );

      // 4. Déchiffrer l'enveloppe
      let envelopeBytes;
      try {
        envelopeBytes = sodium.decrypt(ciphertext, nonce, decryptionKey);
      } catch (error) {
        throw new Error('Échec déchiffrement: MAC invalide ou clé incorrecte');
      }

      // 5. Nettoyer les secrets
      sodium.secureZero(sharedSecret);
      sodium.secureZero(decryptionKey);

      // 6. Désérialiser l'enveloppe
      const envelope = SealedEnvelope.deserialize(envelopeBytes);

      return {
        envelope,
        senderCertificate: envelope.senderCertificate,
        encryptedMessage: envelope.encryptedMessage
      };

    } catch (error) {
      throw new Error(`Échec descellement: ${error.message}`);
    }
  }

  /**
   * Calcule la taille overhead du scellement
   * 
   * @returns {number} Bytes ajoutés par le scellement
   */
  static getOverheadSize() {
    return 32 + // Clé publique éphémère
           24 + // Nonce XChaCha20-Poly1305
           16;  // Tag d'authentification Poly1305
  }
}

/**
 * Gestionnaire de clés Sealed Sender pour un utilisateur
 */
export class SealedSenderKeyManager {
  constructor(userId) {
    this.userId = userId;
    this.keyPair = null;
  }

  /**
   * Génère ou charge la paire de clés pour Sealed Sender
   */
  async initialize() {
    // En production, on chargerait depuis le stockage sécurisé
    this.keyPair = sodium.generateKeyPairCurve25519();
  }

  /**
   * Exporte la clé publique pour distribution
   */
  exportPublicKey() {
    if (!this.keyPair) {
      throw new Error('KeyManager pas initialisé');
    }
    
    return {
      userId: this.userId,
      publicKey: this.keyPair.publicKey,
      algorithm: 'Curve25519'
    };
  }

  /**
   * Scelle un message sortant
   */
  async sealOutgoing(senderCert, encryptedMsg, recipientPublicKey) {
    return SealedSenderV2.seal(senderCert, encryptedMsg, recipientPublicKey);
  }

  /**
   * Descelle un message entrant
   */
  async unsealIncoming(sealedMessage) {
    if (!this.keyPair) {
      throw new Error('KeyManager pas initialisé');
    }

    return SealedSenderV2.unseal(sealedMessage, this.keyPair.privateKey);
  }

  /**
   * Rotation de clé (recommandé périodiquement)
   */
  async rotateKeys() {
    // Nettoyer ancienne clé
    if (this.keyPair) {
      sodium.secureZero(this.keyPair.privateKey);
    }

    // Générer nouvelle paire
    this.keyPair = sodium.generateKeyPairCurve25519();

    return this.exportPublicKey();
  }

  /**
   * Nettoyage sécurisé
   */
  destroy() {
    if (this.keyPair) {
      sodium.secureZero(this.keyPair.privateKey);
      this.keyPair = null;
    }
  }
}

export { SealedEnvelope };