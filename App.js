import React, { useState, useEffect } from 'react';
import MultiUserSimulation from './components/MultiUserSimulation';
import DoubleRatchetDemo from './components/DoubleRatchetDemo';
import SealedSenderDemo from './components/SealedSenderDemo';
import E2EEDemo from './components/E2EEDemo';
import BruteForceDemo from './components/BruteForceDemo';
import NetworkTopology from './components/NetworkTopology';
import PFSSimulation from './components/PFSSimulation';
import MetadataCollector from './components/MetadataCollector';

function App() {
  const [currentSimulation, setCurrentSimulation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    // Animation de chargement initial
    setTimeout(() => setIsLoading(false), 800);
  }, []);

  const simulations = [
    // === PROTOCOLES AVANCÉS ===
    {
      id: 'multi-user',
      title: 'Mode Multi-Utilisateurs',
      description: 'Communication temps réel avec E2EE',
      icon: '🌐',
      gradient: 'from-blue-600 to-purple-600',
      category: 'advanced',
      component: <MultiUserSimulation />,
      badge: 'Nouveau',
      stats: '∞ utilisateurs'
    },
    {
      id: 'double-ratchet',
      title: 'Double Ratchet',
      description: 'X3DH + Symmetric + DH Ratchet',
      icon: '🔐',
      gradient: 'from-cyan-600 to-blue-600',
      category: 'advanced',
      component: <DoubleRatchetDemo />,
      badge: 'Populaire',
      stats: '3 mécanismes'
    },
    {
      id: 'sealed-sender',
      title: 'Sealed Sender',
      description: 'Masquage identité expéditeur',
      icon: '📨',
      gradient: 'from-emerald-600 to-teal-600',
      category: 'advanced',
      component: <SealedSenderDemo />,
      stats: 'Anonymat total'
    },

    // === CHIFFREMENT DE BASE ===
    {
      id: 'e2ee',
      title: 'Chiffrement E2EE',
      description: 'Parcours complet d\'un message',
      icon: '🔒',
      gradient: 'from-green-600 to-teal-600',
      category: 'basic',
      component: <E2EEDemo />,
      badge: 'Essentiel',
      stats: 'AES-256'
    },
    {
      id: 'network',
      title: 'Topologie Réseau',
      description: 'Visualisation étape par étape',
      icon: '🕸️',
      gradient: 'from-purple-600 to-pink-600',
      category: 'basic',
      component: <NetworkTopology />,
      stats: 'Visuel'
    },
    {
      id: 'pfs',
      title: 'Perfect Forward Secrecy',
      description: 'Isolation des sessions',
      icon: '🔑',
      gradient: 'from-yellow-600 to-orange-600',
      category: 'basic',
      component: <PFSSimulation />,
      stats: 'Clés éphémères'
    },

    // === MENACES & ANALYSE ===
    {
      id: 'bruteforce',
      title: 'Force Brute',
      description: 'Attaque sur différentes tailles de clés',
      icon: '⚡',
      gradient: 'from-red-600 to-pink-600',
      category: 'threats',
      component: <BruteForceDemo />,
      badge: 'Démonstration',
      stats: '2^256 possibilités'
    },
    {
      id: 'metadata',
      title: 'Collecte Métadonnées',
      description: 'Signal vs Telegram vs WhatsApp',
      icon: '📊',
      gradient: 'from-indigo-600 to-blue-600',
      category: 'threats',
      component: <MetadataCollector />,
      stats: 'Comparatif'
    }
  ];

  const categories = [
    { 
      id: 'advanced', 
      title: 'Protocoles Avancés', 
      color: 'from-blue-500 to-purple-500',
      icon: '🚀',
      description: 'Implémentations du Signal Protocol'
    },
    { 
      id: 'basic', 
      title: 'Chiffrement de Base', 
      color: 'from-green-500 to-teal-500',
      icon: '🔐',
      description: 'Fondamentaux de la cryptographie'
    },
    { 
      id: 'threats', 
      title: 'Menaces & Analyse', 
      color: 'from-red-500 to-pink-500',
      icon: '⚠️',
      description: 'Vulnérabilités et attaques'
    }
  ];

  const handleSimulationClick = (simId) => {
    // Animation de transition
    setIsLoading(true);
    setTimeout(() => {
      setCurrentSimulation(simId);
      setIsLoading(false);
    }, 500);
  };

  if (currentSimulation) {
    const sim = simulations.find(s => s.id === currentSimulation);
    
    return (
      <div className="relative min-h-screen animate-fade-in">
        <button
          onClick={() => {
            setIsLoading(true);
            setTimeout(() => {
              setCurrentSimulation(null);
              setIsLoading(false);
            }, 300);
          }}
          className="fixed top-4 left-4 z-50 px-6 py-3 bg-gray-800/90 backdrop-blur-md hover:bg-gray-700 text-white rounded-xl shadow-2xl font-semibold flex items-center gap-3 transition-all hover:scale-105 hover:shadow-blue-500/50 border border-gray-700 group"
        >
          <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span>
          <span>Retour au menu</span>
        </button>
        
        <div className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}>
          {sim?.component}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
      {/* Particules d'arrière-plan animées */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Header avec animation */}
        <div className={`text-center mb-16 ${isLoading ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'} transition-all duration-1000`}>
          <div className="mb-6 inline-block">
            <div className="relative">
              <h1 className="text-6xl md:text-7xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient">
                🔐 SecureChat Simulator
              </h1>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-30 animate-pulse" />
            </div>
          </div>
          
          <p className="text-2xl text-gray-300 mb-2 animate-fade-in-up animation-delay-200">
            Plateforme Interactive de Sécurité des Messageries
          </p>
          <p className="text-md text-gray-400 mb-6 animate-fade-in-up animation-delay-400">
            Signal • Telegram • WhatsApp - Analyse Comparative
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up animation-delay-600">
            <div className="inline-flex items-center gap-2 bg-blue-900/40 backdrop-blur-sm px-6 py-3 rounded-full border border-blue-500/50 hover:border-blue-400 transition-all hover:scale-105 cursor-default shadow-lg">
              <span className="text-3xl">🎯</span>
              <div className="text-left">
                <div className="text-xs text-gray-400 font-semibold">Projet Académique</div>
                <div className="text-sm font-bold">L3 Informatique</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-green-900/40 backdrop-blur-sm px-6 py-3 rounded-full border border-green-500/50 hover:border-green-400 transition-all hover:scale-105 cursor-default shadow-lg">
              <span className="text-3xl">🇧🇫</span>
              <div className="text-left">
                <div className="text-xs text-gray-400 font-semibold">Université</div>
                <div className="text-sm font-bold">Norbert Zongo</div>
              </div>
            </div>
          </div>
        </div>

        {/* 🆕 DISPOSITION VERTICALE - Chaque catégorie en colonne unique */}
        {categories.map((category, catIndex) => (
          <div 
            key={category.id} 
            className={`mb-16 ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-1000`}
            style={{ animationDelay: `${catIndex * 200}ms` }}
          >
            {/* En-tête de catégorie */}
            <div className="mb-8 flex items-center gap-4">
              <div className={`text-5xl ${hoveredCard && simulations.find(s => s.id === hoveredCard)?.category === category.id ? 'scale-125' : ''} transition-transform duration-300`}>
                {category.icon}
              </div>
              <div className="flex-1">
                <h2 className={`text-4xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r ${category.color}`}>
                  {category.title}
                </h2>
                <p className="text-gray-400 text-lg">{category.description}</p>
              </div>
            </div>

            {/* 🆕 GRILLE VERTICALE - 1 seule colonne */}
            <div className="space-y-6">
              {simulations
                .filter(sim => sim.category === category.id)
                .map((sim, index) => (
                  <button
                    key={sim.id}
                    onClick={() => handleSimulationClick(sim.id)}
                    onMouseEnter={() => setHoveredCard(sim.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    className={`group relative w-full p-8 bg-gradient-to-br ${sim.gradient} rounded-3xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-500 text-left overflow-hidden transform hover:scale-[1.02] hover:-translate-y-2`}
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                      animation: isLoading ? 'none' : 'fadeInUp 0.6s ease-out forwards'
                    }}
                  >
                    {/* Effet de brillance au survol */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-700 transform -skew-x-12 group-hover:translate-x-full" 
                         style={{ transition: 'all 0.7s' }} />
                    
                    {/* Badge */}
                    {sim.badge && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold border border-white/30 animate-bounce-subtle">
                        {sim.badge}
                      </div>
                    )}
                    
                    {/* Contenu en flex horizontal pour version verticale */}
                    <div className="relative z-10 flex items-center gap-8">
                      {/* Icône */}
                      <div className="text-7xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 flex-shrink-0">
                        {sim.icon}
                      </div>
                      
                      {/* Contenu */}
                      <div className="flex-1">
                        {/* Titre */}
                        <h3 className="text-3xl font-bold mb-3 group-hover:text-white transition-colors">
                          {sim.title}
                        </h3>
                        
                        {/* Description */}
                        <p className="text-base text-gray-100 opacity-90 mb-4 leading-relaxed">
                          {sim.description}
                        </p>
                        
                        {/* Stats */}
                        <div className="flex items-center gap-2 text-sm bg-black/20 px-4 py-2 rounded-lg backdrop-blur-sm inline-flex">
                          <span className="text-yellow-300">⚡</span>
                          <span className="text-white font-semibold">{sim.stats}</span>
                        </div>
                      </div>

                      {/* Flèche d'action */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all group-hover:scale-110">
                          <span className="text-3xl group-hover:translate-x-2 transition-transform">→</span>
                        </div>
                      </div>
                    </div>

                    {/* Indicateur de survol */}
                    {hoveredCard === sim.id && (
                      <div className="absolute inset-0 border-4 border-white/50 rounded-3xl animate-pulse" />
                    )}
                  </button>
                ))}
            </div>
          </div>
        ))}

        {/* Footer amélioré */}
        <div className={`text-center mt-16 pt-12 border-t border-gray-700/50 ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-1000`}>
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              À propos du projet
            </h3>
            <p className="text-gray-300 mb-2">Projet Tutoré - Licence 3 Informatique</p>
            <p className="text-gray-400 font-semibold">DIYE Ousmane • Université Norbert Zongo • 2024-2025</p>
          </div>

          {/* Technologies */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            {[
              { name: 'React 18', icon: '⚛️', color: 'blue' },
              { name: 'WebCrypto API', icon: '🔐', color: 'purple' },
              { name: 'Signal Protocol', icon: '📱', color: 'green' },
              { name: 'WebSocket', icon: '🔌', color: 'red' },
              { name: 'Tailwind CSS', icon: '🎨', color: 'cyan' }
            ].map((tech, i) => (
              <div
                key={tech.name}
                className={`group px-5 py-2 bg-${tech.color}-900/30 hover:bg-${tech.color}-900/50 border border-${tech.color}-500/30 hover:border-${tech.color}-400 rounded-full text-sm font-semibold transition-all hover:scale-110 cursor-default backdrop-blur-sm flex items-center gap-2`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="text-xl group-hover:scale-125 transition-transform">{tech.icon}</span>
                <span>{tech.name}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm p-6 rounded-2xl border border-blue-500/30 hover:border-blue-400/50 transition-all hover:scale-105">
              <div className="text-4xl mb-2">🎯</div>
              <div className="text-3xl font-bold text-blue-400">8</div>
              <div className="text-sm text-gray-400">Simulations</div>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm p-6 rounded-2xl border border-purple-500/30 hover:border-purple-400/50 transition-all hover:scale-105">
              <div className="text-4xl mb-2">🔬</div>
              <div className="text-3xl font-bold text-purple-400">∞</div>
              <div className="text-sm text-gray-400">Possibilités</div>
            </div>
            <div className="bg-gradient-to-br from-green-900/30 to-teal-900/30 backdrop-blur-sm p-6 rounded-2xl border border-green-500/30 hover:border-green-400/50 transition-all hover:scale-105">
              <div className="text-4xl mb-2">🔐</div>
              <div className="text-3xl font-bold text-green-400">100%</div>
              <div className="text-sm text-gray-400">Sécurisé</div>
            </div>
          </div>
        </div>
      </div>

      {/* Loader global */}
      {isLoading && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl animate-pulse">🔐</span>
            </div>
          </div>
        </div>
      )}

      {/* Styles CSS personnalisés */}
      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.1); }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out;
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }

        .animation-delay-200 {
          animation-delay: 200ms;
        }

        .animation-delay-400 {
          animation-delay: 400ms;
        }

        .animation-delay-600 {
          animation-delay: 600ms;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
  
}

export default App;