import React, { useState, useEffect } from 'react';
import { DHRatchet, RatchetStorage } from '../crypto/DHRatchet';
import { X3DHKeyBundle, X3DHInitiator, X3DHResponder } from '../crypto/X3DH';

function DoubleRatchetDemo() {
  const [log, setLog] = useState([]);
  const [alice, setAlice] = useState(null);
  const [bob, setBob] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [aliceMessage, setAliceMessage] = useState('');
  const [bobMessage, setBobMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  
  const [storage] = useState(() => new RatchetStorage());
  const [storageReady, setStorageReady] = useState(false);
  const [storageStats, setStorageStats] = useState(null);

  const addLog = (message, type = 'info') => {
    setLog(prev => [...prev, { 
      time: new Date().toLocaleTimeString(), 
      message, 
      type 
    }]);
  };

  useEffect(() => {
    const initStorage = async () => {
      try {
        await storage.init();
        setStorageReady(true);
        addLog("💾 Stockage IndexedDB initialisé", "success");
        
        const savedState = await storage.loadRatchetState('alice-bob-session');
        if (savedState) {
          addLog(`📂 Session sauvegardée trouvée (${savedState.messagesSent + savedState.messagesReceived} messages)`, "info");
        }
      } catch (error) {
        console.error('Erreur init storage:', error);
        addLog(`❌ Erreur initialisation storage: ${error.message}`, "error");
      }
    };
    
    initStorage();
    
    return () => {
      storage.close();
    };
  }, [storage]);

  const loadStorageStats = async () => {
    if (!storageReady) return;

    try {
      const stats = await storage.getStorageStats();
      setStorageStats(stats);
      return stats;
    } catch (error) {
      console.error('❌ Erreur stats:', error);
      return null;
    }
  };

  const initialize = async () => {
    if (!storageReady) {
      addLog("⏳ Attendez l'initialisation du storage...", "warning");
      return;
    }

    addLog("🔄 Initialisation du Double Ratchet...");

    try {
      addLog("👩 Création d'Alice...");
      const aliceIdentity = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
      );

      addLog("👨 Création de Bob...");
      const bobBundle = await new X3DHKeyBundle().generate();

      addLog("🔐 Établissement X3DH...");
      const bobPublicBundle = await bobBundle.exportPublicBundle();
      
      const aliceInitiator = new X3DHInitiator(aliceIdentity);
      const { sharedSecret: aliceShared, ephemeralPublicKey, usedOPKId } = 
        await aliceInitiator.deriveSharedSecret(bobPublicBundle);

      const bobResponder = new X3DHResponder(bobBundle);
      const aliceIKPublic = await crypto.subtle.exportKey("jwk", aliceIdentity.publicKey);
      const bobShared = await bobResponder.deriveSharedSecret(
        aliceIKPublic, 
        ephemeralPublicKey,
        usedOPKId
      );

      const aliceSharedArray = new Uint8Array(aliceShared);
      const bobSharedArray = new Uint8Array(bobShared);
      const secretsMatch = aliceSharedArray.every((val, i) => val === bobSharedArray[i]);
      
      if (!secretsMatch) {
        throw new Error("Les secrets partagés X3DH ne correspondent pas !");
      }
      addLog("✅ Secrets X3DH identiques vérifiés");

      addLog("🔗 Création des Double Ratchets...");
      
      const bobDH = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
      );

      const aliceRatchet = new DHRatchet(aliceShared, true, {
        storage: storage,
        sessionId: 'alice-bob-session',
        autoSave: true
      });
      
      const aliceDH = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
      );
      await aliceRatchet.initialize(aliceDH, bobDH.publicKey);
      
      const bobRatchet = new DHRatchet(bobShared, false, {
        storage: storage,
        sessionId: 'bob-alice-session',
        autoSave: true
      });
      await bobRatchet.initialize(bobDH, null);

      setAlice({ ratchet: aliceRatchet, name: 'Alice' });
      setBob({ ratchet: bobRatchet, name: 'Bob' });
      setInitialized(true);

      addLog("✅ Double Ratchet initialisé avec succès !", "success");
      addLog("💾 Sauvegarde automatique activée", "success");

      await loadStorageStats();

    } catch (error) {
      addLog(`❌ Erreur: ${error.message}`, "error");
      console.error(error);
    }
  };

  const restoreSession = async () => {
    if (!storageReady) {
      addLog("⏳ Attendez l'initialisation du storage...", "warning");
      return;
    }

    try {
      addLog("📂 Restauration de la session...");
      
      const aliceRatchet = await DHRatchet.restore('alice-bob-session', storage);
      aliceRatchet.autoSave = true;
      
      const bobRatchet = await DHRatchet.restore('bob-alice-session', storage);
      bobRatchet.autoSave = true;
      
      setAlice({ ratchet: aliceRatchet, name: 'Alice' });
      setBob({ ratchet: bobRatchet, name: 'Bob' });
      setInitialized(true);
      
      addLog(`✅ Session restaurée ! (Alice: ${aliceRatchet.messagesSent} envoyés, Bob: ${bobRatchet.messagesSent} envoyés)`, "success");
      
      await loadStorageStats();
      
    } catch (error) {
      addLog(`❌ Impossible de restaurer: ${error.message}`, "error");
      addLog("💡 Créez une nouvelle session avec 'Initialiser'", "info");
    }
  };

  const sendMessage = async (sender, receiver, message) => {
    if (!message.trim()) return;

    try {
      addLog(`📤 ${sender.name} envoie: "${message}"`);
      const encrypted = await sender.ratchet.encrypt(message);
      addLog(`🔐 Message chiffré (${encrypted.ciphertext.byteLength} bytes)`);

      const decrypted = await receiver.ratchet.decrypt(encrypted);
      addLog(`✅ ${receiver.name} reçoit: "${decrypted}"`, "success");

      setConversation(prev => [...prev, {
        from: sender.name,
        to: receiver.name,
        message: message,
        time: new Date().toLocaleTimeString()
      }]);

      await loadStorageStats();

    } catch (error) {
      addLog(`❌ Erreur: ${error.message}`, "error");
      console.error(error);
    }
  };

  const sendAliceMessage = async () => {
    if (!alice || !bob || !aliceMessage.trim()) return;
    await sendMessage(alice, bob, aliceMessage);
    setAliceMessage('');
  };

  const sendBobMessage = async () => {
    if (!alice || !bob || !bobMessage.trim()) return;
    await sendMessage(bob, alice, bobMessage);
    setBobMessage('');
  };

  const showStorageStats = async () => {
    try {
      addLog("📊 Chargement des statistiques...", "info");
      
      const stats = await loadStorageStats();
      
      if (stats) {
        addLog(`📦 Sessions totales: ${stats.totalSessions}`, "info");
        addLog(`✅ Sessions actives: ${stats.activeSessions}`, "info");
        addLog(`💬 Total messages: ${stats.totalMessages}`, "info");
      } else {
        addLog("⚠️ Aucune statistique disponible", "warning");
      }
    } catch (error) {
      addLog(`❌ Erreur affichage stats: ${error.message}`, "error");
    }
  };

  const cleanupOldSessions = async () => {
    if (!storageReady) {
      addLog("⏳ Storage pas encore initialisé", "warning");
      return;
    }

    try {
      addLog("🧹 Nettoyage des anciennes sessions...", "info");
      
      const statsBefore = await storage.getStorageStats();
      addLog(`📊 Sessions avant: ${statsBefore.totalSessions}`, "info");
      
      const deleted = await storage.cleanupOldSessions(30);
      
      if (deleted > 0) {
        addLog(`🗑️ ${deleted} session(s) supprimée(s)`, "success");
      } else {
        addLog(`ℹ️ Aucune session ancienne (toutes récentes)`, "info");
      }
      
      await loadStorageStats();
      
    } catch (error) {
      addLog(`❌ Erreur nettoyage: ${error.message}`, "error");
    }
  };

  const reset = async () => {
    try {
      if (storage && storageReady) {
        await storage.deleteRatchetState('alice-bob-session');
        await storage.deleteRatchetState('bob-alice-session');
        addLog("🗑️ Sessions supprimées", "info");
      }
    } catch (error) {
      console.error('Erreur reset:', error);
    }
    
    setAlice(null);
    setBob(null);
    setInitialized(false);
    setLog([]);
    setConversation([]);
    setAliceMessage('');
    setBobMessage('');
    setStorageStats(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-white">
      <div className="max-w-7xl mx-auto">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">🔐 Double Ratchet Protocol</h1>
          <p className="text-slate-400">X3DH + Symmetric Ratchet + DH Ratchet + 💾 Persistance</p>
        </div>

        <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">🎯 Démo :</h2>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• <strong>X3DH :</strong> Établissement initial sécurisé</li>
            <li>• <strong>Symmetric Ratchet :</strong> Dérivation des clés de messages</li>
            <li>• <strong>DH Ratchet :</strong> Renouvellement des clés</li>
            <li>• <strong>Perfect Forward Secrecy :</strong> Compromission = 1 message exposé</li>
            <li>• <strong>🆕 Persistance :</strong> Sauvegarde automatique IndexedDB</li>
          </ul>
        </div>

        {storageStats && (
          <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-2">📊 Statistiques du Storage :</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-purple-950/50 p-3 rounded">
                <div className="text-purple-400 text-xs">Sessions totales</div>
                <div className="text-2xl font-bold">{storageStats.totalSessions}</div>
              </div>
              <div className="bg-purple-950/50 p-3 rounded">
                <div className="text-purple-400 text-xs">Sessions actives</div>
                <div className="text-2xl font-bold">{storageStats.activeSessions}</div>
              </div>
              <div className="bg-purple-950/50 p-3 rounded">
                <div className="text-purple-400 text-xs">Messages totaux</div>
                <div className="text-2xl font-bold">{storageStats.totalMessages}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-6 flex-wrap">
          {!initialized ? (
            <>
              <button
                onClick={initialize}
                disabled={!storageReady}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
              >
                1️⃣ Nouvelle Session
              </button>
              <button
                onClick={restoreSession}
                disabled={!storageReady}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
              >
                📂 Restaurer Session
              </button>
            </>
          ) : (
            <>
              <button onClick={reset} className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-all">
                🔄 Réinitialiser
              </button>
              <button 
                onClick={showStorageStats}
                disabled={!storageReady}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-semibold transition-all"
              >
                📊 Statistiques
              </button>
              <button 
                onClick={cleanupOldSessions}
                disabled={!storageReady}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded-lg font-semibold transition-all"
              >
                🧹 Nettoyer
              </button>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800 rounded-lg p-6 border-2 border-blue-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              👩 Alice
              {alice && <span className="text-xs bg-green-500 px-2 py-1 rounded">Sent: {alice.ratchet.messagesSent}</span>}
            </h2>
            {initialized && (
              <div className="space-y-4">
                <textarea
                  value={aliceMessage}
                  onChange={(e) => setAliceMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendAliceMessage())}
                  placeholder="Message pour Bob..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white resize-none focus:outline-none focus:border-blue-500"
                  rows="3"
                />
                <button onClick={sendAliceMessage} disabled={!aliceMessage.trim()} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all">
                  📤 Envoyer à Bob
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border-2 border-green-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              👨 Bob
              {bob && <span className="text-xs bg-green-500 px-2 py-1 rounded">Sent: {bob.ratchet.messagesSent}</span>}
            </h2>
            {initialized && (
              <div className="space-y-4">
                <textarea
                  value={bobMessage}
                  onChange={(e) => setBobMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendBobMessage())}
                  placeholder="Message pour Alice..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white resize-none focus:outline-none focus:border-green-500"
                  rows="3"
                />
                <button onClick={sendBobMessage} disabled={!bobMessage.trim()} className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all">
                  📤 Envoyer à Alice
                </button>
              </div>
            )}
          </div>
        </div>

        {conversation.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">💬 Conversation</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {conversation.map((msg, i) => (
                <div key={i} className={`p-3 rounded-lg ${msg.from === 'Alice' ? 'bg-blue-900/30 border-l-4 border-blue-500' : 'bg-green-900/30 border-l-4 border-green-500'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold">{msg.from} → {msg.to}</span>
                    <span className="text-xs text-slate-500">{msg.time}</span>
                  </div>
                  <p className="text-slate-200">{msg.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">📋 Logs techniques</h2>
          <div className="space-y-1 h-64 overflow-y-auto font-mono text-sm">
            {log.length === 0 ? (
              <p className="text-slate-500">Cliquez sur "Nouvelle Session" ou "Restaurer Session"...</p>
            ) : (
              log.map((entry, i) => (
                <div key={i} className={`${entry.type === 'success' ? 'text-green-400' : entry.type === 'error' ? 'text-red-400' : entry.type === 'warning' ? 'text-yellow-400' : 'text-slate-300'}`}>
                  {entry.time}: {entry.message}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default DoubleRatchetDemo;