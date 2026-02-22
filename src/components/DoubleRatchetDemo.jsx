import React, { useState, useEffect } from 'react';
import { DHRatchet, RatchetStorage } from '../crypto/DHRatchet';
import { X3DHKeyBundle, X3DHInitiator, X3DHResponder } from '../crypto/X3DH';
import { Send, RefreshCcw, Database, Activity, User, MessageSquare, CheckCircle2, ArrowRight, Lock, Unlock, AlertCircle, Key, Shield, Eye, EyeOff } from 'lucide-react';

function DoubleRatchetDemo() {
  const [log, setLog] = useState([]);
  const [ousmane, setOusmane] = useState(null);
  const [evariste, setEvariste] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [ousmaneMessage, setOusmaneMessage] = useState('');
  const [evaristeMessage, setEvaristeMessage] = useState('');
  
  // Historique complet des messages (envoyés + reçus)
  const [allMessages, setAllMessages] = useState([]);
  const [compromisedMessages, setCompromisedMessages] = useState(new Set());
  
  // Mode PFS Demo
  const [showPFSMode, setShowPFSMode] = useState(true);
  const [showMessageKeys, setShowMessageKeys] = useState(false);
  
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
        
        const savedState = await storage.loadRatchetState('ousmane-evariste-session');
        if (savedState) {
          addLog(`📂 Session sauvegardée trouvée`, "info");
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
      addLog("👨‍💻 Création d'Ousmane...");
      const ousmaneIdentity = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
      );

      addLog("👨‍🔬 Création d'Évariste...");
      const evaristeBundle = await new X3DHKeyBundle().generate();

      addLog("🔐 Établissement X3DH...");
      const evaristePublicBundle = await evaristeBundle.exportPublicBundle();
      
      const ousmaneInitiator = new X3DHInitiator(ousmaneIdentity);
      const { sharedSecret: ousmaneShared, ephemeralPublicKey, usedOPKId } = 
        await ousmaneInitiator.deriveSharedSecret(evaristePublicBundle);

      const evaristeResponder = new X3DHResponder(evaristeBundle);
      const ousmaneIKPublic = await crypto.subtle.exportKey("jwk", ousmaneIdentity.publicKey);
      const evaristeShared = await evaristeResponder.deriveSharedSecret(
        ousmaneIKPublic, 
        ephemeralPublicKey,
        usedOPKId
      );

      const ousmaneSharedArray = new Uint8Array(ousmaneShared);
      const evaristeSharedArray = new Uint8Array(evaristeShared);
      const secretsMatch = ousmaneSharedArray.every((val, i) => val === evaristeSharedArray[i]);
      
      if (!secretsMatch) {
        throw new Error("Les secrets partagés X3DH ne correspondent pas !");
      }
      addLog("✅ Secrets X3DH identiques vérifiés");

      addLog("🔗 Création des Double Ratchets...");
      
      const evaristeDH = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
      );

      const ousmaneRatchet = new DHRatchet(ousmaneShared, true, {
        storage: storage,
        sessionId: 'ousmane-evariste-session',
        autoSave: true
      });
      
      const ousmaneDH = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
      );
      await ousmaneRatchet.initialize(ousmaneDH, evaristeDH.publicKey);
      
      const evaristeRatchet = new DHRatchet(evaristeShared, false, {
        storage: storage,
        sessionId: 'evariste-ousmane-session',
        autoSave: true
      });
      await evaristeRatchet.initialize(evaristeDH, null);

      setOusmane({ ratchet: ousmaneRatchet, name: 'Ousmane' });
      setEvariste({ ratchet: evaristeRatchet, name: 'Évariste' });
      setInitialized(true);
      setAllMessages([]);
      setCompromisedMessages(new Set());

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
      
      const ousmaneRatchet = await DHRatchet.restore('ousmane-evariste-session', storage);
      ousmaneRatchet.autoSave = true;
      
      const evaristeRatchet = await DHRatchet.restore('evariste-ousmane-session', storage);
      evaristeRatchet.autoSave = true;
      
      setOusmane({ ratchet: ousmaneRatchet, name: 'Ousmane' });
      setEvariste({ ratchet: evaristeRatchet, name: 'Évariste' });
      setInitialized(true);
      
      addLog(`✅ Session restaurée !`, "success");
      
      await loadStorageStats();
      
    } catch (error) {
      addLog(`❌ Impossible de restaurer: ${error.message}`, "error");
      addLog("💡 Créez une nouvelle session avec 'Initialiser'", "info");
    }
  };

  const sendMessage = async (sender, receiver, messageText) => {
    if (!messageText.trim()) return;

    try {
      addLog(`📤 ${sender.name} envoie: "${messageText}"`);
      const encrypted = await sender.ratchet.encrypt(messageText);
      
      // Extraire la clé de chiffrement pour la démonstration PFS
      const messageKey = {
        messageNumber: encrypted.messageNumber,
        sequenceNumber: encrypted.sequenceNumber,
        // Simuler une "empreinte" de clé pour la démo
        keyFingerprint: `K_${encrypted.messageNumber}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      };
      
      addLog(`🔐 Message chiffré (${encrypted.ciphertext.byteLength} bytes)`);

      const decrypted = await receiver.ratchet.decrypt(encrypted);
      addLog(`✅ ${receiver.name} reçoit: "${decrypted}"`, "success");

      // Ajouter au journal complet
      const newMessage = {
        id: Date.now() + Math.random(),
        from: sender.name,
        to: receiver.name,
        text: messageText,
        time: new Date().toLocaleTimeString(),
        timestamp: Date.now(),
        encrypted: encrypted,
        keyInfo: messageKey,
        isCompromised: false
      };

      setAllMessages(prev => [...prev, newMessage]);
      await loadStorageStats();

    } catch (error) {
      addLog(`❌ Erreur: ${error.message}`, "error");
      console.error(error);
    }
  };

  const sendOusmaneMessage = async () => {
    if (!ousmane || !evariste || !ousmaneMessage.trim()) return;
    await sendMessage(ousmane, evariste, ousmaneMessage);
    setOusmaneMessage('');
  };

  const sendEvaristeMessage = async () => {
    if (!ousmane || !evariste || !evaristeMessage.trim()) return;
    await sendMessage(evariste, ousmane, evaristeMessage);
    setEvaristeMessage('');
  };

  const compromiseMessage = (messageId) => {
    setCompromisedMessages(prev => {
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });
    addLog(`⚠️ Clé compromise ! Avec PFS, seul CE message est exposé`, "warning");
  };

  const showStorageStats = async () => {
    try {
      addLog("📊 Chargement des statistiques...", "info");
      const stats = await loadStorageStats();
      if (stats) {
        addLog(`📦 Sessions: ${stats.totalSessions}, Messages: ${stats.totalMessages}`, "info");
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
      const deleted = await storage.cleanupOldSessions(30);
      
      if (deleted > 0) {
        addLog(`🗑️ ${deleted} session(s) supprimée(s)`, "success");
      } else {
        addLog(`ℹ️ Aucune session ancienne`, "info");
      }
      
      await loadStorageStats();
      
    } catch (error) {
      addLog(`❌ Erreur nettoyage: ${error.message}`, "error");
    }
  };

  const reset = async () => {
    try {
      if (storage && storageReady) {
        await storage.deleteRatchetState('ousmane-evariste-session');
        await storage.deleteRatchetState('evariste-ousmane-session');
        addLog("🗑️ Sessions supprimées", "info");
      }
    } catch (error) {
      console.error('Erreur reset:', error);
    }
    
    setOusmane(null);
    setEvariste(null);
    setInitialized(false);
    setLog([]);
    setAllMessages([]);
    setCompromisedMessages(new Set());
    setOusmaneMessage('');
    setEvaristeMessage('');
    setStorageStats(null);
  };

  // Filtrer les messages par participant
  const getMessagesFor = (participantName) => {
    return allMessages.filter(msg => 
      msg.from === participantName || msg.to === participantName
    );
  };

  const compromisedCount = compromisedMessages.size;
  const protectedCount = allMessages.length - compromisedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8 text-white">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            🔐 Double Ratchet Protocol + PFS Demo
          </h1>
          <p className="text-slate-400 text-sm md:text-lg">
            X3DH + Symmetric Ratchet + DH Ratchet + Perfect Forward Secrecy
          </p>
        </div>

        {/* CONTEXTE + PFS MODE TOGGLE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-orange-900/30 border-2 border-orange-500/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇧🇫</span>
              <div className="flex-1">
                <h2 className="text-orange-400 font-bold text-sm mb-1">
                  Double Ratchet Protocol - Contexte Académique
                </h2>
                <p className="text-xs text-gray-300">
                  Protocole utilisé par Signal et WhatsApp pour garantir Perfect Forward Secrecy
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-900/30 border border-green-500/50 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="font-bold text-green-400 text-sm">Mode PFS Demo</span>
              </div>
              <button
                onClick={() => setShowMessageKeys(!showMessageKeys)}
                className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
              >
                {showMessageKeys ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showMessageKeys ? 'Masquer clés' : 'Voir clés'}
              </button>
            </div>
            <p className="text-xs text-gray-300 mt-2">
              Chaque message = clé unique. Compromission d'une clé = 1 seul message exposé
            </p>
          </div>
        </div>

        {/* STATS PFS */}
        {compromisedCount > 0 && (
          <div className="bg-gradient-to-r from-red-500/10 to-green-500/10 border-2 border-yellow-500/50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-black text-white">{allMessages.length}</p>
                <p className="text-xs text-slate-400">Messages total</p>
              </div>
              <div>
                <p className="text-3xl font-black text-green-400">{protectedCount}</p>
                <p className="text-xs text-slate-400">Protégés (PFS)</p>
              </div>
              <div>
                <p className="text-3xl font-black text-red-400">{compromisedCount}</p>
                <p className="text-xs text-slate-400">Exposés</p>
              </div>
            </div>
            <div className="mt-3 text-center">
              <p className="font-bold text-green-400 text-sm">
                Impact limité : {allMessages.length > 0 ? Math.round((compromisedCount/allMessages.length)*100) : 0}% exposés grâce au PFS
              </p>
            </div>
          </div>
        )}

        {/* STORAGE STATS */}
        {storageStats && (
          <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              📊 Statistiques IndexedDB
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-purple-950/50 p-3 rounded-xl text-center">
                <div className="text-2xl font-black text-purple-400">{storageStats.totalSessions}</div>
                <div className="text-[10px] text-slate-400 mt-1">Sessions</div>
              </div>
              <div className="bg-purple-950/50 p-3 rounded-xl text-center">
                <div className="text-2xl font-black text-purple-400">{storageStats.activeSessions}</div>
                <div className="text-[10px] text-slate-400 mt-1">Actives</div>
              </div>
              <div className="bg-purple-950/50 p-3 rounded-xl text-center">
                <div className="text-2xl font-black text-purple-400">{storageStats.totalMessages}</div>
                <div className="text-[10px] text-slate-400 mt-1">Messages</div>
              </div>
            </div>
          </div>
        )}

        {/* CONTROLS */}
        <div className="flex gap-3 mb-6 flex-wrap justify-center text-sm">
          {!initialized ? (
            <>
              <button
                onClick={initialize}
                disabled={!storageReady}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Nouvelle Session
              </button>
              <button
                onClick={restoreSession}
                disabled={!storageReady}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                Restaurer
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={reset} 
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Reset
              </button>
              <button 
                onClick={showStorageStats}
                disabled={!storageReady}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:from-gray-600 disabled:to-gray-600 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                Stats
              </button>
              <button 
                onClick={cleanupOldSessions}
                disabled={!storageReady}
                className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 disabled:from-gray-600 disabled:to-gray-600 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Nettoyer
              </button>
            </>
          )}
        </div>

        {/* MAIN CHAT INTERFACE - 2 COLONNES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          
          {/* OUSMANE PANEL */}
          <ParticipantPanel
            participant={ousmane}
            name="Ousmane"
            color="blue"
            message={ousmaneMessage}
            setMessage={setOusmaneMessage}
            onSend={sendOusmaneMessage}
            messages={getMessagesFor('Ousmane')}
            initialized={initialized}
            compromisedMessages={compromisedMessages}
            onCompromise={compromiseMessage}
            showMessageKeys={showMessageKeys}
          />

          {/* ÉVARISTE PANEL */}
          <ParticipantPanel
            participant={evariste}
            name="Évariste"
            color="purple"
            message={evaristeMessage}
            setMessage={setEvaristeMessage}
            onSend={sendEvaristeMessage}
            messages={getMessagesFor('Évariste')}
            initialized={initialized}
            compromisedMessages={compromisedMessages}
            onCompromise={compromiseMessage}
            showMessageKeys={showMessageKeys}
          />
        </div>

        {/* LOGS TECHNIQUES */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border-2 border-slate-700 p-4">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400" />
            📋 Logs techniques
          </h2>
          <div className="space-y-1 h-48 overflow-y-auto font-mono text-xs bg-black/30 p-3 rounded-xl">
            {log.length === 0 ? (
              <p className="text-slate-500">Cliquez sur "Nouvelle Session"...</p>
            ) : (
              log.map((entry, i) => (
                <div 
                  key={i} 
                  className={`${
                    entry.type === 'success' ? 'text-green-400' : 
                    entry.type === 'error' ? 'text-red-400' : 
                    entry.type === 'warning' ? 'text-yellow-400' : 
                    'text-slate-300'
                  }`}
                >
                  [{entry.time}] {entry.message}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Composant pour chaque participant
function ParticipantPanel({ 
  participant, 
  name, 
  color, 
  message, 
  setMessage, 
  onSend, 
  messages, 
  initialized,
  compromisedMessages,
  onCompromise,
  showMessageKeys
}) {
  const colorClasses = {
    blue: {
      border: 'border-blue-500/50',
      bg: 'from-blue-900/20 to-blue-950/10',
      iconBg: 'bg-blue-500/20 border-blue-500/50',
      iconColor: 'text-blue-400',
      inputBorder: 'border-blue-500/30 focus:border-blue-500',
      inputRing: 'focus:ring-blue-500/20',
      button: 'from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400',
      badge: 'bg-blue-500/30 text-blue-300',
      sent: 'bg-blue-900/30 border-blue-500',
      received: 'bg-green-900/30 border-green-500'
    },
    purple: {
      border: 'border-purple-500/50',
      bg: 'from-purple-900/20 to-purple-950/10',
      iconBg: 'bg-purple-500/20 border-purple-500/50',
      iconColor: 'text-purple-400',
      inputBorder: 'border-purple-500/30 focus:border-purple-500',
      inputRing: 'focus:ring-purple-500/20',
      button: 'from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400',
      badge: 'bg-purple-500/30 text-purple-300',
      sent: 'bg-purple-900/30 border-purple-500',
      received: 'bg-green-900/30 border-green-500'
    }
  };

  const colors = colorClasses[color];

  return (
    <div className={`bg-gradient-to-br ${colors.bg} rounded-2xl border-2 ${colors.border} p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 ${colors.iconBg} rounded-full border-2`}>
            <User className={`w-6 h-6 ${colors.iconColor}`} />
          </div>
          <div>
            <h2 className={`text-xl font-black ${colors.iconColor}`}>{name}</h2>
            {participant && (
              <span className={`text-xs ${colors.badge} px-2 py-0.5 rounded font-bold`}>
                {participant.ratchet.messagesSent} envoyés
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Message Input */}
      {initialized && (
        <div className="space-y-2">
          <label className="text-xs text-slate-400 uppercase font-bold">
            Envoyer à {name === 'Ousmane' ? 'Évariste' : 'Ousmane'}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())}
            placeholder="Écrivez..."
            className={`w-full px-3 py-2 bg-slate-950/70 border-2 ${colors.inputBorder} ${colors.inputRing} rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 resize-none transition-all text-sm`}
            rows="2"
          />
          <button 
            onClick={onSend} 
            disabled={!message.trim()} 
            className={`w-full px-3 py-2 bg-gradient-to-r ${colors.button} disabled:from-gray-700 disabled:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 text-sm`}
          >
            <Send className="w-4 h-4" />
            Envoyer (Double Ratchet)
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
          <MessageSquare className="w-3 h-3" />
          Historique ({messages.length})
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto bg-black/20 p-2 rounded-xl border border-slate-700/50">
          {messages.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-6">Aucun message</p>
          ) : (
            messages.map((msg) => {
              const isSent = msg.from === name;
              const isCompromised = compromisedMessages.has(msg.id);
              const borderColor = isCompromised ? 'border-red-500' : (isSent ? colors.sent : colors.received);
              
              return (
                <div 
                  key={msg.id} 
                  className={`${isCompromised ? 'bg-red-900/20' : 'bg-slate-900/50'} border-l-4 ${borderColor} p-2 rounded-lg transition-all`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold flex items-center gap-1">
                      {isSent ? (
                        <>
                          <span className={colors.iconColor}>Envoyé à {msg.to}</span>
                          {isCompromised && <Unlock className="w-3 h-3 text-red-400" />}
                          {!isCompromised && <Lock className="w-3 h-3 text-green-400" />}
                        </>
                      ) : (
                        <>
                          <span className="text-green-400">Reçu de {msg.from}</span>
                          {isCompromised && <Unlock className="w-3 h-3 text-red-400" />}
                          {!isCompromised && <Lock className="w-3 h-3 text-green-400" />}
                        </>
                      )}
                    </span>
                    <span className="text-[9px] text-slate-500">{msg.time}</span>
                  </div>
                  <p className={`text-xs ${isCompromised ? 'text-red-300' : 'text-slate-200'} mb-2`}>
                    {msg.text}
                  </p>
                  
                  {showMessageKeys && (
                    <div className={`p-2 rounded ${isCompromised ? 'bg-red-950/30 border border-red-500/30' : 'bg-slate-950/50 border border-slate-700'} mb-2`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                          <Key className="w-2 h-2" />
                          Clé éphémère #{msg.keyInfo.messageNumber}
                        </span>
                      </div>
                      <p className={`font-mono text-[9px] ${isCompromised ? 'text-red-400' : 'text-green-400'}`}>
                        {msg.keyInfo.keyFingerprint}
                      </p>
                    </div>
                  )}

                  {!isCompromised && isSent && (
                    <button
                      onClick={() => onCompromise(msg.id)}
                      className="w-full px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-red-400 text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Unlock className="w-3 h-3" />
                      Compromettre cette clé (démo PFS)
                    </button>
                  )}

                  {isCompromised && (
                    <div className="bg-red-950/50 p-2 rounded border-l-2 border-red-500">
                      <p className="text-[10px] text-red-300 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Clé compromise !</strong> Avec PFS, seul CE message est exposé. 
                          Les {messages.length - 1} autres restent protégés.
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default DoubleRatchetDemo;