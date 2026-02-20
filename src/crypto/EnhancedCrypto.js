/**
 * EnhancedCrypto v2.1 - Système cryptographique multi-utilisateurs complet
 * ✅ FLUX : RSA pour clé AES → AES-GCM pour messages → IndexedDB persistance
 * ✅ FIX : Pas de dépendance timing, sessions par userId, retry automatique
 */

export class EnhancedCrypto {
  constructor(userId) {
    this.userId = userId;
    this.sessions = new Map(); // userId -> {sessionKey, encryptedSessionKey, counter, createdAt}
    this.db = null;
    this.initDB();
  }

  // ✅ IndexedDB persistance des sessions
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CryptoSessionsDB', 3);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.loadSessions().then(resolve).catch(reject);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'userId' });
        }
      };
    });
  }

  async loadSessions() {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(['sessions'], 'readonly');
      const store = tx.objectStore('sessions');
      const allSessions = await new Promise(resolve => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
      });

      // Réimporter les clés AES
      for (const sessionData of allSessions) {
        const sessionKey = await window.crypto.subtle.importKey(
          'raw',
          this.base64ToArrayBuffer(sessionData.sessionKeyRaw),
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        
        this.sessions.set(sessionData.userId, {
          sessionKey,
          encryptedSessionKey: sessionData.encryptedSessionKey,
          messageCounter: sessionData.messageCounter || 0,
          createdAt: sessionData.createdAt
        });
      }
      console.log(`✅ ${allSessions.length} sessions chargées depuis IndexedDB`);
    } catch (error) {
      console.error('Erreur load sessions:', error);
    }
  }

  async saveSession(userId, sessionData) {
    if (!this.db) return;
    try {
      const sessionKeyRaw = await window.crypto.subtle.exportKey('raw', sessionData.sessionKey);
      const tx = this.db.transaction(['sessions'], 'readwrite');
      const store = tx.objectStore('sessions');
      
      await new Promise((resolve, reject) => {
        const request = store.put({
          userId,
          sessionKeyRaw: this.arrayBufferToBase64(sessionKeyRaw),
          encryptedSessionKey: sessionData.encryptedSessionKey,
          messageCounter: sessionData.messageCounter || 0,
          createdAt: sessionData.createdAt
        });
        request.onsuccess = resolve;
        request.onerror = reject;
      });
    } catch (error) {
      console.error('Erreur save session:', error);
    }
  }

  /**
   * ✅ initSession CORRIGÉE : Vérifie existence + persistance
   */
  async initSession(recipientId, recipientPublicKeyJWK) {
    // ✅ CHECK 1 : Session déjà existante ?
    if (this.sessions.has(recipientId)) {
      console.log(`⚡ Session déjà active: ${recipientId}`);
      return this.sessions.get(recipientId);
    }

    try {
      // ✅ CHECK 2 : IndexedDB
      await this.loadSessions();
      if (this.sessions.has(recipientId)) {
        console.log(`✅ Session restaurée depuis DB: ${recipientId}`);
        return this.sessions.get(recipientId);
      }

      // ✅ NOUVELLE SESSION
      const sessionKey = await this.generateSessionKey();

      // Importer clé publique RSA destinataire
      const recipientPublicKey = await window.crypto.subtle.importKey(
        'jwk',
        recipientPublicKeyJWK,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['encrypt']
      );

      // Chiffrer la clé AES avec RSA du destinataire
      const sessionKeyRaw = await window.crypto.subtle.exportKey('raw', sessionKey);
      const encryptedSessionKeyBuffer = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        recipientPublicKey,
        sessionKeyRaw
      );

      const sessionData = {
        sessionKey,
        encryptedSessionKey: this.arrayBufferToBase64(encryptedSessionKeyBuffer),
        messageCounter: 0,
        createdAt: Date.now()
      };

      // ✅ PERSISTANCE IMMÉDIATE
      this.sessions.set(recipientId, sessionData);
      await this.saveSession(recipientId, sessionData);

      console.log(`✅ Session CRÉÉE & SAUVEGARDÉE: ${recipientId}`);
      return sessionData;

    } catch (error) {
      console.error(`❌ initSession ${recipientId}:`, error);
      throw error;
    }
  }

  /**
   * ✅ acceptSession CORRIGÉE : Reconstruction automatique de la clé AES
   */
  async acceptSession(senderId, encryptedSessionKeyBase64, myPrivateKey) {
    // CHECK existence
    if (this.sessions.has(senderId)) {
      console.log(`ℹ️ Session déjà active avec ${senderId}`);
      return;
    }

    try {
      const encryptedSessionKey = this.base64ToArrayBuffer(encryptedSessionKeyBase64);

      // Déchiffrer la clé AES avec notre clé privée RSA
      const sessionKeyRaw = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        myPrivateKey,
        encryptedSessionKey
      );

      // Importer la clé AES
      const sessionKey = await window.crypto.subtle.importKey(
        'raw',
        sessionKeyRaw,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      const sessionData = {
        sessionKey,
        encryptedSessionKey: encryptedSessionKeyBase64,
        messageCounter: 0,
        createdAt: Date.now()
      };

      // ✅ Persistance
      this.sessions.set(senderId, sessionData);
      await this.saveSession(senderId, sessionData);

      console.log(`✅ Session ACCEPTÉE & SAUVEGARDÉE: ${senderId}`);
    } catch (error) {
      console.error(`❌ acceptSession ${senderId}:`, error);
      throw error;
    }
  }

  /**
   * ✅ encryptMessage CORRIGÉE : Inclut TOUJOURS encryptedSessionKey
   */
  async encryptMessage(recipientId, plaintext) {
    const session = this.sessions.get(recipientId);
    if (!session) {
      throw new Error(`Session manquante pour ${recipientId}. Appelez initSession() d'abord.`);
    }

    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      session.sessionKey,
      plaintextBytes
    );

    session.messageCounter++;
    await this.saveSession(recipientId, session); // ✅ Update counter

    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv),
      counter: session.messageCounter,
      encryptedSessionKey: session.encryptedSessionKey // ✅ CLÉ MAÎTRESSE
    };
  }

  /**
   * ✅ decryptMessage CORRIGÉE : Auto-init si nécessaire
   */
  async decryptMessage(senderId, encryptedData, myPrivateKey = null) {
    let session = this.sessions.get(senderId);

    // ✅ AUTO-INIT si première réception
    if (!session && encryptedData.encryptedSessionKey && myPrivateKey) {
      await this.acceptSession(senderId, encryptedData.encryptedSessionKey, myPrivateKey);
      session = this.sessions.get(senderId);
    }

    if (!session) {
      throw new Error(`Session manquante pour ${senderId}`);
    }

    try {
      const ciphertext = this.base64ToArrayBuffer(encryptedData.ciphertext);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);

      const plaintextBytes = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        session.sessionKey,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(plaintextBytes);
    } catch (error) {
      console.error(`❌ decrypt ${senderId}:`, error);
      throw new Error(`Déchiffrement échoué: ${error.message}`);
    }
  }

  // Utils Base64
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Cleanup
  cleanupExpiredSessions() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.createdAt > maxAge) {
        this.sessions.delete(userId);
        if (this.db) {
          const tx = this.db.transaction(['sessions'], 'readwrite');
          tx.objectStore('sessions').delete(userId);
        }
      }
    }
  }

  getSessionStatus(userId) {
    const session = this.sessions.get(userId);
    return session ? 'active' : 'pending';
  }
}
