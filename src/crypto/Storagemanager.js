/**
 * Gestionnaire de Persistance pour Double Ratchet
 * 
 * Utilise IndexedDB pour stocker l'état complet du protocole:
 * - État du Double Ratchet (root key, chains, compteurs)
 * - Clés Sealed Sender
 * - Bundles X3DH
 * - Historique des messages
 * 
 * IndexedDB est préféré à localStorage car:
 * - Pas de limite de 5-10 MB
 * - API asynchrone (pas de blocage UI)
 * - Meilleure performance pour données volumineuses
 */

const DB_NAME = 'E2EEMessaging';
const DB_VERSION = 1;

// Object stores
const STORES = {
  RATCHET_STATE: 'ratchetState',
  SEALED_SENDER_KEYS: 'sealedSenderKeys',
  X3DH_BUNDLES: 'x3dhBundles',
  MESSAGE_HISTORY: 'messageHistory',
  CONTACTS: 'contacts'
};

/**
 * Gestionnaire de base de données IndexedDB
 */
export class StorageManager {
  constructor() {
    this.db = null;
  }

  /**
   * Initialise la base de données
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Impossible d\'ouvrir IndexedDB'));
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('✅ IndexedDB initialisée');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store pour l'état du Double Ratchet
        if (!db.objectStoreNames.contains(STORES.RATCHET_STATE)) {
          const ratchetStore = db.createObjectStore(STORES.RATCHET_STATE, { 
            keyPath: 'contactId' 
          });
          ratchetStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }

        // Store pour les clés Sealed Sender
        if (!db.objectStoreNames.contains(STORES.SEALED_SENDER_KEYS)) {
          db.createObjectStore(STORES.SEALED_SENDER_KEYS, { 
            keyPath: 'id' 
          });
        }

        // Store pour les bundles X3DH
        if (!db.objectStoreNames.contains(STORES.X3DH_BUNDLES)) {
          db.createObjectStore(STORES.X3DH_BUNDLES, { 
            keyPath: 'userId' 
          });
        }

        // Store pour l'historique des messages
        if (!db.objectStoreNames.contains(STORES.MESSAGE_HISTORY)) {
          const messageStore = db.createObjectStore(STORES.MESSAGE_HISTORY, { 
            keyPath: 'id',
            autoIncrement: true 
          });
          messageStore.createIndex('contactId', 'contactId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store pour les contacts
        if (!db.objectStoreNames.contains(STORES.CONTACTS)) {
          db.createObjectStore(STORES.CONTACTS, { 
            keyPath: 'id' 
          });
        }

        console.log('✅ Schéma IndexedDB créé');
      };
    });
  }

  /**
   * Sauvegarde l'état du Double Ratchet pour un contact
   * 
   * @param {string} contactId - Identifiant du contact
   * @param {Object} ratchetState - État exporté du ratchet
   */
  async saveRatchetState(contactId, ratchetState) {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.RATCHET_STATE], 'readwrite');
      const store = transaction.objectStore(STORES.RATCHET_STATE);

      const data = {
        contactId,
        ratchetState,
        lastUpdated: Date.now()
      };

      const request = store.put(data);

      request.onsuccess = () => {
        console.log(`✅ État du ratchet sauvegardé pour ${contactId}`);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Erreur lors de la sauvegarde du ratchet: ${request.error}`));
      };
    });
  }

  /**
   * Charge l'état du Double Ratchet pour un contact
   * 
   * @param {string} contactId - Identifiant du contact
   * @returns {Promise<Object|null>} État du ratchet ou null si non trouvé
   */
  async loadRatchetState(contactId) {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.RATCHET_STATE], 'readonly');
      const store = transaction.objectStore(STORES.RATCHET_STATE);
      const request = store.get(contactId);

      request.onsuccess = () => {
        if (request.result) {
          console.log(`✅ État du ratchet chargé pour ${contactId}`);
          resolve(request.result.ratchetState);
        } else {
          console.log(`ℹ️ Aucun état sauvegardé pour ${contactId}`);
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(new Error(`Erreur lors du chargement du ratchet: ${request.error}`));
      };
    });
  }

  /**
   * Supprime l'état du Double Ratchet pour un contact
   * 
   * @param {string} contactId - Identifiant du contact
   */
  async deleteRatchetState(contactId) {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.RATCHET_STATE], 'readwrite');
      const store = transaction.objectStore(STORES.RATCHET_STATE);
      const request = store.delete(contactId);

      request.onsuccess = () => {
        console.log(`✅ État du ratchet supprimé pour ${contactId}`);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Erreur lors de la suppression: ${request.error}`));
      };
    });
  }

  /**
   * Sauvegarde les clés Sealed Sender
   */
  async saveSealedSenderKeys(userId, keys) {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SEALED_SENDER_KEYS], 'readwrite');
      const store = transaction.objectStore(STORES.SEALED_SENDER_KEYS);

      const data = {
        id: userId,
        keys,
        createdAt: Date.now()
      };

      const request = store.put(data);

      request.onsuccess = () => {
        console.log(`✅ Clés Sealed Sender sauvegardées`);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Erreur: ${request.error}`));
      };
    });
  }

  /**
   * Charge les clés Sealed Sender
   */
  async loadSealedSenderKeys(userId) {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SEALED_SENDER_KEYS], 'readonly');
      const store = transaction.objectStore(STORES.SEALED_SENDER_KEYS);
      const request = store.get(userId);

      request.onsuccess = () => {
        resolve(request.result ? request.result.keys : null);
      };

      request.onerror = () => {
        reject(new Error(`Erreur: ${request.error}`));
      };
    });
  }

  /**
   * Sauvegarde un bundle X3DH
   */
  async saveX3DHBundle(userId, bundle) {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.X3DH_BUNDLES], 'readwrite');
      const store = transaction.objectStore(STORES.X3DH_BUNDLES);

      const data = {
        userId,
        bundle,
        createdAt: Date.now()
      };

      const request = store.put(data);

      request.onsuccess = () => {
        console.log(`✅ Bundle X3DH sauvegardé`);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Erreur: ${request.error}`));
      };
    });
  }

  /**
   * Charge un bundle X3DH
   */
  async loadX3DHBundle(userId) {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.X3DH_BUNDLES], 'readonly');
      const store = transaction.objectStore(STORES.X3DH_BUNDLES);
      const request = store.get(userId);

      request.onsuccess = () => {
        resolve(request.result ? request.result.bundle : null);
      };

      request.onerror = () => {
        reject(new Error(`Erreur: ${request.error}`));
      };
    });
  }

  /**
   * Sauvegarde un message dans l'historique
   */
  async saveMessage(contactId, message, direction) {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MESSAGE_HISTORY], 'readwrite');
      const store = transaction.objectStore(STORES.MESSAGE_HISTORY);

      const data = {
        contactId,
        message,
        direction, // 'sent' ou 'received'
        timestamp: Date.now()
      };

      const request = store.add(data);

      request.onsuccess = () => {
        resolve(request.result); // Retourne l'ID du message
      };

      request.onerror = () => {
        reject(new Error(`Erreur: ${request.error}`));
      };
    });
  }

  /**
   * Charge l'historique des messages pour un contact
   */
  async loadMessages(contactId, limit = 50) {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MESSAGE_HISTORY], 'readonly');
      const store = transaction.objectStore(STORES.MESSAGE_HISTORY);
      const index = store.index('contactId');
      const request = index.getAll(contactId);

      request.onsuccess = () => {
        const messages = request.result
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
        resolve(messages);
      };

      request.onerror = () => {
        reject(new Error(`Erreur: ${request.error}`));
      };
    });
  }

  /**
   * Réinitialise complètement la base de données
   * ATTENTION: Supprime toutes les données!
   */
  async resetDatabase() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close();
      }

      const request = indexedDB.deleteDatabase(DB_NAME);

      request.onsuccess = () => {
        console.log('✅ Base de données réinitialisée');
        this.db = null;
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Erreur lors de la réinitialisation'));
      };
    });
  }

  /**
   * Exporte toutes les données (pour backup)
   */
  async exportAllData() {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const data = {};

    for (const storeName of Object.values(STORES)) {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const items = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      data[storeName] = items;
    }

    return data;
  }

  /**
   * Importe des données (pour restauration)
   */
  async importAllData(data) {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    for (const [storeName, items] of Object.entries(data)) {
      if (!Object.values(STORES).includes(storeName)) {
        continue;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      for (const item of items) {
        await new Promise((resolve, reject) => {
          const request = store.put(item);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }

    console.log('✅ Données importées avec succès');
  }
}

/**
 * Instance singleton du gestionnaire de stockage
 */
let storageInstance = null;

export async function getStorageManager() {
  if (!storageInstance) {
    storageInstance = new StorageManager();
    await storageInstance.initialize();
  }
  return storageInstance;
}