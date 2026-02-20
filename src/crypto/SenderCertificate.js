/**
 * Gestion des certificats expéditeur pour Sealed Sender
 * Un certificat prouve qu'un utilisateur est légitime sans révéler son identité
 */

export class SenderCertificate {
  constructor(userId, senderKey, serverSigningKey) {
    this.userId = userId;
    this.senderKey = senderKey; // Clé publique de l'expéditeur
    this.serverSigningKey = serverSigningKey;
    this.signature = null;
    this.validUntil = null;
  }

  /**
   * Génère un certificat signé par le serveur
   */
  async generate(validityDays = 7) {
    // Date d'expiration
    this.validUntil = new Date();
    this.validUntil.setDate(this.validUntil.getDate() + validityDays);

    // Données du certificat
    const certData = {
      userId: this.userId,
      senderKey: await crypto.subtle.exportKey("jwk", this.senderKey),
      validUntil: this.validUntil.toISOString()
    };

    const certBytes = new TextEncoder().encode(JSON.stringify(certData));

    // Signature par le serveur
    this.signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      this.serverSigningKey.privateKey,
      certBytes
    );

    return {
      ...certData,
      signature: Array.from(new Uint8Array(this.signature))
    };
  }

  /**
   * Vérifie la validité d'un certificat
   */
  static async verify(certificate, serverPublicKey) {
    // Vérifier l'expiration
    const validUntil = new Date(certificate.validUntil);
    if (validUntil < new Date()) {
      throw new Error("Certificate expired");
    }

    // Reconstituer les données originales
    const certData = {
      userId: certificate.userId,
      senderKey: certificate.senderKey,
      validUntil: certificate.validUntil
    };

    const certBytes = new TextEncoder().encode(JSON.stringify(certData));

    // Vérifier la signature
    const isValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      serverPublicKey,
      new Uint8Array(certificate.signature),
      certBytes
    );

    if (!isValid) {
      throw new Error("Invalid certificate signature");
    }

    return true;
  }
}

/**
 * Autorité de Certification (serveur)
 * Délivre et gère les certificats
 */
export class CertificateAuthority {
  constructor() {
    this.signingKey = null;
    this.certificates = new Map(); // userId -> certificate
  }

  /**
   * Initialise la CA avec une clé de signature
   */
  async initialize() {
    this.signingKey = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );

    return await crypto.subtle.exportKey("jwk", this.signingKey.publicKey);
  }

  /**
   * Délivre un certificat à un utilisateur
   */
  async issueCertificate(userId, userPublicKey) {
    const cert = new SenderCertificate(userId, userPublicKey, this.signingKey);
    const certificateData = await cert.generate();
    
    this.certificates.set(userId, certificateData);
    
    return certificateData;
  }

  /**
   * Récupère le certificat d'un utilisateur
   */
  getCertificate(userId) {
    return this.certificates.get(userId);
  }

  /**
   * Export de la clé publique (pour vérification)
   */
  async getPublicKey() {
    return await crypto.subtle.exportKey("jwk", this.signingKey.publicKey);
  }
}