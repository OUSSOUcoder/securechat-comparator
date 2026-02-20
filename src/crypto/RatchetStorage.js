/**
 * crypto/RatchetStorage.js
 * 
 * Système de persistance sécurisée pour l'état du Double Ratchet.
 * 
 * Fonctionnalités:
 * - Stockage dans IndexedDB (meilleur que LocalStorage pour grandes données)
 * - Chiffrement de l'état avant stockage (protection contre accès physique)
 * - Versioning pour gérer les migrations de schéma
 * - Détection de corruption et recovery
 * - Nettoyage automatique des anciennes clés
 * 
 * Format de l'état persisté:
 * {
 *   version: 2,
 *   userId: "Alice",
 *   sessions: {
 *     "Bob": {
 *       rootKey: Uint8Array,
 *       sendingChainKey: Uint8Array,
 *       receivingChainKey: Uint8Array,
 *       sendCounter: number,
 *       receiveCounter: number,
 *       dhSelfKeyPair: {publicKey, privateKey},
 *       dhRemotePublicKey: Uint8Array,
 *       skippedMessages: Map<number, Uint8Array>
 *     }
 *   },
 *   timestamp: number
 * }
 */

import sodium from './sodium.js';

/**
 * Version actuelle du schéma de stockage
 * Incrémente lors de changements incompatibles
 */
const STORAGE_VERSION = 2;

/**
 * Nom de la base de données IndexedDB
 */
const DB_NAME = 'SecureMessaging';
const DB_VERSION = 2;
const STORE_NAME = 'ratchet_states';

/**
 * Durée de validité d'un état (7 jours par défaut)
 */
const STATE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Gestionnaire de persistance pour le Double Ratchet
 */
export class RatchetStorage {
  constructor(userId) {
    this.userId = userId;
    this.db = null;
    this.masterKey = null; // Clé maître pour chiffrement du stockage
    this.memoryCache = new Map(); // Cache en mémoire des sessions actives
  }

  /**
   * Initialise la base de données et la clé de chiffrement
   * 
   * @param {string} password - Mot de passe utilisateur (optionnel)
   * 
   * En production, la clé maître serait dérivée du password utilisateur
   * ou stockée dans un keychain OS sécurisé.
   */
  async initialize(password = null) {
    try {
      // 1. Ouvrir/créer IndexedDB
      this.db = await this.openDatabase();

      // 2. Dériver ou générer la clé maître
      if (password) {
        this.masterKey = await this.deriveKeyFromPassword(password);
      } else {
        // En mode démo: générer une clé aléatoire
        // En production: JAMAIS faire ça, toujours demander le password
        this.masterKey = sodium.randomBytes(32);
        console.warn('⚠️ Clé maître générée aléatoirement (mode démo)');
      }

      // 3. Charger les états existants en cache
      await this.loadCache();

      console.log('✅ RatchetStorage initialisé');

    } catch (error) {
      throw new Error(`Échec initialisation RatchetStorage: ${error.message}`);
    }
  }

  /**
   * Ouvre la base de données IndexedDB
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Créer l'object store si nécessaire
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          
          // Index pour recherche par userId
          store.createIndex('userId', 'userId', { unique: false });
          
          // Index pour recherche par timestamp (nettoyage)
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Dérive une clé maître depuis un password utilisateur
   * 
   * Utilise Argon2 ou PBKDF2 pour résistance aux attaques brute-force
   */
  async deriveKeyFromPassword(password) {
    // En production: utiliser Argon2id (libsodium)
    // Pour démo: utilisation de crypto_pwhash
    
    const salt = await this.getOrCreateSalt();
    
    try {
      // Argon2id avec paramètres modérés
      return sodium.sodium.crypto_pwhash(
        32, // longueur de sortie
        sodium.sodium.from_string(password),
        salt,
        sodium.sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.sodium.crypto_pwhash_ALG_ARGON2ID13
      );
    } catch (error) {
      throw new Error(`Échec dérivation clé: ${error.message}`);
    }
  }

  /**
   * Récupère ou crée le salt pour dérivation de clé
   */
  async getOrCreateSalt() {
    const SALT_KEY = 'master_salt';
    
    // Chercher salt existant
    const stored = localStorage.getItem(SALT_KEY);
    if (stored) {
      return sodium.fromBase64(stored);
    }

    // Créer nouveau salt
    const salt = sodium.randomBytes(sodium.sodium.crypto_pwhash_SALTBYTES);
    localStorage.setItem(SALT_KEY, sodium.toBase64(salt));
    
    return salt;
  }

