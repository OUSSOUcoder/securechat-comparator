/**
 * Gestion de la persistance avec IndexedDB
 */

const DB_NAME = 'SecureChatDB';
const DB_VERSION = 1;
const STORES = {
  KEYS: 'keys',
  SESSIONS: 'sessions',
  MESSAGES: 'messages'
};

export class PersistentStorage {
  constructor() {
    this.db = null;
  }

  /**
   * Initialise la base de données
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store pour les clés
        if (!db.objectStoreNames.contains(STORES.KEYS)) {
          db.createObjectStore(STORES.KEYS, { keyPath: 'userId' });
        }

        // Store pour les sessions
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
        }

        // Store pour les messages
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          const messagesStore = db.createObjectStore(STORES.MESSAGES, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          messagesStore.createIndex('roomId', 'roomId', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Sauvegarde les clés d'identité
   */
  async saveKeys(userId, publicKeyJWK, privateKeyJWK) {
    const transaction = this.db.transaction([STORES.KEYS], 'readwrite');
    const store = transaction.objectStore(STORES.KEYS);

    return new Promise((resolve, reject) => {
      const request = store.put({
        userId,
        publicKeyJWK,
        privateKeyJWK,
        timestamp: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Charge les clés d'identité
   */
  async loadKeys(userId) {
    const transaction = this.db.transaction([STORES.KEYS], 'readonly');
    const store = transaction.objectStore(STORES.KEYS);

    return new Promise((resolve, reject) => {
      const request = store.get(userId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sauvegarde un message
   */
  async saveMessage(roomId, message) {
    const transaction = this.db.transaction([STORES.MESSAGES], 'readwrite');
    const store = transaction.objectStore(STORES.MESSAGES);

    return new Promise((resolve, reject) => {
      const request = store.add({
        roomId,
        ...message,
        savedAt: Date.now()
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Charge les messages d'une room
   */
  async loadMessages(roomId, limit = 100) {
    const transaction = this.db.transaction([STORES.MESSAGES], 'readonly');
    const store = transaction.objectStore(STORES.MESSAGES);
    const index = store.index('roomId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(roomId);

      request.onsuccess = () => {
        const messages = request.result.slice(-limit); // Derniers N messages
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Nettoie les vieux messages (> 7 jours)
   */
  async cleanupOldMessages(maxAgeDays = 7) {
    const transaction = this.db.transaction([STORES.MESSAGES], 'readwrite');
    const store = transaction.objectStore(STORES.MESSAGES);
    const index = store.index('timestamp');

    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);
      let deleted = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          console.log(`🗑️ ${deleted} messages supprimés`);
          resolve(deleted);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}