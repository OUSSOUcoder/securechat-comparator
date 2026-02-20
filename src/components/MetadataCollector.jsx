import React, { useState } from 'react';
import { Lock, Unlock, Eye, EyeOff, ShieldCheck, Terminal, Send, AlertTriangle, Users, MapPin, Smartphone, Globe, Clock, BookOpen, Shield } from 'lucide-react';

const MetadataSimulation = () => {
  const [selectedApp, setSelectedApp] = useState('signal');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState('');

  const apps = {
    signal: {
      name: 'Signal',
      color: '#2E86DE',
      icon: '🔵',
      collects: {
        content: false,
        sender: true,
        recipient: true,
        timestamp: true,
        location: false,
        deviceInfo: false,
        contacts: false,
        ipAddress: false,
        duration: false
      }
    },
    telegram: {
      name: 'Telegram',
      color: '#26A69A',
      icon: '🟢',
      collects: {
        content: true,
        sender: true,
        recipient: true,
        timestamp: true,
        location: true,
        deviceInfo: true,
        contacts: true,
        ipAddress: true,
        duration: true
      }
    },
    whatsapp: {
      name: 'WhatsApp',
      color: '#EE6C4D',
      icon: '🟠',
      collects: {
        content: false,
        sender: true,
        recipient: true,
        timestamp: true,
        location: true,
        deviceInfo: true,
        contacts: true,
        ipAddress: true,
        duration: true
      }
    }
  };

  const metadataTypes = [
    { key: 'content', label: 'Contenu du Message', icon: Eye, critical: true },
    { key: 'sender', label: 'Identité Émetteur', icon: Users, critical: false },
    { key: 'recipient', label: 'Identité Destinataire', icon: Users, critical: false },
    { key: 'timestamp', label: 'Date et Heure', icon: Clock, critical: false },
    { key: 'location', label: 'Géolocalisation', icon: MapPin, critical: true },
    { key: 'deviceInfo', label: 'Info Appareil', icon: Smartphone, critical: false },
    { key: 'contacts', label: 'Liste Contacts', icon: BookOpen, critical: true },
    { key: 'ipAddress', label: 'Adresse IP', icon: Globe, critical: false },
    { key: 'duration', label: 'Durée Connexion', icon: Clock, critical: false }
  ];

  // 🆕 Données réalistes Burkina Faso
  const burkinaLocations = [
    'Ouagadougou, Secteur 15',
    'Ouagadougou, Zone du Bois',
    'Bobo-Dioulasso, Accart-Ville',
    'Koudougou, Centre-ville',
    'Ouahigouya, Zone commerciale'
  ];

  const burkinaOperators = ['Orange BF', 'Moov Africa', 'Telecel Faso'];

  const burkinaDevices = [
    'Samsung Galaxy A32',
    'Tecno Spark 8',
    'iPhone 11',
    'Xiaomi Redmi Note 10',
    'Infinix Hot 11'
  ];

  const handleSendMessage = () => {
    if (!newMessage.trim() || !recipient.trim()) return;

    const msg = {
      id: Date.now(),
      text: newMessage,
      to: recipient,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      location: burkinaLocations[Math.floor(Math.random() * burkinaLocations.length)],
      device: burkinaDevices[Math.floor(Math.random() * burkinaDevices.length)],
      operator: burkinaOperators[Math.floor(Math.random() * burkinaOperators.length)],
      ip: '41.203.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
      duration: Math.floor(Math.random() * 300) + 60
    };

    setMessages([...messages, msg]);
    setNewMessage('');
  };

  const getCollectedCount = (appKey) => {
    return Object.values(apps[appKey].collects).filter(v => v).length;
  };

  const currentApp = apps[selectedApp];
  const lastMsg = messages[messages.length - 1];

  const getMetadataValue = (key) => {
    if (!messages.length || !lastMsg) return null;
    
    switch(key) {
      case 'content': return `"${lastMsg.text}"`;
      case 'sender': return 'Vous';
      case 'recipient': return lastMsg.to;
      case 'timestamp': return lastMsg.timestamp;
      case 'location': return lastMsg.location + ' (' + lastMsg.operator + ')';
      case 'deviceInfo': return lastMsg.device;
      case 'ipAddress': return lastMsg.ip;
      case 'duration': return `${lastMsg.duration}s`;
      case 'contacts': return `${messages.length} contacts identifiés`;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        * { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-3 flex items-center justify-center gap-3">
            <Eye className="w-10 h-10 text-yellow-400" />
            Simulation: Collecte de Métadonnées
          </h1>
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 max-w-3xl mx-auto">
            <p className="text-lg text-red-200 font-bold italic">
              "We kill people based on metadata"
            </p>
            <p className="text-sm text-gray-300 mt-1">— Michael Hayden, ex-directeur NSA/CIA</p>
          </div>
        </div>

        {/* 🆕 Contexte Burkina Faso */}
        <div className="bg-orange-900/30 border-2 border-orange-500/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🇧🇫</span>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-orange-400 mb-1">
                Contexte Burkina Faso
              </h2>
              <p className="text-sm text-gray-300">
                Simulation basée sur les infrastructures télécoms locales (Orange BF, Moov Africa, Telecel Faso).
                Les métadonnées collectées peuvent révéler des informations sensibles sur les utilisateurs burkinabè.
              </p>
            </div>
          </div>
        </div>

        {/* App Selector */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {Object.entries(apps).map(([key, appData]) => {
            const isSelected = selectedApp === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedApp(key)}
                className={`p-6 rounded-2xl font-bold text-lg transition-all transform ${
                  isSelected 
                    ? 'shadow-2xl scale-105 text-white border-4' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 border-4 border-transparent hover:scale-102'
                }`}
                style={isSelected ? { backgroundColor: appData.color, borderColor: appData.color } : {}}
              >
                <div className="text-4xl mb-2">{appData.icon}</div>
                <div className="text-2xl mb-2">{appData.name}</div>
                <div className="text-sm opacity-90">
                  {getCollectedCount(key)}/9 métadonnées collectées
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Message Interface */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Send className="w-7 h-7" />
              Envoyez un Message
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Destinataire</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Ex: Siaka, Aminata, Fatoumata..."
                  className="w-full px-4 py-3 rounded-xl bg-white/90 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Message</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Tapez votre message..."
                  rows="4"
                  className="w-full px-4 py-3 rounded-xl bg-white/90 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none"
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !recipient.trim()}
                className="w-full px-6 py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                style={{ backgroundColor: currentApp.color }}
              >
                <Send className="w-5 h-5" />
                Envoyer via {currentApp.name}
              </button>
            </div>

            {messages.length > 0 && (
              <div className="mt-6">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Messages Envoyés ({messages.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-white/20 rounded-xl p-4 text-white border border-white/10 hover:bg-white/25 transition-colors"
                    >
                      <div className="font-semibold text-yellow-300">À: {msg.to}</div>
                      <div className="text-gray-200 truncate mt-1">{msg.text}</div>
                      <div className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {msg.timestamp} • {msg.location}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Metadata Collection */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Eye className="w-7 h-7 text-yellow-400" />
              Métadonnées Collectées par {currentApp.name}
            </h2>

            <div className="space-y-3 mb-6">
              {metadataTypes.map(({ key, label, icon: Icon, critical }) => {
                const isCollected = currentApp.collects[key];
                const value = getMetadataValue(key);

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isCollected
                        ? critical
                          ? 'bg-red-500/30 border-red-500'
                          : 'bg-yellow-500/30 border-yellow-500'
                        : 'bg-green-500/20 border-green-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-bold text-white">{label}</div>
                          {isCollected && messages.length > 0 && value && (
                            <div className="text-sm text-gray-200 mt-1 font-medium">
                              {value}
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                          isCollected ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                        }`}
                      >
                        {isCollected ? '✗ COLLECTÉ' : '✓ PROTÉGÉ'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Box */}
            <div
              className={`p-5 rounded-xl border-2 ${
                selectedApp === 'signal'
                  ? 'bg-green-500/20 border-green-500'
                  : 'bg-red-500/20 border-red-500'
              }`}
            >
              <div className="flex items-start gap-3">
                {selectedApp === 'signal' ? (
                  <Shield className="w-8 h-8 text-green-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
                )}
                <div className="text-white">
                  <div className="font-bold text-lg mb-2">
                    {selectedApp === 'signal' ? '✓ Protection Maximale' : '⚠️ Collecte Extensive'}
                  </div>
                  <div className="text-sm text-gray-200 leading-relaxed">
                    {selectedApp === 'signal' && (
                      <>
                        Signal minimise les métadonnées. <strong>Sealed Sender</strong> cache même
                        l'émetteur au serveur. Seuls numéro de téléphone et date de connexion sont
                        stockés.
                      </>
                    )}
                    {selectedApp === 'telegram' && (
                      <>
                        Telegram collecte massivement les métadonnées. Les messages normaux ne sont{' '}
                        <strong>PAS chiffrés E2EE</strong>. Tout est accessible au serveur. Secret
                        Chats uniquement protègent le contenu.
                      </>
                    )}
                    {selectedApp === 'whatsapp' && (
                      <>
                        WhatsApp protège le contenu (E2EE) mais collecte énormément de métadonnées.
                        Toutes ces données sont <strong>partagées avec Meta/Facebook</strong> pour
                        publicité ciblée.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Educational Section */}
        <div className="mt-8 bg-blue-500/20 border-2 border-blue-500/50 rounded-2xl p-6">
          <h3 className="text-blue-300 font-bold text-xl mb-4 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            💡 Pourquoi les Métadonnées sont-elles Critiques?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-900/30 p-4 rounded-xl border border-blue-400/30">
              <p className="font-bold mb-2 text-yellow-300 text-lg">Graphe Social</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                Révèle qui parle à qui, quand, combien de fois. Permet de cartographier tout votre
                réseau social et vos relations.
              </p>
            </div>
            <div className="bg-blue-900/30 p-4 rounded-xl border border-blue-400/30">
              <p className="font-bold mb-2 text-yellow-300 text-lg">Patterns de Vie</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                Horaires de sommeil, déplacements, habitudes. Analyse comportementale complète
                possible sans lire un seul message.
              </p>
            </div>
            <div className="bg-blue-900/30 p-4 rounded-xl border border-blue-400/30">
              <p className="font-bold mb-2 text-yellow-300 text-lg">Ciblage</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                Suffisant pour identifier, profiler et cibler des individus. Utilisé par agences de
                renseignement et publicitaires.
              </p>
            </div>
          </div>
        </div>

        {/* 🆕 Footer avec références */}
        <footer className="mt-8 bg-slate-900/50 border-t-2 border-slate-700 rounded-xl p-6">
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="text-slate-400 font-bold mb-2">📄 Chapitre 1 - Rapport</h4>
              <p className="text-slate-300">Concepts fondamentaux : E2EE, Métadonnées, PFS</p>
            </div>
            <div>
              <h4 className="text-slate-400 font-bold mb-2">🌍 Contexte CEDEAO</h4>
              <p className="text-slate-300">Acte A/SA.1/01/10 (2010) : Protection données personnelles</p>
            </div>
            <div>
              <h4 className="text-slate-400 font-bold mb-2">🇧🇫 Burkina Faso</h4>
              <p className="text-slate-300">CIL : Commission Informatique et Libertés</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MetadataSimulation;