import React, { useState } from 'react';
import { Key, RefreshCcw, ShieldCheck, Zap, Lock, Unlock, MessageSquare, Send, Trash2, AlertCircle, CheckCircle2, User, Smartphone, BookOpen, X, Shield, ShieldOff } from 'lucide-react';

const PFSDemo = () => {
  const [usePFS, setUsePFS] = useState(true);
  const [messages, setMessages] = useState([]);
  const [currentKey, setCurrentKey] = useState("K_init_7F2A");
  const [permanentKey] = useState("K_PERMANENT_ABC123");
  const [compromisedKeyIndex, setCompromisedKeyIndex] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [showConclusion, setShowConclusion] = useState(false);

  const generateKey = () => {
    return "K_" + Math.random().toString(36).substring(2, 6).toUpperCase() + 
           "_" + Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  const sendMessage = () => {
    const messageText = messageInput.trim() || `Message #${messages.length + 1}`;
    const newKey = usePFS ? generateKey() : permanentKey;
    const newMessage = {
      id: messages.length + 1,
      text: messageText,
      key: usePFS ? currentKey : permanentKey,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      isCompromised: false
    };
    
    setMessages(prev => [...prev, newMessage]);
    if (usePFS) {
      setCurrentKey(newKey);
    }
    setMessageInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const compromiseKey = (index) => {
    setCompromisedKeyIndex(index);
  };

  const reset = () => {
    setMessages([]);
    setCurrentKey("K_init_7F2A");
    setCompromisedKeyIndex(null);
    setMessageInput("");
  };

  const togglePFS = () => {
    reset();
    setUsePFS(!usePFS);
  };

  const compromisedCount = compromisedKeyIndex !== null 
    ? (usePFS ? 1 : messages.length) 
    : 0;
  const protectedCount = messages.length - compromisedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;700;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
        
        .pfs-chat * {
          font-family: 'IBM Plex Mono', monospace;
        }
        
        .pfs-chat h1, h2, h3, h4 {
          font-family: 'Exo 2', sans-serif;
        }

        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes slide-in-message {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes key-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @keyframes compromise-flash {
          0%, 100% { background-color: rgba(239, 68, 68, 0.1); }
          50% { background-color: rgba(239, 68, 68, 0.3); }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .rotate-slow {
          animation: rotate-slow 3s linear infinite;
        }

        .message-slide-in {
          animation: slide-in-message 0.4s ease-out;
        }

        .key-pulse {
          animation: key-pulse 2s ease-in-out infinite;
        }

        .compromised-flash {
          animation: compromise-flash 1s ease-in-out infinite;
        }

        .slide-up {
          animation: slide-up 0.3s ease-out;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}</style>

      <div className="pfs-chat max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
              <RefreshCcw className="text-blue-400 w-10 h-10 rotate-slow" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight">
                Perfect Forward Secrecy
              </h1>
              <p className="text-blue-400 text-sm uppercase tracking-widest font-bold">
                Double Ratchet Algorithm • Démonstration Interactive
              </p>
            </div>
          </div>
          <p className="text-slate-300 max-w-3xl mx-auto">
            Comparez l'impact d'une compromission de clé avec et sans Perfect Forward Secrecy
          </p>
        </div>

        {/* MODE TOGGLE */}
        <div className="flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-3 bg-slate-900 p-2 rounded-2xl border-2 border-slate-700">
            <button
              onClick={togglePFS}
              disabled={!usePFS}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                !usePFS
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
              }`}
            >
              <ShieldOff className="w-5 h-5" />
              SANS PFS (PGP/GPG)
            </button>
            <button
              onClick={togglePFS}
              disabled={usePFS}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                usePFS
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
              }`}
            >
              <Shield className="w-5 h-5" />
              AVEC PFS (Signal)
            </button>
          </div>

          {/* Mode Indicator */}
          <div className={`slide-up px-6 py-3 rounded-xl border-2 ${
            usePFS 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <p className={`text-sm font-bold ${usePFS ? 'text-green-400' : 'text-red-400'}`}>
              {usePFS 
                ? '✅ Mode PFS activé : Chaque message = clé unique'
                : '⚠️ Mode Sans PFS : Une seule clé permanente pour tous les messages'
              }
            </p>
          </div>
        </div>

        {/* STATS BANNER */}
        {compromisedKeyIndex !== null && (
          <div className={`slide-up p-6 rounded-2xl border-2 ${
            usePFS 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-black text-white mb-1">{messages.length}</p>
                <p className="text-xs text-slate-400 uppercase">Messages envoyés</p>
              </div>
              <div className="text-center">
                <p className={`text-3xl font-black mb-1 ${
                  usePFS ? 'text-green-400' : 'text-red-400'
                }`}>
                  {protectedCount}
                </p>
                <p className="text-xs text-slate-400 uppercase">Messages protégés</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-red-400 mb-1">{compromisedCount}</p>
                <p className="text-xs text-slate-400 uppercase">Messages exposés</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className={`font-bold ${usePFS ? 'text-green-400' : 'text-red-400'}`}>
                {usePFS 
                  ? `Impact limité : ${Math.round((compromisedCount/messages.length)*100)}% exposés`
                  : `Impact total : ${Math.round((compromisedCount/messages.length)*100)}% exposés`
                }
              </p>
            </div>
          </div>
        )}

        {/* MAIN CHAT INTERFACE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: EXPÉDITEUR */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-4 py-2 bg-blue-500 text-white text-sm font-black uppercase rounded-full flex items-center gap-2">
                <User className="w-4 h-4" />
                Expéditeur
              </span>
              {messages.length > 0 && (
                <button 
                  onClick={reset}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Réinitialiser
                </button>
              )}
            </div>

            <div className={`bg-gradient-to-br from-slate-900 to-slate-800 border-2 rounded-2xl p-6 space-y-6 ${
              usePFS ? 'border-blue-500/30' : 'border-red-500/30'
            }`}>
              {/* User Avatar */}
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full border-2 ${
                  usePFS ? 'bg-blue-500/20 border-blue-500/50' : 'bg-red-500/20 border-red-500/50'
                }`}>
                  <Smartphone className={`w-8 h-8 ${usePFS ? 'text-blue-400' : 'text-red-400'}`} />
                </div>
                <div>
                  <h3 className="text-white font-bold">Ousmane</h3>
                  <p className="text-xs text-slate-500">En ligne</p>
                </div>
              </div>

              {/* Message Input */}
              <div className="space-y-3">
                <label className="text-xs text-slate-400 uppercase font-bold block">
                  Composer un message
                </label>
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Écrivez votre message ici..."
                  className={`w-full px-4 py-3 bg-slate-950/70 border-2 border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all resize-none ${
                    usePFS ? 'focus:border-blue-500 focus:ring-blue-500/20' : 'focus:border-red-500 focus:ring-red-500/20'
                  }`}
                  rows="4"
                />
                
                <button 
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                  className={`w-full py-3 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 uppercase ${
                    usePFS 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-500/30'
                      : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/30'
                  } disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white`}
                >
                  <Send className="w-5 h-5" />
                  {usePFS ? 'Envoyer avec clé unique' : 'Envoyer avec clé permanente'}
                </button>
                <p className="text-[10px] text-slate-500 text-center">
                  {usePFS 
                    ? '💡 Chaque envoi génère automatiquement une nouvelle clé'
                    : '⚠️ Tous les messages utilisent la même clé permanente'
                  }
                </p>
              </div>

              {/* Current Key Info */}
              <div className={`bg-black/40 p-4 rounded-xl border ${
                usePFS ? 'border-blue-500/20' : 'border-red-500/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400 uppercase font-bold">
                    {usePFS ? 'Prochaine clé AES-256' : 'Clé permanente AES-256'}
                  </p>
                  <div className={usePFS ? 'key-pulse' : ''}>
                    <Key className={`w-4 h-4 ${usePFS ? 'text-blue-400' : 'text-red-400'}`} />
                  </div>
                </div>
                <p className={`font-mono text-xs break-all p-2 rounded ${
                  usePFS 
                    ? 'text-blue-400 bg-blue-500/10' 
                    : 'text-red-400 bg-red-500/10'
                }`}>
                  {usePFS ? currentKey : permanentKey}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-center">
                  <p className="text-2xl font-black text-white">{messages.length}</p>
                  <p className="text-xs text-slate-500 uppercase">Envoyés</p>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-center">
                  <p className={`text-2xl font-black ${usePFS ? 'text-emerald-400' : 'text-red-400'}`}>
                    {usePFS ? messages.length : 1}
                  </p>
                  <p className="text-xs text-slate-500 uppercase">
                    {usePFS ? 'Clés uniques' : 'Clé unique'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: DESTINATAIRE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-4 py-2 bg-green-500 text-white text-sm font-black uppercase rounded-full flex items-center gap-2">
                <User className="w-4 h-4" />
                Destinataire
              </span>
              {compromisedKeyIndex !== null && (
                <div className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30">
                  <AlertCircle className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-red-300 font-bold">Attaque détectée</span>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-green-500/30 rounded-2xl p-6 space-y-6">
              {/* User Avatar */}
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-full border-2 border-green-500/50">
                  <Smartphone className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Mohamed</h3>
                  <p className="text-xs text-slate-500">En ligne</p>
                </div>
              </div>

              {/* Messages List */}
              <div className="space-y-3">
                <p className="text-xs text-slate-400 uppercase font-bold">Messages reçus</p>
                
                {messages.length === 0 ? (
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Aucun message reçu</p>
                    <p className="text-xs text-slate-600 mt-1">En attente...</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {messages.map((msg, index) => {
                      const isThisKeyCompromised = compromisedKeyIndex === index;
                      const isAnyKeyCompromised = compromisedKeyIndex !== null;
                      const isMessageCompromised = isAnyKeyCompromised && (usePFS ? isThisKeyCompromised : true);
                      const canBeCompromised = compromisedKeyIndex === null;
                      
                      return (
                        <div 
                          key={msg.id} 
                          className={`message-slide-in bg-slate-950/70 border-2 rounded-xl p-4 transition-all ${
                            isMessageCompromised
                              ? 'border-red-500 compromised-flash' 
                              : 'border-slate-800 hover:border-green-500/50'
                          }`}
                        >
                          {/* Message Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <MessageSquare className={`w-4 h-4 ${
                                  isMessageCompromised ? 'text-red-400' : 'text-green-400'
                                }`} />
                                <span className={`text-xs font-bold ${
                                  isMessageCompromised ? 'text-red-400' : 'text-green-400'
                                }`}>
                                  Message #{msg.id}
                                </span>
                                <span className="text-xs text-slate-500">{msg.timestamp}</span>
                              </div>
                              <p className={`text-sm ${
                                isMessageCompromised ? 'text-red-300' : 'text-slate-200'
                              } font-medium`}>
                                {msg.text}
                              </p>
                            </div>

                            {canBeCompromised && (usePFS || index === 0) && (
                              <button
                                onClick={() => compromiseKey(index)}
                                className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs font-bold transition-all flex items-center gap-1"
                                title="Simuler une compromission de clé"
                              >
                                <Unlock className="w-3 h-3" />
                                Attaquer
                              </button>
                            )}
                          </div>

                          {/* Key Display */}
                          <div className={`p-3 rounded-lg border ${
                            isMessageCompromised
                              ? 'bg-red-500/10 border-red-500/30' 
                              : 'bg-slate-900/50 border-slate-700'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1">
                                <Key className="w-3 h-3" />
                                Clé de déchiffrement
                              </span>
                              {isMessageCompromised ? (
                                <Unlock className="w-3 h-3 text-red-400" />
                              ) : (
                                <Lock className="w-3 h-3 text-green-400" />
                              )}
                            </div>
                            <p className={`font-mono text-[10px] break-all ${
                              isMessageCompromised ? 'text-red-400' : 'text-green-400'
                            }`}>
                              {msg.key}
                            </p>
                          </div>

                          {/* Status Messages */}
                          {isMessageCompromised && (
                            <div className="mt-3 bg-red-950/50 p-2 rounded border-l-2 border-red-500">
                              <p className="text-xs text-red-300 flex items-start gap-1">
                                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                <span>
                                  {usePFS ? (
                                    <>
                                      <strong>Clé compromise !</strong> Seul ce message est exposé. 
                                      Les {messages.length - 1} autres restent sécurisés.
                                    </>
                                  ) : (
                                    <>
                                      <strong>Clé permanente compromise !</strong> TOUS les {messages.length} messages 
                                      sont exposés car ils utilisent la même clé.
                                    </>
                                  )}
                                </span>
                              </p>
                            </div>
                          )}

                          {!isMessageCompromised && isAnyKeyCompromised && (
                            <div className="mt-3 bg-green-950/30 p-2 rounded border-l-2 border-green-500">
                              <p className="text-xs text-green-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <strong>Protégé par PFS</strong>
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: INFORMATION CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Backward Secrecy */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-2 border-green-500/30 p-6 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h4 className="font-black text-green-400 mb-2 uppercase text-sm">
                  Sécurité Passée
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Impossible de <strong className="text-green-400">remonter la chaîne</strong> pour 
                  déchiffrer les messages précédents même avec une clé compromise.
                </p>
              </div>
            </div>
          </div>

          {/* Forward Secrecy */}
          <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/5 border-2 border-purple-500/30 p-6 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Lock className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h4 className="font-black text-purple-400 mb-2 uppercase text-sm">
                  Sécurité Future
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Les <strong className="text-purple-400">messages futurs restent protégés</strong> car 
                  chaque clé est unique et mathématiquement isolée.
                </p>
              </div>
            </div>
          </div>

          {/* Key Derivation */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-2 border-blue-500/30 p-6 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <RefreshCcw className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="font-black text-blue-400 mb-2 uppercase text-sm">
                  Dérivation KDF
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Fonction à <strong className="text-blue-400">sens unique (HKDF)</strong>. 
                  Impossible de calculer la clé source depuis une clé dérivée.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* COMPARISON */}
        <div className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10 border-l-4 border-yellow-500 p-6 rounded-r-2xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="text-white font-black mb-3 uppercase text-sm">
                Comparaison avec les anciens protocoles
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                  <p className="text-xs text-slate-300 mb-2">
                    <strong className="text-red-400">PGP/GPG (Ancien)</strong>
                  </p>
                  <p className="text-xs text-slate-400">
                    ❌ Une clé compromise = <strong>toute la conversation</strong> exposée
                  </p>
                </div>
                <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                  <p className="text-xs text-slate-300 mb-2">
                    <strong className="text-green-400">Signal/PFS (Moderne)</strong>
                  </p>
                  <p className="text-xs text-slate-400">
                    ✅ Une clé compromise = <strong>seul 1 message</strong> exposé
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONCLUSION BUTTON */}
        <div className="text-center">
          <button
            onClick={() => setShowConclusion(true)}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-black shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-3 mx-auto text-lg uppercase"
          >
            <BookOpen className="w-6 h-6" />
            Lire la conclusion technique
          </button>
        </div>

        {/* CONCLUSION MODAL */}
        {showConclusion && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-purple-500/30 rounded-2xl max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-black text-white uppercase flex items-center gap-3">
                  <BookOpen className="w-8 h-8" />
                  Conclusion : Perfect Forward Secrecy
                </h2>
                <button
                  onClick={() => setShowConclusion(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="p-8 space-y-6 text-slate-200">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-l-4 border-green-500 pl-4">
                    Principe fondamental
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Le <strong className="text-green-400">Perfect Forward Secrecy (PFS)</strong> garantit qu'une compromission 
                    de clé cryptographique ne permet pas de déchiffrer les communications passées ou futures. 
                    Cette propriété repose sur l'utilisation de <strong className="text-blue-400">clés éphémères uniques</strong> pour 
                    chaque message, générées par une fonction de dérivation à sens unique (HKDF - HMAC-based Key Derivation Function).
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-l-4 border-blue-500 pl-4">
                    Double Ratchet de Signal
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Le protocole Signal implémente le <strong className="text-blue-400">Double Ratchet</strong>, combinant :
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                    <li><strong className="text-purple-400">Symmetric Ratchet :</strong> Dérive les clés de message via HKDF</li>
                    <li><strong className="text-purple-400">Asymmetric Ratchet (DH) :</strong> Renouvelle les clés racines à chaque échange via ECDH</li>
                  </ul>
                  <p className="text-sm leading-relaxed">
                    Cette double protection assure une <strong className="text-green-400">isolation mathématique</strong> entre 
                    les sessions : connaître K<sub>n</sub> ne permet ni de calculer K<sub>n-1</sub> (backward secrecy) 
                    ni K<sub>n+1</sub> (forward secrecy).
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-l-4 border-red-500 pl-4">
                    Comparaison empirique
                  </h3>
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 text-slate-400">Protocole</th>
                          <th className="text-center py-2 text-slate-400">Messages total</th>
                          <th className="text-center py-2 text-slate-400">Clé compromise</th>
                          <th className="text-center py-2 text-slate-400">Messages exposés</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-800">
                          <td className="py-2 text-red-400 font-bold">PGP/GPG (Sans PFS)</td>
                          <td className="text-center">10</td>
                          <td className="text-center">Clé permanente</td>
                          <td className="text-center text-red-400 font-bold">10 (100%)</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-green-400 font-bold">Signal (Avec PFS)</td>
                          <td className="text-center">10</td>
                          <td className="text-center">Clé éphémère #5</td>
                          <td className="text-center text-green-400 font-bold">1 (10%)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-l-4 border-yellow-500 pl-4">
                    Implications pratiques
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                      <h4 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Avantages du PFS
                      </h4>
                      <ul className="text-xs space-y-1 text-slate-300">
                        <li>✅ Limite drastiquement l'impact d'une compromission</li>
                        <li>✅ Protège contre la capture passive longue durée</li>
                        <li>✅ Résistance aux attaques "record now, decrypt later"</li>
                        <li>✅ Récupération automatique après compromission</li>
                      </ul>
                    </div>
                    <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                      <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Coût du PFS
                      </h4>
                      <ul className="text-xs space-y-1 text-slate-300">
                        <li>⚠️ Complexité accrue du protocole</li>
                        <li>⚠️ Overhead computationnel (génération clés)</li>
                        <li>⚠️ Impossibilité de déchiffrer ancien historique</li>
                        <li>⚠️ Nécessite implémentation rigoureuse</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 p-6 rounded-xl">
                  <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-400" />
                    Recommandation finale
                  </h4>
                  <p className="text-sm leading-relaxed">
                    Le Perfect Forward Secrecy est devenu un <strong className="text-green-400">standard de sécurité essentiel</strong> pour 
                    toute messagerie moderne. Signal, WhatsApp (via Signal Protocol), et iMessage l'implémentent par défaut. 
                    En revanche, Telegram ne l'active que dans les "Secret Chats", laissant les conversations normales 
                    vulnérables à une compromission totale de la clé serveur.
                  </p>
                  <p className="text-sm leading-relaxed mt-3">
                    Pour les utilisateurs burkinabè (journalistes, activistes, avocats), l'utilisation d'une application 
                    avec PFS activé par défaut est <strong className="text-yellow-400">cruciale</strong> pour protéger 
                    contre la surveillance de masse et les mandats de décryptage rétroactifs.
                  </p>
                </div>

                <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-700">
                  <h4 className="text-white font-bold mb-3">Applications recommandées avec PFS natif</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm">Signal (Open Source)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm">WhatsApp (Signal Protocol)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm">iMessage (Apple)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm">Wire (Enterprise)</span>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <p className="text-xs text-slate-500 italic">
                    Démonstration créée à des fins éducatives • Double Ratchet Algorithm © Open Whisper Systems
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="text-center pt-8 border-t border-slate-800">
          <p className="text-slate-500 text-sm">
            <strong className="text-slate-400">Note technique :</strong> Cette démonstration simplifie le protocole Double Ratchet. 
            En production, Signal utilise X3DH pour l'échange initial, HKDF-SHA256 pour la dérivation, 
            et AES-256-CBC + HMAC-SHA256 pour le chiffrement authentifié.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <a 
              href="https://signal.org/docs/specifications/doubleratchet/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-all flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3" />
              Documentation Signal Protocol
            </a>
            <span className="text-slate-700">•</span>
            <a 
              href="https://signal.org/docs/specifications/x3dh/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-all flex items-center gap-1"
            >
              <Key className="w-3 h-3" />
              Spécification X3DH
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PFSDemo;