  /**
   * Sauvegarde l'état d'une session Double Ratchet
   * 
   * @param {string} contactId - ID du contact (ex: "Bob")
   * @param {Object} sessionState - État complet de la session
   */
  async saveSession(contactId, sessionState) {
    if (!this.db || !this.masterKey) {
      throw new Error('RatchetStorage pas initialisé');
    }

    try {
      // 1. Construire l'objet d'état complet
      const fullState = {
        version: STORAGE_VERSION,
        userId: this.userId,
        contactId,
        sessionState: this.serializeState(sessionState),
        timestamp: Date.now()
      };

      // 2. Sérialiser en JSON
      const stateJson = JSON.stringify(fullState);
      const stateBytes = sodium.sodium.from_string(stateJson);

      // 3. Chiffrer avec la clé maître
      const { ciphertext, nonce } = sodium.encrypt(stateBytes, this.masterKey);

      // 4. Préparer pour stockage IndexedDB
      const record = {
        id: `${this.userId}:${contactId}`,
        userId: this.userId,
        contactId,
        version: STORAGE_VERSION,
        encrypted: sodium.toBase64(ciphertext),
        nonce: sodium.toBase64(nonce),
        timestamp: fullState.timestamp
      };

      // 5. Écrire dans IndexedDB
      await this.writeRecord(record);

      // 6. Mettre à jour le cache mémoire
      this.memoryCache.set(contactId, sessionState);

      console.log(`💾 Session sauvegardée: ${contactId}`);

    } catch (error) {
      throw new Error(`Échec sauvegarde session: ${error.message}`);
    }
  }

  /**
   * Charge l'état d'une session Double Ratchet
   * 
   * @param {string} contactId - ID du contact
   * @returns {Object|null} État de session ou null si inexistant
   */
  async loadSession(contactId) {
    if (!this.db || !this.masterKey) {
      throw new Error('RatchetStorage pas initialisé');
    }

    // Vérifier le cache d'abord
    if (this.memoryCache.has(contactId)) {
      return this.memoryCache.get(contactId);
    }

    try {
      // 1. Lire depuis IndexedDB
      const record = await this.readRecord(`${this.userId}:${contactId}`);
      
      if (!record) {
        return null;
      }

      // 2. Déchiffrer
      const ciphertext = sodium.fromBase64(record.encrypted);
      const nonce = sodium.fromBase64(record.nonce);

      let stateBytes;
      try {
        stateBytes = sodium.decrypt(ciphertext, nonce, this.masterKey);
      } catch (error) {
        console.error('❌ Échec déchiffrement: état corrompu ou mauvaise clé');
        return null;
      }

      // 3. Désérialiser
      const stateJson = sodium.sodium.to_string(stateBytes);
      const fullState = JSON.parse(stateJson);

      // 4. Vérifier version
      if (fullState.version !== STORAGE_VERSION) {
        console.warn(`⚠️ Migration nécessaire: v${fullState.version} → v${STORAGE_VERSION}`);
        return await this.migrateState(fullState);
      }

      // 5. Vérifier TTL
      if (Date.now() - fullState.timestamp > STATE_TTL_MS) {
        console.warn('⚠️ État expiré, suppression');
        await this.deleteSession(contactId);
        return null;
      }

      // 6. Désérialiser l'état de session
      const sessionState = this.deserializeState(fullState.sessionState);

      // 7. Mettre en cache
      this.memoryCache.set(contactId, sessionState);

      console.log(`📂 Session chargée: ${contactId}`);
      return sessionState;

    } catch (error) {
      console.error(`Échec chargement session: ${error.message}`);
      return null;
    }
  }

  /**
   * Supprime une session
   */
  async deleteSession(contactId) {
    if (!this.db) return;

    try {
      await this.deleteRecord(`${this.userId}:${contactId}`);
      this.memoryCache.delete(contactId);
      console.log(`🗑️ Session supprimée: ${contactId}`);
    } catch (error) {
      console.error(`Échec suppression: ${error.message}`);
    }
  }

  /**
   * Liste toutes les sessions actives
   */
  async listSessions() {
    if (!this.db) return [];

    try {
      const records = await this.getAllRecords();
      return records
        .filter(r => r.userId === this.userId)
        .map(r => ({
          contactId: r.contactId,
          timestamp: r.timestamp,
          version: r.version
        }));
    } catch (error) {
      console.error(`Échec listage: ${error.message}`);
      return [];
    }
  }

