

export class ReplayProtection {
  /**
   * @param {number} maxAge - Âge maximum accepté pour un message (ms)
   * @param {number} cleanupInterval - Intervalle de nettoyage (ms)
   */
  constructor(maxAge = 5 * 60 * 1000, cleanupInterval = 60 * 1000) {
    // Set pour O(1) lookup des nonces
    this.receivedNonces = new Set();
    
    // Map pour tracer les timestamps
    this.nonceTimestamps = new Map();
    
    // Configuration
    this.maxNonceAge = maxAge;
    this.cleanupInterval = cleanupInterval;
    
    // Statistiques (pédagogique)
    this.stats = {
      messagesAccepted: 0,
      messagesRejected: 0,
      replayDetected: 0,
      tooOldDetected: 0
    };
    
    // Démarrer le nettoyage automatique
    this.startCleanup();
  }

  /**
   * Valide un message et enregistre son nonce
   * 
   * @param {ArrayBuffer} nonce - Nonce unique du message
   * @param {number} timestamp - Timestamp du message
   * @throws {Error} Si rejeu détecté ou message trop ancien
   */
  async validateMessage(nonce, timestamp) {
    // Convertir le nonce en string pour le Set
    const nonceStr = this.bufferToHex(nonce);
    
    // 1. Vérifier si déjà vu (REJEU)
    if (this.receivedNonces.has(nonceStr)) {
      this.stats.messagesRejected++;
      this.stats.replayDetected++;
      throw new Error(
        `🚨 REPLAY ATTACK DETECTED! Nonce ${nonceStr.substring(0, 16)}... already used`
      );
    }
    
    // 2. Vérifier la fraîcheur du message
    const messageAge = Date.now() - timestamp;
    if (messageAge > this.maxNonceAge) {
      this.stats.messagesRejected++;
      this.stats.tooOldDetected++;
      throw new Error(
        `⏰ Message too old: ${Math.floor(messageAge / 1000)}s (max: ${Math.floor(this.maxNonceAge / 1000)}s)`
      );
    }
    
    // 3. Vérifier que le timestamp n'est pas dans le futur
    if (messageAge < -30000) { // Tolérance de 30s pour décalage d'horloge
      this.stats.messagesRejected++;
      throw new Error(
        `⏰ Message timestamp is in the future (clock skew?)`
      );
    }
    
    // 4. Enregistrer le nonce
    this.receivedNonces.add(nonceStr);
    this.nonceTimestamps.set(nonceStr, timestamp);
    this.stats.messagesAccepted++;
    
    return true;
  }

  /**
   * Nettoie les anciens nonces pour libérer la mémoire
   */
  cleanupOldNonces() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [nonce, timestamp] of this.nonceTimestamps.entries()) {
      const age = now - timestamp;
      
      if (age > this.maxNonceAge) {
        this.receivedNonces.delete(nonce);
        this.nonceTimestamps.delete(nonce);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old nonces. Current size: ${this.receivedNonces.size}`);
    }
  }

  /**
   * Démarre le nettoyage automatique
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldNonces();
    }, this.cleanupInterval);
  }

  /**
   * Arrête le nettoyage automatique
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Obtient les statistiques
   */
  getStats() {
    return {
      ...this.stats,
      activeNonces: this.receivedNonces.size,
      replayRate: this.stats.messagesRejected > 0 
        ? (this.stats.replayDetected / this.stats.messagesRejected * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Réinitialise la protection (pour tests ou nouveau départ)
   */
  reset() {
    this.receivedNonces.clear();
    this.nonceTimestamps.clear();
    this.stats = {
      messagesAccepted: 0,
      messagesRejected: 0,
      replayDetected: 0,
      tooOldDetected: 0
    };
  }

  /**
   * Utilitaire: Convertit ArrayBuffer en hex string
   */
  bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Nettoie les ressources
   */
  destroy() {
    this.stopCleanup();
    this.receivedNonces.clear();
    this.nonceTimestamps.clear();
  }
}
