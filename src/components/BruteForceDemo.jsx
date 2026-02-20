import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Key, CheckCircle, XCircle, Zap, Play, RefreshCw } from 'lucide-react';

const BruteForceDemo = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [bruteForceProgress, setBruteForceProgress] = useState(0);
  const [currentKeySize, setCurrentKeySize] = useState(0);
  const [bruteForceAttempts, setBruteForceAttempts] = useState(0);
  const [bruteForceResults, setBruteForceResults] = useState([]);
  const [bruteForcePhase, setBruteForcePhase] = useState("");
  const [attemptedKeys, setAttemptedKeys] = useState([]); // Clés tentées visuellement

  // Générer une clé aléatoire pour l'affichage visuel
  const generateRandomKeyDisplay = (bits) => {
    const bytes = bits / 8;
    const randomBytes = [];
    for (let i = 0; i < bytes; i++) {
      randomBytes.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0'));
    }
    return randomBytes.join('');
  };

  // Brute Force Simulation (10s per key size)
  useEffect(() => {
    if (isSimulating) {
      const keySizes = [64, 128, 192, 256];
      let currentIndex = 0;

      const testKey = (keySize, index) => {
        setCurrentKeySize(keySize);
        setBruteForceProgress(0);
        setBruteForceAttempts(0);
        setAttemptedKeys([]); // Reset clés tentées
        setBruteForcePhase(`Test clé ${keySize}-bit en cours...`);
        setSimulationStep(index);

        // Nombre de clés affichées par mise à jour
        const keysPerStep = keySize === 64 ? 5 : keySize === 128 ? 4 : keySize === 192 ? 3 : 2;

        const progressInterval = setInterval(() => {
          setBruteForceProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return prev + (keySize === 256 ? 0.5 : 10);
          });
          
          setBruteForceAttempts(prev => prev + Math.floor(Math.random() * 10000 * (keySize / 64)));
          
          // Ajouter des clés tentées visuellement toutes les 500ms
          const newKeys = [];
          for (let k = 0; k < keysPerStep; k++) {
            newKeys.push({
              id: Date.now() + Math.random(),
              key: generateRandomKeyDisplay(keySize),
              bits: keySize
            });
          }
          setAttemptedKeys(prev => [...newKeys, ...prev].slice(0, 12)); // Garder les 12 dernières
        }, 500);

        // After 10 seconds, show result
        setTimeout(() => {
          clearInterval(progressInterval);
          
          const result = {
            keySize,
            success: keySize < 256,
            time: keySize === 64 ? '2.3 heures' : 
                  keySize === 128 ? '15.7 jours' : 
                  keySize === 192 ? '3.2 années' : 
                  'Impossible (10⁵¹ années)',
            message: keySize < 256 ? `✅ CLÉ ${keySize}-BIT CASSÉE!` : `❌ CLÉ ${keySize}-BIT INCASSABLE`
          };
          
          setBruteForceResults(prev => [...prev, result]);
          
          // Move to next key size
          currentIndex++;
          if (currentIndex < keySizes.length) {
            setTimeout(() => testKey(keySizes[currentIndex], currentIndex), 1000);
          } else {
            setBruteForcePhase('Analyse terminée');
            setSimulationStep(4);
          }
        }, 10000);
      };

      testKey(keySizes[0], 0);
    }
  }, [isSimulating]);

  const startSimulation = () => {
    setIsSimulating(true);
    setSimulationStep(0);
    setBruteForceProgress(0);
    setBruteForceResults([]);
    setBruteForceAttempts(0);
    setAttemptedKeys([]);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setSimulationStep(0);
    setBruteForceProgress(0);
    setBruteForceResults([]);
    setBruteForceAttempts(0);
    setBruteForcePhase("");
    setAttemptedKeys([]);
  };

  const steps = [
    { title: 'Test 64-bit', desc: '10s: Clé faible' },
    { title: 'Test 128-bit', desc: '10s: Clé moyenne' },
    { title: 'Test 192-bit', desc: '10s: Clé forte' },
    { title: 'Test 256-bit', desc: 'Incassable' }
  ];

  return (
    <div className="min-h-screen p-6 bg-[#0a0a0f] relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;600;800&display=swap');
        
        * { font-family: 'JetBrains Mono', monospace; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Orbitron', sans-serif; letter-spacing: 0.05em; }

        .gradient-mesh {
          background: 
            radial-gradient(at 27% 37%, hsla(215, 98%, 61%, 0.15) 0px, transparent 50%),
            radial-gradient(at 97% 21%, hsla(125, 98%, 72%, 0.1) 0px, transparent 50%),
            radial-gradient(at 52% 99%, hsla(354, 98%, 61%, 0.12) 0px, transparent 50%),
            radial-gradient(at 10% 29%, hsla(256, 96%, 67%, 0.1) 0px, transparent 50%);
          filter: blur(100px) saturate(150%);
        }

        .noise-bg {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.05;
        }

        @keyframes float-diagonal {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(20px, -20px) rotate(3deg); }
          50% { transform: translate(0, -40px) rotate(0deg); }
          75% { transform: translate(-20px, -20px) rotate(-3deg); }
        }

        .float-diagonal { animation: float-diagonal 8s ease-in-out infinite; }

        .diagonal-grid {
          background-image: 
            repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(59, 130, 246, 0.03) 20px, rgba(59, 130, 246, 0.03) 40px),
            repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(139, 92, 246, 0.03) 20px, rgba(139, 92, 246, 0.03) 40px);
        }

        .gradient-text {
          background: linear-gradient(135deg, #eab308 0%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #eab308 0%, #f59e0b 100%); border-radius: 3px; }
        
        @keyframes slide-in-key {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .key-attempt {
          animation: slide-in-key 0.3s ease-out;
        }
      `}</style>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="absolute inset-0 noise-bg" />
        <div className="absolute inset-0 diagonal-grid opacity-30" />
        
        <div className="absolute w-96 h-96 bg-yellow-500/20 rounded-full blur-[100px] -top-48 -left-48 float-diagonal" />
        <div className="absolute w-80 h-80 bg-orange-500/20 rounded-full blur-[100px] top-1/2 right-0 float-diagonal" style={{ animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-8 py-4 rounded-2xl border border-yellow-500/20 backdrop-blur-xl">
            <div className="p-3 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
              <Terminal className="w-10 h-10 text-yellow-400" />
            </div>
            <div className="text-left">
              <h1 className="text-5xl md:text-6xl font-black gradient-text uppercase tracking-tighter">
                Force Brute
              </h1>
              <p className="text-yellow-400 text-sm uppercase tracking-[0.3em] font-bold mt-1">
                Attaque Multi-Clés
              </p>
            </div>
          </div>
        </div>

        {/* Control */}
        <div className="flex justify-center gap-4">
          {!isSimulating && (
            <button
              onClick={startSimulation}
              className="px-8 py-4 rounded-2xl font-black text-sm transition-all uppercase tracking-wider bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:scale-105 shadow-xl shadow-yellow-500/20 flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Lancer la Simulation
            </button>
          )}
          {isSimulating && (
            <button
              onClick={resetSimulation}
              className="px-8 py-4 rounded-2xl font-black text-sm bg-slate-700 text-white hover:bg-slate-600 transition-all flex items-center gap-2 uppercase tracking-wider hover:scale-105"
            >
              <RefreshCw className="w-4 h-4" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* Simulation Panel */}
        {isSimulating && (
          <div className="space-y-6">
            <div className="bg-black/40 p-8 rounded-2xl backdrop-blur-sm border border-yellow-500/20 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none noise-bg" />
              
              {/* Current Phase */}
              <div className="mb-6 bg-yellow-950/30 p-4 rounded-xl border border-yellow-500/30">
                <p className="text-yellow-300 font-bold text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4 animate-pulse" />
                  {bruteForcePhase}
                </p>
              </div>

              {/* Results Grid */}
              <div className="space-y-4">
                {bruteForceResults.map((result, idx) => (
                  <div 
                    key={idx}
                    className={`p-6 rounded-xl border-2 ${
                      result.success 
                        ? 'bg-red-950/30 border-red-500/50' 
                        : 'bg-green-950/30 border-green-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className={`font-black text-sm flex items-center gap-2 ${
                        result.success ? 'text-red-400' : 'text-green-400'
                      }`}>
                        <Key className="w-4 h-4" />
                        CLÉ {result.keySize}-BIT
                      </h4>
                      <span className="text-xs font-mono text-slate-400">Temps: {result.time}</span>
                    </div>
                    
                    <div className={`p-4 rounded-lg border-2 flex items-center gap-3 ${
                      result.success 
                        ? 'bg-red-500/20 border-red-500' 
                        : 'bg-green-500/20 border-green-500'
                    }`}>
                      {result.success ? (
                        <XCircle className="w-6 h-6 text-red-400" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      )}
                      <span className={`font-bold ${
                        result.success ? 'text-red-300' : 'text-green-300'
                      }`}>
                        {result.message}
                      </span>
                    </div>

                    {!result.success && (
                      <div className="mt-4 bg-black/40 p-4 rounded-lg">
                        <p className="text-xs text-slate-400">
                          <strong className="text-green-400">Combinaisons possibles:</strong> 2²⁵⁶ ≈ 10⁷⁷
                          <br />
                          <strong className="text-green-400">Temps requis:</strong> Plus vieux que l'univers!
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Current Test in Progress */}
                {currentKeySize > 0 && simulationStep < 4 && (
                  <div className="bg-yellow-950/30 p-6 rounded-xl border border-yellow-500/30 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-yellow-400 font-black text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 animate-spin" />
                        TEST EN COURS: CLÉ {currentKeySize}-BIT
                      </h4>
                      <span className="text-xs text-yellow-300 font-mono">
                        {bruteForceProgress.toFixed(2)}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden mb-4">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all duration-300"
                        style={{ width: `${Math.min(bruteForceProgress, 100)}%` }}
                      />
                    </div>
                    
                    <p className="text-xs text-slate-400 font-mono">
                      Tentatives: {bruteForceAttempts.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Final Comparison */}
              {simulationStep >= 4 && (
                <div className="mt-6 bg-slate-950/50 p-6 rounded-xl border border-slate-700">
                  <h4 className="text-white font-black text-sm mb-4">COMPARAISON FINALE</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {[64, 128, 192, 256].map((size) => {
                      const result = bruteForceResults.find(r => r.keySize === size);
                      return (
                        <div key={size} className="text-center">
                          <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center border-2 ${
                            result?.success 
                              ? 'bg-red-500/20 border-red-500' 
                              : 'bg-green-500/20 border-green-500'
                          }`}>
                            {result?.success ? (
                              <XCircle className="w-8 h-8 text-red-400" />
                            ) : (
                              <CheckCircle className="w-8 h-8 text-green-400" />
                            )}
                          </div>
                          <p className={`text-xs font-bold ${
                            result?.success ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {size}-bit
                          </p>
                          <p className="text-[10px] text-slate-500">{result?.time}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Steps */}
            <div className="grid grid-cols-4 gap-3">
              {steps.map((step, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border-2 transition-all duration-500 ${
                    simulationStep >= idx 
                      ? 'bg-yellow-500/10 border-yellow-500' 
                      : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    simulationStep >= idx ? 'bg-yellow-500 text-white' : 'bg-slate-700 text-slate-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <h5 className="font-bold text-xs text-white mb-1">{step.title}</h5>
                  <p className="text-[10px] text-slate-400">{step.desc}</p>
                </div>
              ))}
            </div>

            {/* Info Panels */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-red-950/60 to-red-900/40 p-6 rounded-2xl border-l-4 border-red-500 backdrop-blur-xl">
                <h4 className="text-red-400 font-black uppercase text-xs tracking-[0.2em] mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Danger
                </h4>
                <p className="text-red-200 text-sm leading-relaxed">
                  Les clés faibles peuvent être cassées, mais AES-256 reste incassable.
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-6 rounded-2xl border-l-4 border-green-500 backdrop-blur-xl">
                <h4 className="text-green-400 font-black uppercase text-xs tracking-[0.2em] mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Solution
                </h4>
                <p className="text-green-200 text-sm leading-relaxed">
                  Utilisation obligatoire de clés AES-256 (2²⁵⁶ combinaisons).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BruteForceDemo;