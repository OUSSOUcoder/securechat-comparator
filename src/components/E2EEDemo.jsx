import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Send, Eye, EyeOff, Smartphone, Server, Shield, Key, AlertCircle, CheckCircle2, Zap, RefreshCcw, AlertTriangle, X, UserX, Edit3, Skull, Timer, Hash, Activity, Terminal, ArrowRight, Package, User, Users } from 'lucide-react';

const E2EEDemo = ({ setActiveTab }) => {
  const [message, setMessage] = useState("");
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [useE2EE, setUseE2EE] = useState(true);
  const [attackerMode, setAttackerMode] = useState(false);
  const [attackType, setAttackType] = useState(null);
  
  // 🆕 Sélection expéditeur/destinataire
  const [selectedSender, setSelectedSender] = useState(null);
  const [selectedReceiver, setSelectedReceiver] = useState(null);
  const [showUserSelection, setShowUserSelection] = useState(true);
  
  // Liste des utilisateurs disponibles
  const users = [
    { id: 'ousmane', name: 'Ousmane', color: 'blue', icon: '👨‍💻' },
    { id: 'evariste', name: 'Évariste', color: 'purple', icon: '👨‍🔬' },
    { id: 'douda', name: 'Douda', color: 'pink', icon: '👩‍💼' },
    { id: 'alassane', name: 'Alassane', color: 'green', icon: '👨‍🎓' }
  ];
  
  // Packet animation states
  const [packetPosition, setPacketPosition] = useState('sender');
  const [packetContent, setPacketContent] = useState("");
  const [showPacket, setShowPacket] = useState(false);
  
  // MITM attack states
  const [attackerIntercepted, setAttackerIntercepted] = useState("");
  const [attackerModified, setAttackerModified] = useState("");
  const [showAttackerEdit, setShowAttackerEdit] = useState(false);
  
  // Traffic Analysis states
  const [trafficAnalysis, setTrafficAnalysis] = useState([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [trafficPackets, setTrafficPackets] = useState([]);
  
  // Brute force attack states
  const [bruteForceActive, setBruteForceActive] = useState(false);
  const [bruteForceProgress, setBruteForceProgress] = useState(0);
  const [currentKeySize, setCurrentKeySize] = useState(0);
  const [bruteForceResult, setBruteForceResult] = useState("");
  const [bruteForcePhase, setBruteForcePhase] = useState("");
  const [attemptCount, setAttemptCount] = useState(0);
  const [bruteForceResults, setBruteForceResults] = useState([]);
  const [crackedKeys, setCrackedKeys] = useState([]);
  const [attemptedKeys, setAttemptedKeys] = useState([]);
  
  // Server display
  const [serverMessage, setServerMessage] = useState("");
  
  // Clés cryptographiques
  const [cryptoKey, setCryptoKey] = useState(null);
  const [publicKeyDisplay, setPublicKeyDisplay] = useState("");
  const [keysReady, setKeysReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isGenerating && !keysReady) {
      generateKeys();
    }
  }, []);

  const generateKeys = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      const key = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
      
      const exported = await window.crypto.subtle.exportKey("raw", key);
      const hex = Array.from(new Uint8Array(exported))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      setCryptoKey(key);
      setPublicKeyDisplay(hex.substring(0, 32) + "...");
      setKeysReady(true);
      setIsGenerating(false);
      
    } catch (error) {
      console.error("❌ Erreur:", error);
      setIsGenerating(false);
      setKeysReady(false);
    }
  };

  const encryptAES = async (text) => {
    if (!cryptoKey || !text) return null;
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const encryptedData = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        cryptoKey,
        data
      );
      
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedData), iv.length);
      
      return {
        hex: Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join(''),
        binary: combined,
        keySize: 256
      };
    } catch (error) {
      console.error("❌ Erreur chiffrement:", error);
      return null;
    }
  };

  const decryptAES = async (encryptedObj) => {
    if (!cryptoKey || !encryptedObj) return "";
    
    try {
      const combined = encryptedObj.binary;
      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);
      
      const decryptedData = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        cryptoKey,
        encryptedData
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error("Erreur déchiffrement:", error);
      return null;
    }
  };

  const simulateTrafficAnalysis = async () => {
    setTrafficAnalysis([]);
    setAnalysisProgress(0);
    setTrafficPackets([]);
    
    const events = [
      { time: 0, event: "🔍 Capture du paquet réseau...", type: "info" },
      { time: 2000, event: "📦 Paquet détecté et intercepté", type: "info" },
      { time: 4000, event: "📊 Analyse de la taille: " + (useE2EE ? "1024 bytes (chiffré)" : message.length + " bytes"), type: "warning" },
      { time: 6000, event: "🎯 Extraction métadonnées (IP, port, timestamp)", type: "warning" },
      { time: 8000, event: "⏰ Pattern temporel identifié", type: "warning" },
      { time: 10000, event: "🔢 Analyse de fréquence des bytes", type: "danger" },
      { time: 12000, event: useE2EE ? "❌ Contenu: CHIFFRÉ - Impossible à lire" : "✅ Contenu: EN CLAIR - Message lu!", type: useE2EE ? "success" : "danger" }
    ];
    
    for (const evt of events) {
      await new Promise(resolve => setTimeout(resolve, evt.time === 0 ? 0 : 2000));
      setTrafficAnalysis(prev => [...prev, evt]);
      setAnalysisProgress(((evt.time + 2000) / 14000) * 100);
      
      if (evt.time < 12000) {
        setTrafficPackets(prev => [...prev, {
          id: Date.now() + Math.random(),
          size: Math.floor(Math.random() * 1500) + 100,
          dest: ['192.168.1.5', '10.0.0.23', '172.16.0.8'][Math.floor(Math.random() * 3)],
          time: new Date().toLocaleTimeString()
        }].slice(-6));
      }
    }
  };

  const generateRandomKeyDisplay = (bits) => {
    const bytes = bits / 8;
    const randomBytes = [];
    for (let i = 0; i < bytes; i++) {
      randomBytes.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0'));
    }
    return randomBytes.join('');
  };

  const startBruteForce = async () => {
    if (!encryptedMessage || !useE2EE) return;
    
    setBruteForceActive(true);
    setBruteForceProgress(0);
    setAttemptCount(0);
    setBruteForceResult("");
    setBruteForceResults([]);
    setCrackedKeys([]);
    setAttemptedKeys([]);
    
    const keySizes = [
      { bits: 64, time: 10000, timeLabel: '2.3 heures', crackable: true },
      { bits: 128, time: 20000, timeLabel: '15.7 jours', crackable: true },
      { bits: 192, time: 30000, timeLabel: '3.2 années', crackable: true },
      { bits: 256, time: 15000, timeLabel: 'Impossible (10⁵¹ années)', crackable: false }
    ];
    
    for (let i = 0; i < keySizes.length; i++) {
      const { bits, time, timeLabel, crackable } = keySizes[i];
      setCurrentKeySize(bits);
      setBruteForcePhase(`🔓 Attaque force brute ${bits}-bit...`);
      setAttemptedKeys([]);
      
      const steps = 100;
      const intervalTime = time / steps;
      const keysPerStep = bits === 64 ? 5 : bits === 128 ? 4 : bits === 192 ? 3 : 2;
      
      for (let step = 0; step <= steps; step++) {
        setBruteForceProgress((step / steps) * 100);
        setAttemptCount(prev => prev + Math.floor(Math.random() * 50000 * (bits / 64)));
        
        if (step % 5 === 0) {
          const newKeys = [];
          for (let k = 0; k < keysPerStep; k++) {
            newKeys.push({
              id: Date.now() + Math.random(),
              key: generateRandomKeyDisplay(bits),
              bits: bits
            });
          }
          setAttemptedKeys(prev => [...newKeys, ...prev].slice(0, 10));
        }
        
        await new Promise(resolve => setTimeout(resolve, intervalTime));
      }
      
      const resultObj = {
        keySize: bits,
        success: crackable,
        time: timeLabel,
        message: crackable ? `✅ CLÉ ${bits}-BIT CASSÉE!` : `❌ CLÉ ${bits}-BIT INCASSABLE`,
        decrypted: crackable ? "Message simulé cassé" : null
      };
      
      setBruteForceResults(prev => [...prev, resultObj]);
      
      if (crackable) {
        setCrackedKeys(prev => [...prev, bits]);
        setBruteForcePhase(`🎯 Clé ${bits}-bit CASSÉE en ${timeLabel}!`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        setBruteForcePhase(`🛡️ Clé ${bits}-bit INCASSABLE`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      setBruteForceProgress(0);
      setAttemptCount(0);
    }
    
    setBruteForceResult("🛡️ AES-256 résiste à la force brute. Temps estimé: 1 milliard d'années.");
    await new Promise(resolve => setTimeout(resolve, 3000));
    setBruteForceActive(false);
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedSender || !selectedReceiver) return;
    
    if (useE2EE && !keysReady) {
      alert("Les clés ne sont pas encore prêtes. Veuillez patienter.");
      return;
    }
    
    if (useE2EE && !cryptoKey) {
      alert("Erreur: clé manquante. Rechargez la page.");
      return;
    }
    
    setShowAnimation(true);
    setAnimationPhase(0);
    setTrafficAnalysis([]);
    setTrafficPackets([]);
    setAttackerIntercepted("");
    setAttackerModified("");
    setShowAttackerEdit(false);
    setDecryptedMessage("");
    setServerMessage("");
    setPacketPosition('sender');
    setShowPacket(false);
    setBruteForceResults([]);
    setCrackedKeys([]);
    setAttemptedKeys([]);
    
    let encrypted;
    if (useE2EE) {
      encrypted = await encryptAES(message);
      if (!encrypted) {
        alert("Erreur lors du chiffrement.");
        setShowAnimation(false);
        return;
      }
      setPacketContent(encrypted.hex.substring(0, 60) + "...");
    } else {
      encrypted = { hex: message, binary: message, keySize: 0 };
      setPacketContent(message);
    }
    setEncryptedMessage(encrypted);
    
    setAnimationPhase(1);
    setShowPacket(true);
    setPacketPosition('sender');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (attackerMode && attackType) {
      setPacketPosition('toAttacker');
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      setPacketPosition('attacker');
      setAnimationPhase(2);
      const intercepted = useE2EE ? encrypted.hex : message;
      setAttackerIntercepted(intercepted);
      
      if (attackType === 'mitm') {
        if (!useE2EE) {
          setAttackerModified(message);
          setShowAttackerEdit(true);
          return;
        } else {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } else if (attackType === 'traffic') {
        await simulateTrafficAnalysis();
      } else if (attackType === 'bruteforce' && useE2EE) {
        await startBruteForce();
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPacketPosition('toServer');
      await new Promise(resolve => setTimeout(resolve, 4000));
    } else {
      setPacketPosition('toServer');
      await new Promise(resolve => setTimeout(resolve, 4000));
    }
    
    setPacketPosition('server');
    setAnimationPhase(3);
    setServerMessage(useE2EE ? encrypted.hex : message);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setPacketPosition('toReceiver');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    setPacketPosition('receiver');
    setAnimationPhase(4);
    
    let decrypted;
    if (useE2EE) {
      decrypted = await decryptAES(encrypted);
    } else {
      decrypted = encrypted.hex;
    }
    setDecryptedMessage(decrypted || message);
    setShowPacket(false);
  };

  const handleAttackerModify = async () => {
    const modified = { 
      hex: attackerModified, 
      binary: attackerModified,
      keySize: 0
    };
    setEncryptedMessage(modified);
    setPacketContent(attackerModified);
    setShowAttackerEdit(false);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    setPacketPosition('toServer');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    setPacketPosition('server');
    setAnimationPhase(3);
    setServerMessage(attackerModified);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setPacketPosition('toReceiver');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    setPacketPosition('receiver');
    setAnimationPhase(4);
    setDecryptedMessage(attackerModified);
    setShowPacket(false);
  };

  const reset = () => {
    setMessage("");
    setEncryptedMessage("");
    setDecryptedMessage("");
    setShowAnimation(false);
    setAnimationPhase(0);
    setAttackerIntercepted("");
    setAttackerModified("");
    setShowAttackerEdit(false);
    setTrafficAnalysis([]);
    setTrafficPackets([]);
    setBruteForceActive(false);
    setBruteForceProgress(0);
    setBruteForceResult("");
    setBruteForceResults([]);
    setCrackedKeys([]);
    setAttemptedKeys([]);
    setAttemptCount(0);
    setAnalysisProgress(0);
    setPacketPosition('sender');
    setShowPacket(false);
    setServerMessage("");
    setSelectedSender(null);
    setSelectedReceiver(null);
    setShowUserSelection(true);
  };

  const handleToggleE2EE = (enabled) => {
    setUseE2EE(enabled);
    reset();
  };

  const handleToggleAttacker = () => {
    setAttackerMode(!attackerMode);
    setAttackType(null);
    reset();
  };

  const getSenderUser = () => users.find(u => u.id === selectedSender);
  const getReceiverUser = () => users.find(u => u.id === selectedReceiver);

  return (
    
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 relative overflow-hidden">
      {/* Particules d'arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Roboto+Mono:wght@400;600&display=swap');
        
        .e2ee-demo * {
          font-family: 'Roboto Mono', monospace;
        }
        
        .e2ee-demo h1, h2, h3 {
          font-family: 'Orbitron', sans-serif;
        }

        @keyframes packet-move {
          from { transform: translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px currentColor; }
          50% { box-shadow: 0 0 40px currentColor; }
        }

        @keyframes encrypt-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        @keyframes crack-key {
          0% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.2) rotate(10deg); opacity: 0.5; }
          100% { transform: scale(0.8) rotate(-10deg); opacity: 0; }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.2; }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .packet-transit {
          animation: packet-move 4s linear;
        }

        .pulse-active {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .encrypt-active {
          animation: encrypt-spin 1s linear infinite;
        }

        .blink-danger {
          animation: blink 1s ease-in-out infinite;
        }

        .crack-animation {
          animation: crack-key 1s ease-out forwards;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 3px; }
      `}</style>

      <div className="e2ee-demo max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4 mb-12 animate-fade-in-up">
          <h1 className="text-5xl font-black text-white uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            Démonstration E2EE Avancée
          </h1>

<div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-3 mb-4 max-w-4xl mx-auto">
  <p className="text-blue-300 text-sm text-center">
    📖 <strong>Chapitre 5, Section I</strong> : Démonstration E2EE et Attaques Réseau (pages 51-56)
  </p>
</div>


          <p className="text-blue-400 text-lg">
            Visualisation du Trajet des Paquets & Attaques Cryptographiques
          </p>
          {publicKeyDisplay && keysReady && (
            <div className="inline-flex items-center gap-2 bg-blue-900/20 border border-blue-500/30 px-4 py-2 rounded-lg backdrop-blur-sm">
              <Key className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-blue-300 font-mono">
                Clé AES-256: {publicKeyDisplay}
              </span>
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </div>

            
          )}
          {!keysReady && (
            <div className="inline-flex items-center gap-2 bg-yellow-900/20 border border-yellow-500/30 px-4 py-2 rounded-lg animate-pulse backdrop-blur-sm">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-yellow-300">
                Génération des clés en cours...
              </span>
            </div>
          )}
        </div>

        {/* 🆕 Sélection des utilisateurs */}
        {showUserSelection && (
          <div className="bg-slate-900/80 backdrop-blur-sm border-2 border-slate-700 rounded-3xl p-8 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6 justify-center">
              <Users className="w-8 h-8 text-blue-400" />
              <h2 className="text-2xl font-bold text-white uppercase">
                Sélectionnez les Participants
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Expéditeur */}
              <div>
                <label className="block text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  1️⃣ Expéditeur
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {users.map(user => (
                    <button
                      key={`sender-${user.id}`}
                      onClick={() => setSelectedSender(user.id)}
                      disabled={selectedReceiver === user.id}
                      className={`p-6 rounded-2xl border-2 transition-all ${
                        selectedSender === user.id
                          ? `bg-${user.color}-600 border-${user.color}-400 scale-105 shadow-2xl`
                          : selectedReceiver === user.id
                          ? 'bg-slate-800/30 border-slate-700/50 opacity-50 cursor-not-allowed'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:scale-105'
                      }`}
                    >
                      <div className="text-5xl mb-3">{user.icon}</div>
                      <div className={`text-lg font-bold ${
                        selectedSender === user.id ? 'text-white' : 'text-slate-300'
                      }`}>
                        {user.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Destinataire */}
              <div>
                <label className="block text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  2️⃣ Destinataire
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {users.map(user => (
                    <button
                      key={`receiver-${user.id}`}
                      onClick={() => setSelectedReceiver(user.id)}
                      disabled={selectedSender === user.id}
                      className={`p-6 rounded-2xl border-2 transition-all ${
                        selectedReceiver === user.id
                          ? `bg-${user.color}-600 border-${user.color}-400 scale-105 shadow-2xl`
                          : selectedSender === user.id
                          ? 'bg-slate-800/30 border-slate-700/50 opacity-50 cursor-not-allowed'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:scale-105'
                      }`}
                    >
                      <div className="text-5xl mb-3">{user.icon}</div>
                      <div className={`text-lg font-bold ${
                        selectedReceiver === user.id ? 'text-white' : 'text-slate-300'
                      }`}>
                        {user.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedSender && selectedReceiver && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setShowUserSelection(false)}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black uppercase rounded-xl transition-all shadow-xl hover:scale-105 flex items-center gap-3"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  Confirmer la Sélection
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Interface principale (affichée après sélection) */}
        {!showUserSelection && (
          <>
            {/* Affichage des participants sélectionnés */}
            <div className="bg-slate-900/80 backdrop-blur-sm border-2 border-slate-700 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 rounded-lg">
                  <span className="text-3xl">{getSenderUser()?.icon}</span>
                  <div>
                    <div className="text-xs text-slate-400">Expéditeur</div>
                    <div className="text-sm font-bold text-white">{getSenderUser()?.name}</div>
                  </div>
                </div>

                <ArrowRight className="w-6 h-6 text-slate-500" />

                <div className="flex items-center gap-2 px-4 py-2 bg-green-900/30 rounded-lg">
                  <span className="text-3xl">{getReceiverUser()?.icon}</span>
                  <div>
                    <div className="text-xs text-slate-400">Destinataire</div>
                    <div className="text-sm font-bold text-white">{getReceiverUser()?.name}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  reset();
                  setShowUserSelection(true);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Changer
              </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4 items-center mb-8">
              {/* E2EE Toggle */}
              <div className="bg-slate-900/80 backdrop-blur-sm border-2 border-slate-700 rounded-2xl p-2 inline-flex gap-2">
                <button
                  onClick={() => handleToggleE2EE(true)}
                  className={`px-6 py-3 rounded-xl font-black uppercase transition-all flex items-center gap-3 ${
                    useE2EE
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-5 h-5" />
                  <span>Avec E2EE</span>
                </button>
                
                <button
                  onClick={() => handleToggleE2EE(false)}
                  className={`px-6 py-3 rounded-xl font-black uppercase transition-all flex items-center gap-3 ${
                    !useE2EE
                      ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span>Sans E2EE</span>
                </button>
              </div>

              {/* Attacker Mode Toggle */}
              <div className="bg-slate-900/80 backdrop-blur-sm border-2 border-slate-700 rounded-2xl p-2 inline-flex gap-2">
                <button
                  onClick={handleToggleAttacker}
                  className={`px-6 py-3 rounded-xl font-black uppercase transition-all flex items-center gap-3 ${
                    attackerMode
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserX className="w-5 h-5" />
                  <span>{attackerMode ? 'Attaquant Actif' : 'Activer Attaquant'}</span>
                </button>
              </div>

              {/* Attack Type Selection */}
              {attackerMode && (
                <div className="bg-purple-900/30 backdrop-blur-sm border-2 border-purple-500/50 rounded-2xl p-4">
                  <p className="text-purple-300 text-sm font-bold mb-3 text-center">Type d'Attaque:</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setAttackType('mitm'); reset(); setShowUserSelection(false); }}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        attackType === 'mitm'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                      MITM
                    </button>
                    
                    <button
                      onClick={() => { setAttackType('traffic'); reset(); setShowUserSelection(false); }}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        attackType === 'traffic'
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      Analyse Trafic
                    </button>
                    
                    <button
                      onClick={() => { setAttackType('bruteforce'); reset(); setShowUserSelection(false); }}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        attackType === 'bruteforce' && useE2EE
                          ? 'bg-yellow-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <Terminal className="w-4 h-4" />
                      Force Brute
                    </button>
                  </div>
                  {!useE2EE && attackType === 'bruteforce' && (
                    <p className="text-yellow-400 text-xs mt-2 text-center">⚠️ Force brute requiert E2EE</p>
                  )}
                  {useE2EE && attackType === 'mitm' && (
                    <p className="text-green-400 text-xs mt-2 text-center">ℹ️ MITM actif mais paquet chiffré = illisible</p>
                  )}
                </div>
              )}
            </div>

            {/* Status Banner */}
            <div className={`p-4 rounded-2xl border-2 backdrop-blur-sm ${
              useE2EE 
                ? 'bg-blue-900/20 border-blue-500/50' 
                : 'bg-red-900/30 border-red-500/50'
            }`}>
              <div className="flex items-center justify-center gap-3">
                {useE2EE ? (
                  <>
                    <Shield className="w-6 h-6 text-blue-400" />
                    <p className="text-blue-300 font-bold text-lg">
                      🔐 Chiffrement AES-256 | {getSenderUser()?.name} → {getReceiverUser()?.name} | Transit: 4s par segment
                      {attackerMode && attackType && ` | Attaque: ${attackType.toUpperCase()}`}
                    </p>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    <p className="text-red-300 font-bold text-lg">
                      ⚠️ Messages en CLAIR | {getSenderUser()?.name} → {getReceiverUser()?.name} | Transit: 4s par segment
                      {attackerMode && attackType && ` | Attaque: ${attackType.toUpperCase()}`}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Main Demo Area with Visual Packet Transit */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8">
              <div className={`grid gap-6 items-start ${
                attackerMode && attackType ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-3'
              }`}>
                
                {/* EXPÉDITEUR */}
                <div className="space-y-6 relative">
                  <div className="flex items-center justify-between">
                    <span className={`px-4 py-2 text-white text-sm font-black uppercase rounded-full flex items-center gap-2 ${
                      useE2EE ? 'bg-blue-500' : 'bg-orange-500'
                    }`}>
                      <span className="text-xl">{getSenderUser()?.icon}</span>
                      {getSenderUser()?.name}
                    </span>
                  </div>

                  <div className={`bg-slate-800/80 p-6 rounded-2xl border-2 transition-all ${
                    animationPhase >= 1 
                      ? useE2EE 
                        ? 'border-blue-500 pulse-active' 
                        : 'border-orange-500 pulse-active'
                      : 'border-slate-700'
                  }`}>
                    <div className="flex justify-center mb-6">
                      <div className={`p-6 rounded-2xl border-2 ${
                        useE2EE 
                          ? 'bg-blue-500/20 border-blue-500/50' 
                          : 'bg-orange-500/20 border-orange-500/50'
                      } ${animationPhase === 1 ? 'encrypt-active' : ''}`}>
                        <Smartphone className={`w-12 h-12 ${useE2EE ? 'text-blue-400' : 'text-orange-400'}`} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">
                          Message
                        </label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder={`Message secret de ${getSenderUser()?.name}...`}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                          rows="3"
                          disabled={showAnimation}
                        />
                      </div>

                      <button
                        onClick={handleSend}
                        disabled={!message.trim() || showAnimation || (useE2EE && !keysReady)}
                        className={`w-full py-3 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 uppercase ${
                          useE2EE 
                            ? 'bg-blue-600 hover:bg-blue-500' 
                            : 'bg-orange-600 hover:bg-orange-500'
                        }`}
                      >
                        {useE2EE && !keysReady ? (
                          <>
                            <RefreshCcw className="w-5 h-5 animate-spin" />
                            Préparation...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Envoyer
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Packet animation from sender */}
                  {showPacket && (packetPosition === 'toAttacker' || (packetPosition === 'toServer' && !attackerMode)) && (
                    <div className="absolute top-1/2 left-full w-24 -translate-y-1/2 z-50">
                      <div className="packet-transit">
                        <div className={`p-3 rounded-lg ${useE2EE ? 'bg-blue-500' : 'bg-orange-500'} shadow-lg flex items-center gap-2`}>
                          <Package className="w-5 h-5 text-white" />
                          <ArrowRight className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ATTAQUANT (si activé) - contenu inchangé mais avec les noms */}
                {attackerMode && attackType && (
                  <div className="space-y-6 relative">
                    <div className="flex items-center justify-between">
                      <span className="px-4 py-2 bg-purple-500 text-white text-sm font-black uppercase rounded-full blink-danger flex items-center gap-2">
                        <Skull className="w-4 h-4" />
                        Attaquant
                      </span>
                    </div>

                    <div className={`bg-purple-950/80 p-6 rounded-2xl border-2 transition-all min-h-[400px] max-h-[600px] overflow-auto custom-scrollbar ${
                      packetPosition === 'attacker' ? 'border-purple-500 pulse-active' : 'border-purple-700'
                    }`}>
                      {/* Contenu identique à l'original */}
                      <div className="flex justify-center mb-6">
                        <div className="p-6 bg-purple-500/20 rounded-2xl border-2 border-purple-500/50">
                          <Skull className="w-12 h-12 text-purple-400" />
                        </div>
                      </div>

                      <div className="space-y-4">
                        {attackerIntercepted && (
                          <div className={`p-4 rounded-xl border ${
                            useE2EE 
                              ? 'bg-green-900/20 border-green-500/30' 
                              : 'bg-red-900/40 border-red-500/50'
                          }`}>
                            <p className="text-xs text-purple-300 font-bold mb-2">
                              MESSAGE INTERCEPTÉ ({getSenderUser()?.name} → {getReceiverUser()?.name}):
                            </p>
                            <p className={`text-xs font-mono break-all ${
                              useE2EE ? 'text-green-400' : 'text-red-300'
                            }`}>
                              {useE2EE 
                                ? attackerIntercepted.substring(0, 80) + "..." 
                                : attackerIntercepted}
                            </p>
                            {useE2EE && (
                              <div className="mt-2 space-y-2">
                                <p className="text-xs text-green-400 font-bold">🔒 Chiffré - Illisible</p>
                                {attackType === 'mitm' && (
                                  <div className="bg-red-950/40 border border-red-500/50 p-3 rounded-lg">
                                    <p className="text-xs text-red-400 font-bold mb-1">❌ ATTAQUE MITM ÉCHOUÉE</p>
                                    <p className="text-[10px] text-red-300">
                                      ⚠️ Impossible de lire ou modifier le message chiffré
                                      <br />
                                      🛡️ E2EE protège le contenu contre l'interception
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Autres sections d'attaque... (identiques à l'original) */}
                        {attackType === 'mitm' && showAttackerEdit && !useE2EE && (
                          <div className="space-y-2">
                            <label className="text-xs text-red-400 uppercase font-bold flex items-center gap-1">
                              <Edit3 className="w-3 h-3" />
                              Modifier le message:
                            </label>
                            <textarea
                              value={attackerModified}
                              onChange={(e) => setAttackerModified(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-950 border border-red-500 rounded-xl text-red-300 text-sm resize-none"
                              rows="3"
                            />
                            <button
                              onClick={handleAttackerModify}
                              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"
                            >
                              <Send className="w-4 h-4" />
                              Envoyer Version Modifiée
                            </button>
                          </div>
                        )}

                        {/* Traffic Analysis */}
                        {attackType === 'traffic' && trafficAnalysis.length > 0 && (
                          <div className="space-y-3">
                            <div className="bg-black/40 border border-orange-500/30 rounded-xl p-4">
                              <h4 className="text-xs text-orange-300 font-bold mb-2 flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                ANALYSE ({analysisProgress.toFixed(0)}%)
                              </h4>
                              <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
                                <div 
                                  className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${analysisProgress}%` }}
                                />
                              </div>
                              <div className="space-y-1 max-h-48 overflow-auto custom-scrollbar">
                                {trafficAnalysis.map((evt, idx) => (
                                  <div key={idx} className={`text-xs ${
                                    evt.type === 'danger' ? 'text-red-400' :
                                    evt.type === 'success' ? 'text-green-400' :
                                    evt.type === 'warning' ? 'text-yellow-400' :
                                    'text-slate-400'
                                  }`}>
                                    {evt.event}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {trafficPackets.length > 0 && (
                              <div className="bg-black/40 border border-orange-500/30 rounded-xl p-3">
                                <h4 className="text-xs text-orange-300 font-bold mb-2">Paquets ({trafficPackets.length})</h4>
                                <div className="space-y-1">
                                  {trafficPackets.slice(-4).map((pkt) => (
                                    <div key={pkt.id} className="bg-orange-950/30 p-2 rounded text-[10px] font-mono">
                                      <div className="flex justify-between text-orange-300">
                                        <span>{pkt.time}</span>
                                        <span>{pkt.size}b</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Brute Force */}
                        {attackType === 'bruteforce' && useE2EE && (
                          <div className="space-y-3">
                            {bruteForceActive && (
                              <div className="bg-black/60 border border-yellow-500/30 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                  <Hash className="w-4 h-4 text-yellow-400 animate-spin" />
                                  <p className="text-xs text-yellow-300 font-bold">{bruteForcePhase}</p>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-3">
                                  <div 
                                    className="bg-gradient-to-r from-yellow-500 to-red-500 h-3 rounded-full transition-all duration-100"
                                    style={{ width: `${bruteForceProgress}%` }}
                                  />
                                </div>
                                <p className="text-xs text-slate-400">
                                  Clé: AES-{currentKeySize} | Tentatives: {attemptCount.toLocaleString()}
                                </p>
                                
                                {attemptedKeys.length > 0 && (
                                  <div className="mt-3 space-y-1">
                                    <p className="text-[10px] text-yellow-400 font-bold uppercase">Clés testées:</p>
                                    <div className="max-h-32 overflow-auto custom-scrollbar space-y-1">
                                      {attemptedKeys.map((keyAttempt) => (
                                        <div 
                                          key={keyAttempt.id} 
                                          className="bg-slate-950/50 border border-yellow-500/20 rounded px-2 py-1 animate-pulse"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-[9px] text-yellow-300 font-mono break-all">
                                              {keyAttempt.key.substring(0, 32)}...
                                            </span>
                                            <X className="w-3 h-3 text-red-400 flex-shrink-0" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {bruteForceResults.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-xs text-yellow-300 font-bold">Résultats:</h4>
                                {bruteForceResults.map((result, idx) => (
                                  <div 
                                    key={idx}
                                    className={`p-3 rounded-xl border-2 transition-all ${
                                      result.success 
                                        ? 'bg-red-950/40 border-red-500 crack-animation' 
                                        : 'bg-green-950/30 border-green-500'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        {result.success ? (
                                          <X className="w-5 h-5 text-red-400" />
                                        ) : (
                                          <Shield className="w-5 h-5 text-green-400" />
                                        )}
                                        <span className={`text-sm font-bold ${
                                          result.success ? 'text-red-400' : 'text-green-400'
                                        }`}>
                                          {result.keySize}-bit
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-slate-500">{result.time}</span>
                                    </div>
                                    <p className={`text-xs font-bold ${
                                      result.success ? 'text-red-300' : 'text-green-300'
                                    }`}>
                                      {result.message}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {bruteForceResult && !bruteForceActive && (
                              <div className="bg-green-900/20 border-2 border-green-500 p-4 rounded-xl">
                                <p className="text-xs text-green-300 font-bold">{bruteForceResult}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {showPacket && packetPosition === 'toServer' && attackerMode && (
                      <div className="absolute top-1/2 left-full w-24 -translate-y-1/2 z-50">
                        <div className="packet-transit">
                          <div className={`p-3 rounded-lg ${useE2EE ? 'bg-blue-500' : 'bg-orange-500'} shadow-lg flex items-center gap-2`}>
                            <Package className="w-5 h-5 text-white" />
                            <ArrowRight className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SERVEUR */}
                <div className="space-y-6 relative">
                  <div className="flex items-center justify-between">
                    <span className="px-4 py-2 bg-red-500 text-white text-sm font-black uppercase rounded-full">
                      Serveur
                    </span>
                  </div>

                  <div className={`bg-slate-950/80 p-6 rounded-2xl border-2 border-dashed transition-all min-h-[400px] flex flex-col ${
                    packetPosition === 'server' ? 'border-red-500 pulse-active' : 'border-slate-700'
                  }`}>
                    <div className="flex justify-center mb-6">
                      <div className="p-6 bg-red-500/20 rounded-2xl border-2 border-red-500/50">
                        <Server className="w-12 h-12 text-red-400" />
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center">
                      {serverMessage ? (
                        <div className="w-full space-y-4">
                          <div className={`p-4 rounded-xl border max-h-40 overflow-auto custom-scrollbar ${
                            useE2EE 
                              ? 'bg-black/40 border-green-500/30' 
                              : 'bg-red-900/40 border-red-500/50'
                          }`}>
                            {useE2EE ? (
                              <>
                                <p className="text-xs text-green-400 font-mono break-all">
                                  {serverMessage.substring(0, 120)}...
                                </p>
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-green-500/30">
                                  <Lock className="w-4 h-4 text-green-400" />
                                  <p className="text-xs text-green-400 font-bold">🔒 Données chiffrées - Illisibles</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-base text-red-300 font-bold break-words">
                                  "{serverMessage}"
                                </p>
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-red-500/30">
                                  <Eye className="w-4 h-4 text-red-400" />
                                  <p className="text-xs text-red-400 font-bold">
                                    👁️ Message en CLAIR - Le serveur voit: {getSenderUser()?.name} → {getReceiverUser()?.name}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm">En attente de données...</p>
                      )}
                    </div>
                  </div>

                  {showPacket && packetPosition === 'toReceiver' && (
                    <div className="absolute top-1/2 left-full w-24 -translate-y-1/2 z-50">
                      <div className="packet-transit">
                        <div className={`p-3 rounded-lg ${useE2EE ? 'bg-blue-500' : 'bg-cyan-500'} shadow-lg flex items-center gap-2`}>
                          <Package className="w-5 h-5 text-white" />
                          <ArrowRight className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* DESTINATAIRE */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className={`px-4 py-2 text-white text-sm font-black uppercase rounded-full flex items-center gap-2 ${
                      useE2EE ? 'bg-green-500' : 'bg-cyan-500'
                    }`}>
                      <span className="text-xl">{getReceiverUser()?.icon}</span>
                      {getReceiverUser()?.name}
                    </span>
                  </div>

                  <div className={`bg-slate-800/80 p-6 rounded-2xl border-2 transition-all ${
                    packetPosition === 'receiver'
                      ? useE2EE 
                        ? 'border-green-500 pulse-active' 
                        : 'border-cyan-500 pulse-active'
                      : 'border-slate-700'
                  }`}>
                    <div className="flex justify-center mb-6">
                      <div className={`p-6 rounded-2xl border-2 ${
                        useE2EE 
                          ? 'bg-green-500/20 border-green-500/50' 
                          : 'bg-cyan-500/20 border-cyan-500/50'
                      }`}>
                        <Smartphone className={`w-12 h-12 ${useE2EE ? 'text-green-400' : 'text-cyan-400'}`} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className={`border rounded-xl p-4 min-h-[120px] flex flex-col items-center justify-center ${
                        useE2EE 
                          ? 'bg-slate-950 border-green-500/30' 
                          : 'bg-slate-950 border-cyan-500/30'
                      }`}>
                        {decryptedMessage ? (
                          <div className="text-center w-full">
                            <div className="flex items-center justify-center gap-2 mb-3">
                              <CheckCircle2 className={`w-5 h-5 ${useE2EE ? 'text-green-400' : 'text-cyan-400'}`} />
                              <p className="text-xs text-slate-400 italic">
                                {useE2EE ? '✓ Déchiffré automatiquement' : '✓ Reçu en clair'}
                              </p>
                            </div>
                            <p className={`font-bold text-lg ${
                              useE2EE ? 'text-green-300' : 'text-cyan-300'
                            }`}>
                              "{decryptedMessage}"
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                              De: {getSenderUser()?.name}
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-600 italic text-sm">
                            En attente du message...
                          </p>
                        )}
                      </div>

                      {showAnimation && (
                        <button
                          onClick={reset}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <RefreshCcw className="w-4 h-4" />
                          Réinitialiser
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-900/20 to-blue-950/10 border-2 border-blue-500/30 p-6 rounded-2xl backdrop-blur-sm hover:scale-105 transition-all">
                <div className="flex items-start gap-4">
                  <Shield className="w-8 h-8 text-blue-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-white font-black text-lg mb-2 uppercase">Avec E2EE</h3>
                    <ul className="space-y-1 text-slate-300 text-sm">
                      <li>✓ Paquet chiffré pendant tout le transit (4s × 3)</li>
                      <li>✓ Serveur voit seulement données chiffrées</li>
                      <li>✓ Déchiffrement automatique chez destinataire</li>
                      <li>✓ AES-256 incassable par force brute</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-900/20 to-red-950/10 border-2 border-red-500/30 p-6 rounded-2xl backdrop-blur-sm hover:scale-105 transition-all">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-white font-black text-lg mb-2 uppercase">Sans E2EE</h3>
                    <ul className="space-y-1 text-slate-300 text-sm">
                      <li>✗ Paquet en CLAIR visible pendant transit</li>
                      <li>✗ Serveur lit tout le contenu du message</li>
                      <li>✗ Attaquant peut intercepter et modifier (MITM)</li>
                      <li>✗ Aucune protection cryptographique</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        <footer className="mt-8 bg-slate-900/50 border-t border-slate-700 rounded-xl p-4">
  <p className="text-center text-slate-400 text-sm">
    📄 <strong>Référence Rapport</strong> : Chapitre 5, Section I - "Démonstration du chiffrement E2EE et différent types d'attaques"
  </p>
</footer>
      </div>
      
    </div>
  );
};

export default E2EEDemo;