  /**
   * Nettoie les états expirés
   */
  async cleanup() {
    if (!this.db) return;

    try {
      const now = Date.now();
      const cutoff = now - STATE_TTL_MS;

      const records = await this.getAllRecords();
      const expired = records.filter(r => r.timestamp < cutoff);

      for (const record of expired) {
        await this.deleteRecord(record.id);
      }

      console.log(`🧹 ${expired.length} session(s) expirée(s) nettoyée(s)`);

    } catch (error) {
      console.error(`Échec nettoyage: ${error.message}`);
    }
  }

  /**
   * Charge tous les états en cache mémoire (au démarrage)
   */
  async loadCache() {
    const sessions = await this.listSessions();
    
    for (const session of sessions) {
      try {
        await this.loadSession(session.contactId);
      } catch (error) {
        console.error(`Échec chargement cache ${session.contactId}:`, error);
      }
    }
  }

  // === SÉRIALISATION ===

  /**
   * Sérialise l'état de session pour stockage
   * 
   * Convertit les Uint8Array en base64 pour JSON
   */
  serializeState(state) {
    return {
      rootKey: state.rootKey ? sodium.toBase64(state.rootKey) : null,
      sendingChainKey: state.sendingChainKey ? sodium.toBase64(state.sendingChainKey) : null,
      receivingChainKey: state.receivingChainKey ? sodium.toBase64(state.receivingChainKey) : null,
      sendCounter: state.sendCounter,
      receiveCounter: state.receiveCounter,
      dhSelfKeyPair: state.dhSelfKeyPair ? {
        publicKey: sodium.toBase64(state.dhSelfKeyPair.publicKey),
        privateKey: sodium.toBase64(state.dhSelfKeyPair.privateKey)
      } : null,
      dhRemotePublicKey: state.dhRemotePublicKey ? sodium.toBase64(state.dhRemotePublicKey) : null,
      skippedMessages: state.skippedMessages ? 
        Array.from(state.skippedMessages.entries()).map(([k, v]) => [k, sodium.toBase64(v)]) 
        : []
    };
  }

  /**
   * Désérialise l'état de session depuis le stockage
   */
  deserializeState(serialized) {
    return {
      rootKey: serialized.rootKey ? sodium.fromBase64(serialized.rootKey) : null,
      sendingChainKey: serialized.sendingChainKey ? sodium.fromBase64(serialized.sendingChainKey) : null,
      receivingChainKey: serialized.receivingChainKey ? sodium.fromBase64(serialized.receivingChainKey) : null,
      sendCounter: serialized.sendCounter,
      receiveCounter: serialized.receiveCounter,
      dhSelfKeyPair: serialized.dhSelfKeyPair ? {
        publicKey: sodium.fromBase64(serialized.dhSelfKeyPair.publicKey),
        privateKey: sodium.fromBase64(serialized.dhSelfKeyPair.privateKey)
      } : null,
      dhRemotePublicKey: serialized.dhRemotePublicKey ? sodium.fromBase64(serialized.dhRemotePublicKey) : null,
      skippedMessages: new Map(
        serialized.skippedMessages.map(([k, v]) => [k, sodium.fromBase64(v)])
      )
    };
  }

  // === MIGRATIONS ===

  /**
   * Migre un état d'une ancienne version
   */
  async migrateState(oldState) {
    console.log(`🔄 Migration v${oldState.version} → v${STORAGE_VERSION}`);

    // Logique de migration selon les versions
    let migratedState = oldState;

    if (oldState.version === 1) {
      // Migration v1 → v2: exemple d'ajout de skippedMessages
      migratedState.sessionState.skippedMessages = [];
      migratedState.version = 2;
    }

    // Sauvegarder la version migrée
    await this.saveSession(migratedState.contactId, this.deserializeState(migratedState.sessionState));

    return this.deserializeState(migratedState.sessionState);
  }

  // === OPÉRATIONS IndexedDB ===

  writeRecord(record) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  readRecord(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  deleteRecord(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  getAllRecords() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Nettoie toutes les ressources
   */
  async destroy() {
    // Effacer le cache mémoire
    this.memoryCache.clear();

    // Effacer la clé maître
    if (this.masterKey) {
      sodium.secureZero(this.masterKey);
      this.masterKey = null;
    }

    // Fermer la DB
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Utilitaire: nettoie complètement toutes les données (reset)
 */
export async function resetAllStorage() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    
    request.onsuccess = () => {
      localStorage.removeItem('master_salt');
      console.log('🗑️ Stockage complètement réinitialisé');
      resolve();
    };
    
    request.onerror = () => reject(request.error);
  });
}