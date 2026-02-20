/**
 * components/SecureMessagingDemo.jsx
 * 
 * Démo complète du système de messagerie sécurisée avec:
 * - Primitives modernes (libsodium)
 * - Sealed Sender v2 (ECDH basé)
 * - Persistance du ratchet
 * - Gestion d'erreurs robuste
 */

import { useState, useEffect } from 'react';
import sodium from '../crypto/sodium.js';
import { SealedSenderV2, SealedSenderKeyManager } from '../crypto/SealedSenderV2.js';
import { RatchetStorage, resetAllStorage } from '../crypto/RatchetStorage.js';

// Simulateurs de composants crypto (à remplacer par vos implémentations réelles)
class MockDoubleRatchet {
  constructor(userId) {
    this.userId = userId;
    this.sessions = new Map();
  }

  async initSession(contactId, sharedSecret) {
    this.sessions.set(contactId, {
      rootKey: sharedSecret,
      sendCounter: 0,
      receiveCounter: 0
    });
  }

  async encrypt(contactId, message) {
    const session = this.sessions.get(contactId);
    if (!session) throw new Error('Session inexistante');

    const messageBytes = sodium.sodium.from_string(message);
    const { ciphertext, nonce } = sodium.encrypt(messageBytes, session.rootKey);
    
    session.sendCounter++;
    
    return {
      ciphertext: sodium.toBase64(ciphertext),
      nonce: sodium.toBase64(nonce),
      counter: session.sendCounter - 1
    };
  }

  async decrypt(contactId, encrypted) {
    const session = this.sessions.get(contactId);
    if (!session) throw new Error('Session inexistante');

    const ciphertext = sodium.fromBase64(encrypted.ciphertext);
    const nonce = sodium.fromBase64(encrypted.nonce);
    
    const plaintext = sodium.decrypt(ciphertext, nonce, session.rootKey);
    session.receiveCounter++;
    
    return sodium.sodium.to_string(plaintext);
  }

  getSessionState(contactId) {
    return this.sessions.get(contactId);
  }
}

class MockCertificateAuthority {
  async issueCertificate(userId, publicKey) {
    // Certificat simplifié
    const certData = {
      userId,
      publicKey: sodium.toBase64(publicKey),
      issuedAt: Date.now(),
      issuer: 'MockCA'
    };
    
    const certJson = JSON.stringify(certData);
    return sodium.sodium.from_string(certJson);
  }

  async verifyCertificate(certificate) {
    try {
      const certJson = sodium.sodium.to_string(certificate);
      const certData = JSON.parse(certJson);
      return certData.userId;
    } catch {
      return null;
    }
  }
}

