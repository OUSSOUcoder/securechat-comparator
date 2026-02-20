/**
 * RatchetStorage - Persistance du Double Ratchet avec IndexedDB
 * 
 * OBJECTIF PÉDAGOGIQUE:
 * Démontrer comment sauvegarder l'état cryptographique d'une session
 * de messagerie chiffrée de bout en bout pour permettre la continuité
 * après un rafraîchissement ou une déconnexion.
 * 
 * FONCTIONNALITÉS:
 * - Sauvegarde automatique après chaque message
 * - Restauration au démarrage
 * - Support multi-sessions (plusieurs conversations)
 * - Gestion des clés sautées (skipped message keys)
 * - Nettoyage des anciennes sessions
 * 
 * NOTES DE SÉCURITÉ:
 * - IndexedDB n'est PAS chiffré par défaut
 * - En production, chiffrer l'état avant stockage
 * - Pour cette démo pédagogique, on stocke en clair
 */

export class RatchetStorage {
  constructor(dbName = 'DoubleRatchetDB', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.ready = false;
  }

  /**
   * Initialise la base de données IndexedDB
   * Crée les object stores nécessaires
   */
  async init() {
    if (this.ready) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('❌ Erreur ouverture IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.ready = true;
        console.log('✅ IndexedDB initialisée');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        console.log('🔧 Mise à niveau de la base de données...');
        
        // Store principal pour les états de ratchet
        if (!db.objectStoreNames.contains('ratchets')) {
          const ratchetStore = db.createObjectStore('ratchets', { 
            keyPath: 'sessionId' 
          });
          
          // Index pour recherche rapide
          ratchetStore.createIndex('userId', 'userId', { unique: false });
          ratchetStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          ratchetStore.createIndex('isActive', 'isActive', { unique: false });
          
          console.log('📦 Store "ratchets" créé');
        }
        
        // Store pour les clés de messages sautés
        if (!db.objectStoreNames.contains('skippedKeys')) {
          const skipStore = db.createObjectStore('skippedKeys', { 
            keyPath: ['sessionId', 'messageNumber']
          });
          
          skipStore.createIndex('sessionId', 'sessionId', { unique: false });
          skipStore.createIndex('timestamp', 'timestamp', { unique: false });
          
          console.log('🔑 Store "skippedKeys" créé');
        }
        
        // Store pour les métadonnées de session
        if (!db.objectStoreNames.contains('metadata')) {
          const metaStore = db.createObjectStore('metadata', { 
            keyPath: 'sessionId' 
          });
          
          metaStore.createIndex('createdAt', 'createdAt', { unique: false });
          
          console.log('📋 Store "metadata" créé');
        }
      };
    });
  }

  /**
   * Sauvegarde l'état complet d'un ratchet
   * 
   * @param {string} sessionId - Identifiant unique de la session
   * @param {DHRatchet} ratchet - Instance du Double Ratchet
   * @param {Object} options - Options supplémentaires
   */
  async saveRatchetState(sessionId, ratchet, options = {}) {
    if (!this.ready) {
      await this.init();
    }

    try {
      // Exporter l'état du ratchet
      const state = await ratchet.export();
      
      // Créer l'enregistrement
      const record = {
        sessionId,
        userId: options.userId || 'unknown',
        state,
        
        // Métadonnées
        lastUpdated: Date.now(),
        messagesSent: ratchet.messagesSent,
        messagesReceived: ratchet.messagesReceived,
        isActive: options.isActive !== false,
        
        // Statistiques de sécurité
        replayStats: ratchet.getReplayStats ? ratchet.getReplayStats() : null,
        
        // Version pour migrations futures
        version: this.version
      };
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['ratchets'], 'readwrite');
        const store = transaction.objectStore('ratchets');
        const request = store.put(record);
        
        request.onsuccess = () => {
          console.log(`💾 Session ${sessionId} sauvegardée (${ratchet.messagesSent} envoyés, ${ratchet.messagesReceived} reçus)`);
          resolve(record);
        };
        
        request.onerror = () => {
          console.error('❌ Erreur sauvegarde:', request.error);
          reject(request.error);
        };
      });
      
    } catch (error) {
      console.error('❌ Erreur export ratchet:', error);
      throw error;
    }
  }

  /**
   * Charge l'état d'un ratchet depuis le stockage
   * 
   * @param {string} sessionId - Identifiant de la session
   * @returns {Promise<Object|null>} État du ratchet ou null
   */
  async loadRatchetState(sessionId) {
    if (!this.ready) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['ratchets'], 'readonly');
      const store = transaction.objectStore('ratchets');
      const request = store.get(sessionId);
      
      request.onsuccess = () => {
        if (request.result) {
          console.log(`📂 Session ${sessionId} chargée (${request.result.messagesSent} envoyés, ${request.result.messagesReceived} reçus)`);
          resolve(request.result);
        } else {
          console.log(`ℹ️ Aucune session trouvée pour ${sessionId}`);
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('❌ Erreur chargement:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Liste toutes les sessions actives
   */
  async listActiveSessions() {
    if (!this.ready) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['ratchets'], 'readonly');
      const store = transaction.objectStore('ratchets');
      const index = store.index('isActive');
      const request = index.getAll(true); // isActive = true
      
      request.onsuccess = () => {
        const sessions = request.result.map(record => ({
          sessionId: record.sessionId,
          userId: record.userId,
          lastUpdated: record.lastUpdated,
          messagesSent: record.messagesSent,
          messagesReceived: record.messagesReceived
        }));
        
        console.log(`📋 ${sessions.length} session(s) active(s)`);
        resolve(sessions);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Supprime une session
   * 
   * @param {string} sessionId - Identifiant de la session
   */
  async deleteRatchetState(sessionId) {
    if (!this.ready) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['ratchets', 'skippedKeys'], 'readwrite');
      
      // Supprimer le ratchet
      const ratchetStore = transaction.objectStore('ratchets');
      const ratchetRequest = ratchetStore.delete(sessionId);
      
      // Supprimer les clés sautées associées
      const skipStore = transaction.objectStore('skippedKeys');
      const skipIndex = skipStore.index('sessionId');
      const skipRequest = skipIndex.openCursor(IDBKeyRange.only(sessionId));
      
      skipRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      transaction.oncomplete = () => {
        console.log(`🗑️ Session ${sessionId} supprimée`);
        resolve();
      };
      
      transaction.onerror = () => {
        console.error('❌ Erreur suppression:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Nettoie les sessions inactives depuis X jours
   * 
   * @param {number} daysOld - Nombre de jours d'inactivité
   */
  async cleanupOldSessions(daysOld = 30) {
    if (!this.ready) {
      await this.init();
    }

    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let deleted = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['ratchets'], 'readwrite');
      const store = transaction.objectStore('ratchets');
      const index = store.index('lastUpdated');
      
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffDate));
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        }
      };
      
      transaction.oncomplete = () => {
        console.log(`🧹 ${deleted} session(s) ancienne(s) supprimée(s)`);
        resolve(deleted);
      };
      
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Sauvegarde les métadonnées d'une session
   */
  async saveMetadata(sessionId, metadata) {
    if (!this.ready) {
      await this.init();
    }

    const record = {
      sessionId,
      ...metadata,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put(record);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Charge les métadonnées d'une session
   */
  async loadMetadata(sessionId) {
    if (!this.ready) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(sessionId);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtient des statistiques sur le stockage
   */
  async getStorageStats() {
    if (!this.ready) {
      await this.init();
    }

    const stats = {
      totalSessions: 0,
      activeSessions: 0,
      totalMessages: 0,
      oldestSession: null,
      newestSession: null
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['ratchets'], 'readonly');
      const store = transaction.objectStore('ratchets');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const sessions = request.result;
        
        stats.totalSessions = sessions.length;
        stats.activeSessions = sessions.filter(s => s.isActive).length;
        stats.totalMessages = sessions.reduce((sum, s) => 
          sum + s.messagesSent + s.messagesReceived, 0
        );
        
        if (sessions.length > 0) {
          const sorted = sessions.sort((a, b) => a.lastUpdated - b.lastUpdated);
          stats.oldestSession = new Date(sorted[0].lastUpdated);
          stats.newestSession = new Date(sorted[sorted.length - 1].lastUpdated);
        }
        
        resolve(stats);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Exporte toutes les données (backup)
   */
  async exportAll() {
    if (!this.ready) {
      await this.init();
    }

    const data = {
      version: this.version,
      exportedAt: Date.now(),
      ratchets: [],
      metadata: []
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['ratchets', 'metadata'], 'readonly');
      
      const ratchetStore = transaction.objectStore('ratchets');
      const ratchetRequest = ratchetStore.getAll();
      
      ratchetRequest.onsuccess = () => {
        data.ratchets = ratchetRequest.result;
      };
      
      const metaStore = transaction.objectStore('metadata');
      const metaRequest = metaStore.getAll();
      
      metaRequest.onsuccess = () => {
        data.metadata = metaRequest.result;
      };
      
      transaction.oncomplete = () => {
        console.log(`📦 Export complet: ${data.ratchets.length} session(s)`);
        resolve(data);
      };
      
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Supprime toutes les données (reset complet)
   */
  async clearAll() {
    if (!this.ready) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        ['ratchets', 'skippedKeys', 'metadata'], 
        'readwrite'
      );
      
      transaction.objectStore('ratchets').clear();
      transaction.objectStore('skippedKeys').clear();
      transaction.objectStore('metadata').clear();
      
      transaction.oncomplete = () => {
        console.log('🗑️ Toutes les données supprimées');
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Ferme la connexion à la base de données
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.ready = false;
      console.log('👋 Connexion IndexedDB fermée');
    }
  }
}

/**
 * EXEMPLE D'UTILISATION:
 * 
 * ```javascript
 * // Initialisation
 * const storage = new RatchetStorage();
 * await storage.init();
 * 
 * // Créer un ratchet avec storage
 * const ratchet = new DHRatchet(sharedSecret, true, { storage });
 * ratchet.sessionId = 'alice-bob-session';
 * 
 * // Sauvegarde automatique après chaque message
 * await ratchet.encrypt("Hello");
 * // → Sauvegardé automatiquement
 * 
 * // Restauration après rafraîchissement
 * const savedState = await storage.loadRatchetState('alice-bob-session');
 * if (savedState) {
 *   const restoredRatchet = await DHRatchet.import(savedState.state);
 *   // → Peut continuer la conversation
 * }
 * ```
 * 
 * NOTES PÉDAGOGIQUES:
 * 
 * 1. Pourquoi IndexedDB et pas localStorage?
 *    - localStorage limité à ~5MB
 *    - IndexedDB peut stocker des centaines de MB
 *    - IndexedDB supporte les transactions
 *    - IndexedDB est asynchrone (pas de blocage UI)
 * 
 * 2. Sécurité du stockage:
 *    - IndexedDB n'est PAS chiffré par défaut
 *    - Les données sont accessibles par JavaScript
 *    - En production: chiffrer avec une clé dérivée du mot de passe
 *    - Signal chiffre son stockage local avec SQLCipher
 * 
 * 3. Gestion de la mémoire:
 *    - Le nettoyage automatique évite la saturation
 *    - Les sessions inactives sont supprimées
 *    - Les clés sautées sont gérées séparément
 * 
 * 4. Limitations assumées (pédagogiques):
 *    - Pas de chiffrement du stockage
 *    - Pas de synchronisation multi-appareils
 *    - Pas de backup cloud
 *    - Une seule base par origine (domaine)
 */