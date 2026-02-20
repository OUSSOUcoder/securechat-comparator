import { SenderCertificate } from './SenderCertificate';

/**
 * Sealed Sender - Masque l'identité de l'expéditeur
 * Utilise un chiffrement hybride RSA + AES
 */
export class SealedSenderEncryptor {
  /**
   * Scelle un message avec chiffrement hybride
   */
  static async seal(message, senderCertificate, senderIdentityKey, recipientPublicKey) {
  console.log("🔍 DEBUG seal() - Début");
  console.log("  message:", message);
  console.log("  senderCertificate:", senderCertificate);
  console.log("  senderIdentityKey:", senderIdentityKey);
  console.log("  senderIdentityKey type:", typeof senderIdentityKey);
  console.log("  recipientPublicKey:", recipientPublicKey);

  try {
    // 1. Créer l'enveloppe avec toutes les métadonnées
    console.log("📝 Étape 1: Création enveloppe...");
    
    console.log("  Export de senderIdentityKey...");
    const exportedKey = await crypto.subtle.exportKey("jwk", senderIdentityKey);
    console.log("  ✅ Export réussi");
    
    const envelope = {
      version: 1,
      certificate: senderCertificate,
      senderIdentity: exportedKey,
      message: message
    };

    console.log("📝 Étape 2: JSON.stringify...");
    const envelopeJson = JSON.stringify(envelope);
    console.log("  Taille JSON:", envelopeJson.length, "bytes");
    
    const envelopeBytes = new TextEncoder().encode(envelopeJson);

    // 2. Générer une clé AES-256 aléatoire
    console.log("🔑 Étape 3: Génération clé AES...");
    const aesKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    console.log("  ✅ Clé AES générée");

    // 3. Chiffrer l'enveloppe avec AES-GCM
    console.log("🔒 Étape 4: Chiffrement AES...");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedEnvelope = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      envelopeBytes
    );
    console.log("  ✅ Enveloppe chiffrée");

    // 4. Exporter la clé AES en raw bytes
    console.log("📤 Étape 5: Export clé AES...");
    const aesKeyRaw = await crypto.subtle.exportKey("raw", aesKey);
    console.log("  ✅ Clé AES exportée");

    // 5. Chiffrer la clé AES avec RSA-OAEP
    console.log("🔐 Étape 6: Import clé RSA destinataire...");
    const recipientKey = await crypto.subtle.importKey(
      "jwk",
      recipientPublicKey,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
    console.log("  ✅ Clé RSA importée");

    console.log("🔒 Étape 7: Chiffrement RSA de la clé AES...");
    const encryptedAESKey = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipientKey,
      aesKeyRaw
    );
    console.log("  ✅ Clé AES chiffrée avec RSA");

    // 6. Retourner le message scellé
    console.log("✅ seal() terminé avec succès");
    return {
      version: 1,
      recipientId: extractRecipientId(recipientPublicKey),
      encryptedKey: Array.from(new Uint8Array(encryptedAESKey)),
      iv: Array.from(iv),
      encryptedEnvelope: Array.from(new Uint8Array(encryptedEnvelope))
    };
    
  } catch (error) {
    console.error("❌❌❌ ERREUR dans seal():", error);
    console.error("  Message:", error.message);
    console.error("  Stack:", error.stack);
    throw error;
  }
}

  /**
   * Descelle un message
   */
  static async unseal(sealedMessage, recipientPrivateKey, serverPublicKey) {
    // 1. Déchiffrer la clé AES avec RSA-OAEP
    const aesKeyRaw = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      recipientPrivateKey,
      new Uint8Array(sealedMessage.encryptedKey)
    );

    // 2. Importer la clé AES
    const aesKey = await crypto.subtle.importKey(
      "raw",
      aesKeyRaw,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    // 3. Déchiffrer l'enveloppe avec AES-GCM
    const envelopeBytes = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(sealedMessage.iv) },
      aesKey,
      new Uint8Array(sealedMessage.encryptedEnvelope)
    );

    const envelopeJson = new TextDecoder().decode(envelopeBytes);
    const envelope = JSON.parse(envelopeJson);

    // 4. Vérifier le certificat de l'expéditeur
    const serverPubKey = await crypto.subtle.importKey(
      "jwk",
      serverPublicKey,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"]
    );

    await SenderCertificate.verify(envelope.certificate, serverPubKey);

    // 5. Retourner le message et l'identité révélée
    return {
      senderId: envelope.certificate.userId,
      senderIdentity: envelope.senderIdentity,
      message: envelope.message
    };
  }
}

/**
 * Extrait un ID anonyme du destinataire
 */
function extractRecipientId(publicKey) {
  const keyString = JSON.stringify(publicKey);
  let hash = 0;
  for (let i = 0; i < keyString.length; i++) {
    hash = ((hash << 5) - hash) + keyString.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}