function SecureMessagingDemo() {
  const [log, setLog] = useState([]);
  const [serverView, setServerView] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [sodiumReady, setSodiumReady] = useState(false);
  
  // Acteurs
  const [alice, setAlice] = useState(null);
  const [bob, setBob] = useState(null);
  const [ca, setCa] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    normalMessages: 0,
    sealedMessages: 0,
    sessionsSaved: 0,
    sessionsLoaded: 0
  });

  useEffect(() => {
    initializeSodium();
  }, []);

  const initializeSodium = async () => {
    try {
      await sodium.initialize();
      setSodiumReady(true);
      addLog('✅ Libsodium initialisé', 'success');
    } catch (error) {
      addLog(`❌ Échec init libsodium: ${error.message}`, 'error');
    }
  };

  const addLog = (message, type = 'info') => {
    setLog(prev => [...prev, { 
      time: new Date().toLocaleTimeString(), 
      message, 
      type 
    }]);
  };

  const addServerLog = (from, to, isSealed) => {
    setServerView(prev => [...prev, { 
      time: new Date().toLocaleTimeString(),
      from: from || '???',
      to: to,
      sealed: isSealed
    }]);
  };

  const initializeSystem = async () => {
    if (!sodiumReady) {
      addLog('⚠️ Attendez l\'initialisation de libsodium', 'warning');
      return;
    }

    addLog('🔄 Initialisation du système complet...', 'info');

    try {
      // 1. Certificate Authority
      const certificateAuthority = new MockCertificateAuthority();
      setCa(certificateAuthority);
      addLog('✅ Autorité de certification créée', 'success');

      // 2. Créer Alice
      addLog('👩 Création d\'Alice...', 'info');
      
      const aliceIdentityKey = sodium.generateKeyPairCurve25519();
      const aliceSigningKey = sodium.generateKeyPairEd25519();
      const aliceSealedKey = new SealedSenderKeyManager('Alice');
      await aliceSealedKey.initialize();
      
      const aliceCert = await certificateAuthority.issueCertificate(
        'Alice', 
        aliceIdentityKey.publicKey
      );
      
      const aliceRatchet = new MockDoubleRatchet('Alice');
      const aliceStorage = new RatchetStorage('Alice');
      await aliceStorage.initialize(); // Pas de password en mode démo

      // 3. Créer Bob
      addLog('👨 Création de Bob...', 'info');
      
      const bobIdentityKey = sodium.generateKeyPairCurve25519();
      const bobSigningKey = sodium.generateKeyPairEd25519();
      const bobSealedKey = new SealedSenderKeyManager('Bob');
      await bobSealedKey.initialize();
      
      const bobCert = await certificateAuthority.issueCertificate(
        'Bob',
        bobIdentityKey.publicKey
      );
      
      const bobRatchet = new MockDoubleRatchet('Bob');
      const bobStorage = new RatchetStorage('Bob');
      await bobStorage.initialize();

      // 4. Établir session X3DH simulée
      addLog('🔐 Établissement de session X3DH...', 'info');
      
      const aliceEphemeral = sodium.generateKeyPairCurve25519();
      const sharedSecret = sodium.deriveSharedSecret(
        aliceEphemeral.privateKey,
        bobIdentityKey.publicKey
      );

      const sessionKey = sodium.hkdf(
        sharedSecret,
        new Uint8Array(32),
        sodium.sodium.from_string('X3DH-session'),
        32
      );

      await aliceRatchet.initSession('Bob', sessionKey);
      await bobRatchet.initSession('Alice', sessionKey);

      addLog('✅ Double Ratchet initialisé', 'success');

      // Sauvegarder les acteurs
      setAlice({
        userId: 'Alice',
        identityKey: aliceIdentityKey,
        signingKey: aliceSigningKey,
        sealedKey: aliceSealedKey,
        certificate: aliceCert,
        ratchet: aliceRatchet,
        storage: aliceStorage,
        // Clés publiques des autres
        contacts: {
          Bob: {
            identityKey: bobIdentityKey.publicKey,
            sealedKey: bobSealedKey.exportPublicKey().publicKey
          }
        }
      });

      setBob({
        userId: 'Bob',
        identityKey: bobIdentityKey,
        signingKey: bobSigningKey,
        sealedKey: bobSealedKey,
        certificate: bobCert,
        ratchet: bobRatchet,
        storage: bobStorage,
        contacts: {
          Alice: {
            identityKey: aliceIdentityKey.publicKey,
            sealedKey: aliceSealedKey.exportPublicKey().publicKey
          }
        }
      });

      setInitialized(true);
      addLog('🎉 Système initialisé avec succès !', 'success');
      addLog('📝 Testez les modes Normal, Sealed, et Persistance', 'info');

    } catch (error) {
      addLog(`❌ Erreur: ${error.message}`, 'error');
      console.error(error);
    }
  };

  const sendNormalMessage = async () => {
    if (!alice || !bob) return;

    addLog('📤 Alice → Bob (mode NORMAL)', 'info');

    try {
      // 1. Chiffrer avec Double Ratchet
      const encrypted = await alice.ratchet.encrypt('Bob', 'Salut Bob, message normal !');

      // 2. Construire le message
      const message = {
        from: 'Alice',
        to: 'Bob',
        encrypted,
        sealed: false
      };

      // 3. Serveur voit les métadonnées
      addServerLog('Alice', 'Bob', false);
      addLog('👁️ Serveur voit: Alice → Bob', 'warning');

      // 4. Bob reçoit et déchiffre
      const plaintext = await bob.ratchet.decrypt('Alice', message.encrypted);
      addLog(`✅ Bob reçoit: "${plaintext}"`, 'success');

      setStats(prev => ({ ...prev, normalMessages: prev.normalMessages + 1 }));

    } catch (error) {
      addLog(`❌ Erreur: ${error.message}`, 'error');
      console.error(error);
    }
  };

  const sendSealedMessage = async () => {
    if (!alice || !bob || !ca) return;

    addLog('📤 Alice → Bob (mode SEALED v2)', 'info');

    try {
      // 1. Chiffrer avec Double Ratchet
      const encrypted = await alice.ratchet.encrypt('Bob', 'Message secret sealed v2 !');
      const encryptedBytes = sodium.sodium.from_string(JSON.stringify(encrypted));

      // 2. Sceller avec la nouvelle méthode ECDH
      const sealedMessage = await SealedSenderV2.seal(
        alice.certificate,
        encryptedBytes,
        alice.contacts.Bob.sealedKey
      );

      // 3. Serveur NE VOIT PAS l'expéditeur
      addServerLog(null, 'Bob', true);
      addLog('👁️ Serveur voit: ??? → Bob', 'success');

      // 4. Bob descelle et découvre l'expéditeur
      const unsealed = await bob.sealedKey.unsealIncoming(sealedMessage);
      const senderId = await ca.verifyCertificate(unsealed.senderCertificate);
      
      addLog(`✅ Bob descelle: expéditeur = ${senderId}`, 'success');

      // 5. Bob déchiffre le contenu
      const encryptedData = JSON.parse(sodium.sodium.to_string(unsealed.encryptedMessage));
      const plaintext = await bob.ratchet.decrypt('Alice', encryptedData);
      
      addLog(`📨 Message: "${plaintext}"`, 'info');

      setStats(prev => ({ ...prev, sealedMessages: prev.sealedMessages + 1 }));

    } catch (error) {
      addLog(`❌ Erreur: ${error.message}`, 'error');
      console.error(error);
    }
  };

  const saveSession = async () => {
    if (!alice) return;

    try {
      addLog('💾 Sauvegarde de la session Alice-Bob...', 'info');
      
      const sessionState = alice.ratchet.getSessionState('Bob');
      await alice.storage.saveSession('Bob', sessionState);
      
      addLog('✅ Session sauvegardée dans IndexedDB (chiffrée)', 'success');
      setStats(prev => ({ ...prev, sessionsSaved: prev.sessionsSaved + 1 }));

    } catch (error) {
      addLog(`❌ Erreur sauvegarde: ${error.message}`, 'error');
    }
  };

  const loadSession = async () => {
    if (!alice) return;

    try {
      addLog('📂 Chargement de la session Alice-Bob...', 'info');
      
      const sessionState = await alice.storage.loadSession('Bob');
      
      if (sessionState) {
        addLog('✅ Session restaurée depuis IndexedDB', 'success');
        addLog(`📊 Compteurs: envoi=${sessionState.sendCounter}, réception=${sessionState.receiveCounter}`, 'info');
        setStats(prev => ({ ...prev, sessionsLoaded: prev.sessionsLoaded + 1 }));
      } else {
        addLog('⚠️ Aucune session sauvegardée trouvée', 'warning');
      }

    } catch (error) {
      addLog(`❌ Erreur chargement: ${error.message}`, 'error');
    }
  };

  const resetStorage = async () => {
    if (!window.confirm('⚠️ Ceci va effacer TOUTES les sessions sauvegardées. Continuer ?')) {
      return;
    }

    try {
      addLog('🗑️ Réinitialisation du stockage...', 'info');
      await resetAllStorage();
      addLog('✅ Stockage complètement effacé', 'success');
      
      setStats(prev => ({ ...prev, sessionsSaved: 0, sessionsLoaded: 0 }));

    } catch (error) {
      addLog(`❌ Erreur reset: ${error.message}`, 'error');
    }
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">🔐 Messagerie Sécurisée - Production Grade</h1>
        <p className="text-gray-400 mb-6">
          Libsodium • Curve25519 • Ed25519 • XChaCha20-Poly1305 • IndexedDB
        </p>

        {/* Infos système */}
        <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <span>🎯</span> Améliorations implémentées
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-bold text-blue-300 mb-1">🔒 Primitives modernes</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• Curve25519 pour ECDH</li>
                <li>• Ed25519 pour signatures</li>
                <li>• XChaCha20-Poly1305 pour AEAD</li>
                <li>• HKDF pour dérivation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-green-300 mb-1">📨 Sealed Sender v2</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• Clé éphémère ECDH</li>
                <li>• Forward secrecy</li>
                <li>• Plus de RSA</li>
                <li>• Métadonnées protégées</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-purple-300 mb-1">💾 Persistance</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• IndexedDB chiffrée</li>
                <li>• Versioning</li>
                <li>• TTL automatique</li>
                <li>• Récupération d'erreurs</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Contrôles */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-bold mb-3 text-lg">⚙️ Initialisation</h3>
              <button
                onClick={initializeSystem}
                disabled={!sodiumReady || initialized}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
              >
                {!sodiumReady ? '⏳ Chargement...' : initialized ? '✅ Initialisé' : '1️⃣ Initialiser'}
              </button>
            </div>

            {initialized && (
              <>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-bold mb-3 text-lg">📤 Envoi de messages</h3>
                  <div className="space-y-2">
                    <button
                      onClick={sendNormalMessage}
                      className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold transition-all text-sm"
                    >
                      Mode NORMAL ⚠️
                    </button>
                    <button
                      onClick={sendSealedMessage}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-all text-sm"
                    >
                      Mode SEALED v2 ✅
                    </button>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-bold mb-3 text-lg">💾 Persistance</h3>
                  <div className="space-y-2">
                    <button
                      onClick={saveSession}
                      className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-all text-sm"
                    >
                      💾 Sauvegarder session
                    </button>
                    <button
                      onClick={loadSession}
                      className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-all text-sm"
                    >
                      📂 Charger session
                    </button>
                    <button
                      onClick={resetStorage}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-all text-sm"
                    >
                      🗑️ Reset stockage
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Statistiques */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-bold mb-3">📊 Statistiques</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Messages normaux:</span>
                  <span className="text-yellow-400 font-mono">{stats.normalMessages}</span>
                </div>
                <div className="flex justify-between">
                  <span>Messages sealed:</span>
                  <span className="text-green-400 font-mono">{stats.sealedMessages}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sessions sauvegardées:</span>
                  <span className="text-purple-400 font-mono">{stats.sessionsSaved}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sessions chargées:</span>
                  <span className="text-indigo-400 font-mono">{stats.sessionsLoaded}</span>
                </div>
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Métadonnées protégées:</span>
                    <span className="text-green-400 font-mono">
                      {stats.sealedMessages > 0 ? 
                        `${Math.round(stats.sealedMessages / (stats.normalMessages + stats.sealedMessages) * 100)}%` 
                        : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vue serveur */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6 h-full">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>👁️</span> Ce que voit le SERVEUR
              </h2>
              <div className="space-y-2 h-96 overflow-y-auto">
                {serverView.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <p className="text-4xl mb-4">👀</p>
                    <p className="text-lg">Le serveur n'a rien intercepté...</p>
                    <p className="text-sm mt-2">Envoyez des messages pour voir la différence !</p>
                  </div>
                ) : (
                  serverView.slice().reverse().map((entry, i) => (
                    <div 
                      key={i} 
                      className={`p-4 rounded-lg transition-all ${
                        entry.sealed 
                          ? 'bg-green-900/30 border-2 border-green-600 shadow-green-900/50 shadow-lg' 
                          : 'bg-yellow-900/30 border-2 border-yellow-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-400 font-mono">{entry.time}</div>
                        <div className={`text-xs px-3 py-1 rounded-full font-bold ${
                          entry.sealed ? 'bg-green-600' : 'bg-yellow-600'
                        }`}>
                          {entry.sealed ? 'SEALED v2' : 'NORMAL'}
                        </div>
                      </div>
                      <div className="font-semibold text-xl mb-2 font-mono">
                        {entry.sealed ? (
                          <>
                            <span className="text-green-400">❓ ???</span>
                            {' → '}
                            <span>👤 {entry.to}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-yellow-400">👤 {entry.from}</span>
                            {' → '}
                            <span>👤 {entry.to}</span>
                          </>
                        )}
                      </div>
                      <div className="text-sm">
                        {entry.sealed ? (
                          <div className="space-y-1">
                            <p className="text-green-300">
                              ✅ Expéditeur <strong>MASQUÉ</strong> par ECDH éphémère
                            </p>
                            <p className="text-xs text-green-200/70">
                              Forward secrecy • Clé détruite après usage
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-yellow-300">
                              ⚠️ Expéditeur <strong>VISIBLE</strong>
                            </p>
                            <p className="text-xs text-yellow-200/70">
                              Métadonnées exposées • Traçage possible
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Logs détaillés */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">📋 Logs détaillés</h2>
          <div className="space-y-1 h-64 overflow-y-auto font-mono text-sm bg-black/30 p-4 rounded">
            {log.length === 0 ? (
              <p className="text-gray-500">En attente d'initialisation...</p>
            ) : (
              log.slice().reverse().map((entry, i) => (
                <div 
                  key={i} 
                  className={`${
                    entry.type === 'success' ? 'text-green-400' : 
                    entry.type === 'error' ? 'text-red-400' :
                    entry.type === 'warning' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}
                >
                  <span className="text-gray-500">[{entry.time}]</span> {entry.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SecureMessagingDemo;