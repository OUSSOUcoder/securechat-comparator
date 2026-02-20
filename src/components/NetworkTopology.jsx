import React, { useState, useEffect } from 'react';
import { Globe, Lock, Unlock, ShieldCheck, Server, Smartphone, Laptop, Tablet, Monitor, Wifi, Send, Radio, Zap, Key, ArrowRight, Shield, Play, Pause, SkipForward, RotateCcw, AlertCircle, CheckCircle, Info } from 'lucide-react';

const NetworkSecurityVisualization = () => {
  const [selectedSender, setSelectedSender] = useState(null);
  const [selectedReceiver, setSelectedReceiver] = useState(null);
  const [message, setMessage] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(-1);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const devices = [
    { id: 1, name: 'Ousmane', type: 'smartphone', icon: Smartphone, position: { x: -300, y: -200 }, color: 'blue' },
    { id: 2, name: 'Evariste', type: 'laptop', icon: Laptop, position: { x: 300, y: -200 }, color: 'green' },
    { id: 3, name: 'Douda', type: 'tablet', icon: Tablet, position: { x: -300, y: 200 }, color: 'purple' },
    { id: 4, name: 'Alssane', type: 'desktop', icon: Monitor, position: { x: 300, y: 200 }, color: 'orange' }
  ];

  const phases = [
    { 
      id: 'device-send', 
      label: 'Chiffrement E2EE sur l\'appareil', 
      encryption: ['E2EE'],
      explanation: 'Le message est chiffré UNIQUEMENT avec la clé du destinataire. Même vous ne pouvez plus le lire une fois chiffré !',
      details: [
        '🔐 Utilisation de la clé publique du destinataire',
        '🔒 Le message devient illisible pour tous sauf le destinataire',
        '✅ Personne d\'autre ne peut déchiffrer, même pas le serveur'
      ],
      icon: Lock,
      color: 'yellow'
    },
    { 
      id: 'wifi-send', 
      label: 'Transmission WiFi (WPA3)', 
      encryption: ['E2EE', 'WiFi'],
      explanation: 'Le message traverse votre réseau WiFi. Il est protégé par 2 couches : E2EE + WiFi.',
      details: [
        '📡 Protection WiFi WPA3 (cryptage du réseau local)',
        '🔐 Protection E2EE (seul le destinataire peut lire)',
        '⚠️ Même si quelqu\'un pirate votre WiFi, il ne peut pas lire le message E2EE'
      ],
      icon: Wifi,
      color: 'green'
    },
    { 
      id: 'router-send', 
      label: 'Passage par le routeur', 
      encryption: ['E2EE', 'WiFi'],
      explanation: 'Le routeur transmet le message mais ne peut PAS le lire grâce au chiffrement E2EE.',
      details: [
        '🌐 Le routeur voit passer des données chiffrées',
        '❌ Il ne peut PAS voir le contenu du message',
        '✅ Il ne fait que router les paquets chiffrés'
      ],
      icon: Radio,
      color: 'green'
    },
    { 
      id: 'internet-send', 
      label: 'Transit sur Internet (HTTPS)', 
      encryption: ['E2EE', 'HTTPS'],
      explanation: 'Le message voyage sur Internet avec HTTPS + E2EE. Double protection !',
      details: [
        '🌍 HTTPS protège contre l\'interception pendant le transit',
        '🔐 E2EE empêche quiconque de lire le contenu',
        '🛡️ Protection contre les attaques "Man in the Middle"'
      ],
      icon: Globe,
      color: 'blue'
    },
    { 
      id: 'server', 
      label: 'Arrivée au serveur (NE PEUT PAS DÉCHIFFRER)', 
      encryption: ['E2EE', 'HTTPS'],
      explanation: 'POINT CRITIQUE : Le serveur reçoit le message mais ne peut PAS le lire ! C\'est la magie du E2EE.',
      details: [
        '❌ Le serveur n\'a PAS la clé de déchiffrement',
        '📦 Il ne voit qu\'un bloc de données chiffrées incompréhensibles',
        '✅ Il ne fait que transférer le message chiffré au destinataire',
        '🔒 Votre vie privée est protégée même du fournisseur de service'
      ],
      isServerPhase: true,
      icon: Server,
      color: 'red'
    },
    { 
      id: 'internet-receive', 
      label: 'Retour via Internet (HTTPS)', 
      encryption: ['E2EE', 'HTTPS'],
      explanation: 'Le message chiffré retourne vers le destinataire via Internet.',
      details: [
        '🔄 Transmission sécurisée vers le destinataire',
        '🔐 Toujours chiffré E2EE',
        '🌐 Protection HTTPS active'
      ],
      icon: Globe,
      color: 'blue'
    },
    { 
      id: 'router-receive', 
      label: 'Routeur du destinataire', 
      encryption: ['E2EE', 'WiFi'],
      explanation: 'Le routeur du destinataire reçoit le message mais ne peut toujours PAS le lire.',
      details: [
        '📨 Le message arrive au réseau du destinataire',
        '❌ Le routeur ne peut pas déchiffrer',
        '➡️ Transmission vers l\'appareil final'
      ],
      icon: Radio,
      color: 'green'
    },
    { 
      id: 'wifi-receive', 
      label: 'WiFi du destinataire (WPA3)', 
      encryption: ['E2EE', 'WiFi'],
      explanation: 'Le message traverse le WiFi du destinataire, toujours chiffré.',
      details: [
        '📡 Transit sur le réseau WiFi local',
        '🔐 Toujours protégé par E2EE',
        '🏁 Presque arrivé à destination'
      ],
      icon: Wifi,
      color: 'green'
    },
    { 
      id: 'device-receive', 
      label: 'Déchiffrement sur l\'appareil destinataire', 
      encryption: ['E2EE'],
      explanation: 'SEUL le destinataire avec sa clé privée peut enfin déchiffrer et lire le message !',
      details: [
        '🔓 Utilisation de la clé privée du destinataire',
        '✅ Le message redevient lisible',
        '🎯 Seul le destinataire peut lire, personne d\'autre dans tout le parcours',
        '🏆 Mission accomplie : communication privée et sécurisée !'
      ],
      isDecryption: true,
      icon: Key,
      color: 'green'
    }
  ];

  useEffect(() => {
    if (!isActive || isPaused || !autoPlay) return;
    
    const timer = setTimeout(() => {
      if (currentPhaseIndex < phases.length - 1) {
        setCurrentPhaseIndex(prev => prev + 1);
      } else {
        setTimeout(() => {
          resetTransmission();
        }, 3000);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isActive, isPaused, currentPhaseIndex, autoPlay]);

  const handleStart = () => {
    if (!selectedSender || !selectedReceiver || !message.trim() || selectedSender === selectedReceiver) return;
    setIsActive(true);
    setCurrentPhaseIndex(0);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleNext = () => {
    if (currentPhaseIndex < phases.length - 1) {
      setCurrentPhaseIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPhaseIndex > 0) {
      setCurrentPhaseIndex(prev => prev - 1);
    }
  };

  const resetTransmission = () => {
    setIsActive(false);
    setIsPaused(false);
    setCurrentPhaseIndex(-1);
  };

  const encryptMessage = (text) => {
    return text.split('').map(() => String.fromCharCode(0x2588 + Math.floor(Math.random() * 5))).join('');
  };

  const getMessagePosition = () => {
    if (currentPhaseIndex === -1) return { x: 0, y: 0 };
    
    const sender = devices.find(d => d.id === selectedSender);
    const receiver = devices.find(d => d.id === selectedReceiver);
    const phase = phases[currentPhaseIndex];
    
    switch(phase?.id) {
      case 'device-send':
        return { x: sender.position.x, y: sender.position.y };
      case 'wifi-send':
        return { x: sender.position.x * 0.7, y: sender.position.y * 0.7 };
      case 'router-send':
        return { x: sender.position.x * 0.4, y: sender.position.y * 0.4 };
      case 'internet-send':
        return { x: 0, y: -150 };
      case 'server':
        return { x: 0, y: -250 };
      case 'internet-receive':
        return { x: 0, y: -150 };
      case 'router-receive':
        return { x: receiver.position.x * 0.4, y: receiver.position.y * 0.4 };
      case 'wifi-receive':
        return { x: receiver.position.x * 0.7, y: receiver.position.y * 0.7 };
      case 'device-receive':
        return { x: receiver.position.x, y: receiver.position.y };
      default:
        return { x: 0, y: 0 };
    }
  };

  const currentPhase = phases[currentPhaseIndex];
  const messagePos = getMessagePosition();
  const isE2EEEncrypted = currentPhase && currentPhase.encryption.includes('E2EE') && currentPhase.id !== 'device-receive';
  const isComplete = currentPhase?.id === 'device-receive';

  const canStart = selectedSender && selectedReceiver && message.trim() && selectedSender !== selectedReceiver;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6 relative overflow-hidden">
      {/* Particules d'arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header amélioré */}
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="inline-block mb-4">
            <h1 className="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              🕸️ Topologie Réseau E2EE
            </h1>
            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full animate-gradient" />
          </div>
          
          <p className="text-xl text-slate-300 mb-4">
            Visualisation étape par étape d'un message chiffré
          </p>

          {/* Bouton d'aide */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg transition-all"
          >
            <Info className="w-4 h-4" />
            <span className="text-sm">Comment utiliser ?</span>
          </button>

          {/* Aide */}
          {showHelp && (
            <div className="mt-4 mx-auto max-w-2xl bg-blue-900/30 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 text-left animate-fade-in">
              <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Guide d'utilisation
              </h3>
              <ol className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  <span>Sélectionnez un <strong>expéditeur</strong> en cliquant sur un appareil</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  <span>Sélectionnez un <strong>destinataire</strong> différent</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  <span>Écrivez votre message dans le champ de texte</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">4.</span>
                  <span>Cliquez sur <strong>"Démarrer la transmission"</strong> et observez le parcours !</span>
                </li>
              </ol>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panneau de configuration amélioré */}
          <div className="lg:col-span-1 space-y-6">
            {/* Sélection des appareils */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Smartphone className="w-6 h-6 text-blue-400" />
                Configuration
              </h3>
              
              {/* Expéditeur */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3 text-slate-300">
                  1️⃣ Expéditeur
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {devices.map(device => {
                    const DeviceIcon = device.icon;
                    const isSelected = selectedSender === device.id;
                    return (
                      <button
                        key={`sender-${device.id}`}
                        onClick={() => setSelectedSender(device.id)}
                        disabled={selectedReceiver === device.id || isActive}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? `bg-${device.color}-600 border-${device.color}-400 scale-105 shadow-lg`
                            : selectedReceiver === device.id
                            ? 'bg-slate-700/30 border-slate-600/50 opacity-50 cursor-not-allowed'
                            : 'bg-slate-700/50 border-slate-600 hover:border-slate-500 hover:scale-105'
                        }`}
                      >
                        <DeviceIcon className={`w-8 h-8 mx-auto mb-2 ${
                          isSelected ? 'text-white' : 'text-slate-400'
                        }`} />
                        <div className="text-xs font-semibold text-center">{device.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Destinataire */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3 text-slate-300">
                  2️⃣ Destinataire
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {devices.map(device => {
                    const DeviceIcon = device.icon;
                    const isSelected = selectedReceiver === device.id;
                    return (
                      <button
                        key={`receiver-${device.id}`}
                        onClick={() => setSelectedReceiver(device.id)}
                        disabled={selectedSender === device.id || isActive}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? `bg-${device.color}-600 border-${device.color}-400 scale-105 shadow-lg`
                            : selectedSender === device.id
                            ? 'bg-slate-700/30 border-slate-600/50 opacity-50 cursor-not-allowed'
                            : 'bg-slate-700/50 border-slate-600 hover:border-slate-500 hover:scale-105'
                        }`}
                      >
                        <DeviceIcon className={`w-8 h-8 mx-auto mb-2 ${
                          isSelected ? 'text-white' : 'text-slate-400'
                        }`} />
                        <div className="text-xs font-semibold text-center">{device.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3 text-slate-300">
                  3️⃣ Message à envoyer
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isActive}
                  placeholder="Écrivez votre message secret..."
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  rows="3"
                />
                <div className="mt-2 text-xs text-slate-400">
                  {message.length}/200 caractères
                </div>
              </div>

              {/* Contrôles */}
              <div className="space-y-3">
                {!isActive ? (
                  <button
                    onClick={handleStart}
                    disabled={!canStart}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${
                      canStart
                        ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg hover:shadow-green-500/50 hover:scale-105'
                        : 'bg-slate-700 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Play className="w-5 h-5" />
                    Démarrer la transmission
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handlePause}
                      className="w-full py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-yellow-500/50"
                    >
                      {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                      {isPaused ? 'Reprendre' : 'Pause'}
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handlePrevious}
                        disabled={currentPhaseIndex === 0}
                        className="py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Précédent
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={currentPhaseIndex === phases.length - 1}
                        className="py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Suivant →
                      </button>
                    </div>
                    
                    <button
                      onClick={resetTransmission}
                      className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Réinitialiser
                    </button>
                  </>
                )}

                {/* Auto-play */}
                <label className="flex items-center gap-3 px-4 py-3 bg-slate-700/30 rounded-xl cursor-pointer hover:bg-slate-700/50 transition-all">
                  <input
                    type="checkbox"
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-semibold">Mode automatique (3s par étape)</span>
                </label>
              </div>
            </div>

            {/* Informations sur la phase actuelle */}
            {currentPhase && (
              <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 shadow-xl animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  {currentPhase.icon && <currentPhase.icon className={`w-8 h-8 text-${currentPhase.color}-400`} />}
                  <h3 className="text-lg font-bold text-purple-300">
                    Étape {currentPhaseIndex + 1}/{phases.length}
                  </h3>
                </div>
                
                <h4 className="text-xl font-bold mb-3 text-white">
                  {currentPhase.label}
                </h4>
                
                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                  {currentPhase.explanation}
                </p>
                
                <div className="space-y-2">
                  {currentPhase.details.map((detail, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-2 text-sm text-slate-300 bg-slate-800/50 p-3 rounded-lg"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>

                {/* Barre de progression */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Progression</span>
                    <span className="text-xs font-bold text-purple-400">
                      {Math.round(((currentPhaseIndex + 1) / phases.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${((currentPhaseIndex + 1) / phases.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zone de visualisation améliorée */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl min-h-[800px] relative overflow-hidden">
              {/* SVG de connexions avec serveur */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                {/* Connexions des appareils au serveur */}
                {devices.map((device) => {
                  const isSelected = selectedSender === device.id || selectedReceiver === device.id;
                  
                  return (
                    <g key={`connection-${device.id}`}>
                      <line 
                        x1="50%" 
                        y1="50%" 
                        x2={`calc(50% + ${device.position.x}px)`} 
                        y2={`calc(50% + ${device.position.y}px)`}
                        stroke={isSelected ? `rgb(59, 130, 246)` : 'rgba(100, 116, 139, 0.3)'}
                        strokeWidth={isSelected ? '2' : '1'}
                        strokeDasharray={isSelected ? '0' : '5,5'}
                        className="transition-all duration-300"
                      />
                    </g>
                  );
                })}

                {/* Routeurs */}
                {[-1, 1].map((direction) => {
                  const routerX = `calc(50% + ${direction * 150}px)`;
                  const routerY = 'calc(50% - 100px)';
                  
                  return (
                    <g key={`router-${direction}`}>
                      <circle 
                        cx={routerX} 
                        cy={routerY} 
                        r="30" 
                        fill="rgba(34, 197, 94, 0.1)" 
                        stroke={isActive ? 'rgb(34, 197, 94)' : 'rgba(34, 197, 94, 0.4)'} 
                        strokeWidth={isActive ? '3' : '2'}
                      />
                      <text 
                        x={routerX} 
                        y={routerY + 45} 
                        textAnchor="middle" 
                        fill={isActive ? 'rgba(34, 197, 94, 1)' : 'rgba(34, 197, 94, 0.7)'} 
                        fontSize="10" 
                        fontWeight="bold"
                      >
                        Routeur
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Serveur distant */}
              <div 
                className="absolute z-20 transition-all duration-500"
                style={{ 
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, calc(-50% - 250px))'
                }}
              >
                <div className={`p-6 rounded-2xl border-4 transition-all ${
                  currentPhase?.id === 'server'
                    ? 'bg-gradient-to-br from-red-600 to-red-500 border-red-400 scale-110 shadow-2xl shadow-red-500/50 animate-pulse'
                    : 'bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700/50'
                }`}>
                  <Server className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    currentPhase?.id === 'server'
                      ? 'text-red-400 bg-red-900/80 border-red-500'
                      : 'text-purple-400 bg-slate-900 border-purple-500/30'
                  }`}>
                    Serveur E2EE
                  </span>
                </div>
                {currentPhase?.id === 'server' && (
                  <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                    <span className="text-xs font-bold text-red-400 bg-red-900/80 px-3 py-1 rounded-full border border-red-500 animate-pulse">
                      ❌ NE PEUT PAS DÉCHIFFRER
                    </span>
                  </div>
                )}
              </div>

              {/* Appareils */}
              {devices.map((device) => {
                const DeviceIcon = device.icon;
                const isSelected = selectedSender === device.id || selectedReceiver === device.id;
                const isSending = selectedSender === device.id && currentPhase?.id === 'device-send';
                const isReceiving = selectedReceiver === device.id && currentPhase?.id === 'device-receive';
                
                const colorMap = {
                  blue: { from: 'from-blue-600', to: 'to-blue-500', border: 'border-blue-400', text: 'text-blue-400', shadow: 'shadow-blue-500/50' },
                  green: { from: 'from-green-600', to: 'to-green-500', border: 'border-green-400', text: 'text-green-400', shadow: 'shadow-green-500/50' },
                  purple: { from: 'from-purple-600', to: 'to-purple-500', border: 'border-purple-400', text: 'text-purple-400', shadow: 'shadow-purple-500/50' },
                  orange: { from: 'from-orange-600', to: 'to-orange-500', border: 'border-orange-400', text: 'text-orange-400', shadow: 'shadow-orange-500/50' }
                };
                const colors = colorMap[device.color];
                
                return (
                  <div 
                    key={device.id} 
                    className="absolute z-30 transition-all duration-500"
                    style={{ 
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${device.position.x}px), calc(-50% + ${device.position.y}px))`
                    }}
                  >
                    <div className={`relative p-6 rounded-2xl border-4 transition-all ${
                      isSending || isReceiving 
                        ? `bg-gradient-to-br ${colors.from} ${colors.to} ${colors.border} scale-125 shadow-2xl ${colors.shadow}` 
                        : isSelected 
                        ? `bg-gradient-to-br ${colors.from}/50 ${colors.to}/50 ${colors.border}/70`
                        : 'bg-slate-800/50 border-slate-700'
                    }`}>
                      <DeviceIcon className={`w-12 h-12 ${
                        isSending || isReceiving ? 'text-white animate-pulse' :
                        isSelected ? colors.text : 'text-slate-500'
                      }`} />
                    </div>
                    
                    <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                      <div className={`text-sm font-bold ${isSelected ? colors.text : 'text-slate-300'}`}>
                        {device.name}
                      </div>
                      <div className="text-xs text-slate-500">{device.type}</div>
                    </div>

                    {isSending && (
                      <div className="absolute -top-3 -right-3 bg-yellow-500 rounded-full p-2 animate-pulse">
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {isReceiving && (
                      <div className="absolute -top-3 -right-3 bg-green-500 rounded-full p-2 animate-pulse">
                        <Key className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Message en transit amélioré */}
              {isActive && message && currentPhaseIndex >= 0 && (
                <div 
                  className="absolute z-40 transition-all duration-1000 ease-in-out"
                  style={{ 
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${messagePos.x}px), calc(-50% + ${messagePos.y}px))`
                  }}
                >
                  <div className={`px-6 py-4 rounded-2xl border-4 shadow-2xl transition-all min-w-[250px] backdrop-blur-sm ${
                    isE2EEEncrypted 
                      ? 'bg-purple-500/30 border-purple-500 shadow-purple-500/50' 
                      : isComplete
                      ? 'bg-green-500/30 border-green-500 shadow-green-500/50'
                      : 'bg-yellow-500/30 border-yellow-500 shadow-yellow-500/50'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      {isE2EEEncrypted && <Lock className="w-7 h-7 text-purple-400 animate-pulse" />}
                      {!isE2EEEncrypted && !isComplete && <Unlock className="w-7 h-7 text-yellow-400" />}
                      {isComplete && <Key className="w-7 h-7 text-green-400 animate-pulse" />}
                      
                      <div className="text-lg font-mono text-white font-bold break-all">
                        {isE2EEEncrypted ? encryptMessage(message) : message}
                      </div>
                    </div>
                    
                    <div className="text-xs text-center font-bold uppercase tracking-wider py-2 rounded-lg bg-black/20">
                      {isE2EEEncrypted && <span className="text-purple-300">🔒 Chiffré E2EE</span>}
                      {currentPhase?.id === 'device-send' && <span className="text-yellow-300">📝 Chiffrement...</span>}
                      {currentPhase?.id === 'device-receive' && <span className="text-blue-300">🔓 Déchiffrement...</span>}
                      {isComplete && <span className="text-green-300">✅ Message déchiffré !</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Légende améliorée */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6 rounded-xl border-l-4 border-purple-500 hover:scale-105 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-8 h-8 text-purple-400" />
              <h4 className="text-purple-400 font-bold text-lg">E2EE (End-to-End)</h4>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Seuls l'expéditeur et le destinataire peuvent lire le message. Personne d'autre !
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6 rounded-xl border-l-4 border-blue-500 hover:scale-105 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="w-8 h-8 text-blue-400" />
              <h4 className="text-blue-400 font-bold text-lg">HTTPS/TLS</h4>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Protection du transit sur Internet contre les interceptions
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-6 rounded-xl border-l-4 border-green-500 hover:scale-105 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <Wifi className="w-8 h-8 text-green-400" />
              <h4 className="text-green-400 font-bold text-lg">WiFi (WPA3)</h4>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Chiffrement du réseau local pour protéger vos données à la maison
            </p>
          </div>
        </div>
      </div>

      {/* Styles CSS personnalisés */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.2; }
        }

        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-fade-in-down {
          animation: fade-in-down 0.8s ease-out;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
};

export default NetworkSecurityVisualization;