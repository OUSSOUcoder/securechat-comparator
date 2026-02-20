import { DHRatchet } from './DHRatchet';
import { SealedSenderEncryptor } from './SealedSender';

/**
 * Classe unifiée combinant Double Ratchet + Sealed Sender
 */
export class SecureMessaging {
  constructor(userId, identityKey, rsaKeyPair) {
    this.userId = userId;
    this.identityKey = identityKey; // Clé ECDH
    this.rsaKeyPair = rsaKeyPair; // Pour Sealed Sender
    this.ratchets = new Map(); // contactId -> DHRatchet
    this.certificate = null;
  }

  /**
   * Enregistre le certificat délivré par le serveur
   */
  setCertificate(certificate) {
    this.certificate = certificate;
  }

  /**
   * Initialise une session Double Ratchet avec un contact
   */
  async initializeSession(contactId, sharedSecret, dhPair, remoteDHPublic, isInitiator) {
    const ratchet = new DHRatchet(sharedSecret, isInitiator);
    await ratchet.initialize(dhPair, remoteDHPublic);
    this.ratchets.set(contactId, ratchet);
    return ratchet;
  }

  /**
   * Envoie un message NORMAL (serveur voit l'expéditeur)
   */
  async sendNormalMessage(recipientId, plaintext) {
    const ratchet = this.ratchets.get(recipientId);
    if (!ratchet) {
      throw new Error("No session with this recipient");
    }

    // Chiffrer avec Double Ratchet
    const doubleRatchetMessage = await ratchet.encrypt(plaintext);

    // Retourner message avec identité visible
    return {
      type: 'normal',
      from: this.userId,
      to: recipientId,
      message: doubleRatchetMessage
    };
  }

  /**
   * Envoie un message SEALED (serveur ne voit PAS l'expéditeur)
   */
  async sendSealedMessage(recipientId, recipientPublicKey, plaintext) {
    if (!this.certificate) {
      throw new Error("No certificate available");
    }

    const ratchet = this.ratchets.get(recipientId);
    if (!ratchet) {
      throw new Error("No session with this recipient");
    }

    // 1. Chiffrer avec Double Ratchet
    const doubleRatchetMessage = await ratchet.encrypt(plaintext);

    // 2. Sceller avec Sealed Sender
    const sealedMessage = await SealedSenderEncryptor.seal(
      doubleRatchetMessage,
      this.certificate,
      this.identityKey.publicKey,
      recipientPublicKey
    );

    // 3. Retourner message scellé (pas d'identifiant from)
    return {
      type: 'sealed',
      to: recipientId,
      message: sealedMessage
    };
  }

  /**
   * Reçoit un message NORMAL
   */
  async receiveNormalMessage(normalMessage) {
    const ratchet = this.ratchets.get(normalMessage.from);
    if (!ratchet) {
      throw new Error("No session with this sender");
    }

    const plaintext = await ratchet.decrypt(normalMessage.message);

    return {
      from: normalMessage.from,
      message: plaintext
    };
  }

  /**
   * Reçoit un message SEALED
   */
  async receiveSealedMessage(sealedMessage, serverPublicKey) {
    // 1. Desceller
    const unsealed = await SealedSenderEncryptor.unseal(
      sealedMessage.message,
      this.rsaKeyPair.privateKey,
      serverPublicKey
    );

    // 2. Déchiffrer avec Double Ratchet
    const ratchet = this.ratchets.get(unsealed.senderId);
    if (!ratchet) {
      throw new Error("No session with this sender");
    }

    const plaintext = await ratchet.decrypt(unsealed.message);

    return {
      from: unsealed.senderId,
      message: plaintext
    };
  }
}