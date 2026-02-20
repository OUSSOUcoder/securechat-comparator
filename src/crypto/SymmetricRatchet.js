/**
 * Symmetric Ratchet (KDF Chains)
 * Dérive des clés de message à partir d'une clé de chaîne
 */

export class SymmetricRatchet {
  constructor(rootKey) {
    this.chainKey = rootKey;
    this.messageNumber = 0;
    this.messageKeys = new Map(); // Stocke les clés pour messages hors ordre
  }

  /**
   * Dérive la prochaine clé de message
   */
  async ratchetForward() {
    // HMAC de la clé de chaîne avec un constant
    const constantInput = new TextEncoder().encode("MessageKeys");
    
    const messageKey = await this.hmac(this.chainKey, constantInput);
    
    // Nouvelle clé de chaîne
    const chainConstant = new TextEncoder().encode("ChainKey");
    const newChainKey = await this.hmac(this.chainKey, chainConstant);

    // Sauvegarder pour messages hors ordre
    this.messageKeys.set(this.messageNumber, messageKey);
    
    this.chainKey = newChainKey;
    this.messageNumber++;

    return {
      messageKey,
      messageNumber: this.messageNumber - 1
    };
  }

  /**
   * Récupère une clé de message par son numéro (pour messages hors ordre)
   */
  async getMessageKey(messageNumber) {
    // Si déjà dérivée, retourner
    if (this.messageKeys.has(messageNumber)) {
      return this.messageKeys.get(messageNumber);
    }

    // Sinon, ratchet jusqu'à ce numéro
    while (this.messageNumber <= messageNumber) {
      await this.ratchetForward();
    }

    return this.messageKeys.get(messageNumber);
  }

  /**
   * HMAC-SHA256
   */
  async hmac(key, data) {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      data
    );

    return new Uint8Array(signature);
  }

  /**
   * Nettoie les anciennes clés (pour limiter la mémoire)
   */
  cleanup(keepLast = 100) {
    const minNumber = this.messageNumber - keepLast;
    for (const [num] of this.messageKeys) {
      if (num < minNumber) {
        this.messageKeys.delete(num);
      }
    }
  }
}