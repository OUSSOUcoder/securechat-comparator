import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, ArrowRightLeft, AlertTriangle } from 'lucide-react';

const TrafficSecuritySimulation = () => {
  const [mode, setMode] = useState('mitm'); // 'mitm' | 'traffic'

  return (
    <div className="space-y-10 animate-in fade-in duration-700">

      {/* SWITCH MODE */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setMode('mitm')}
          className={`px-6 py-3 rounded-xl font-bold ${
            mode === 'mitm'
              ? 'bg-red-600 text-white'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          Attaque MITM
        </button>
        <button
          onClick={() => setMode('traffic')}
          className={`px-6 py-3 rounded-xl font-bold ${
            mode === 'traffic'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          Trafic chiffré vs clair
        </button>
      </div>

      {/* ================= MODE MITM ================= */}
      {mode === 'mitm' && (
        <div className="bg-red-950/30 border border-red-500/30 rounded-3xl p-8 space-y-6">
          <h2 className="text-2xl font-black text-red-400 flex items-center gap-2">
            <AlertTriangle /> Visualisation d’une attaque MITM
          </h2>

          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="bg-slate-900 p-6 rounded-2xl">
              <Lock className="mx-auto text-blue-400 mb-2" />
              <h4 className="font-bold text-white">Client</h4>
              <p className="text-xs text-slate-400">Envoi du message</p>
            </div>

            <div className="bg-red-900/40 p-6 rounded-2xl border border-red-500">
              <Eye className="mx-auto text-red-400 mb-2" />
              <h4 className="font-bold text-red-300">Attaquant (MITM)</h4>
              <p className="text-xs text-red-200">
                • Sans TLS : message lisible  
                <br />
                • Avec TLS : données chiffrées
              </p>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl">
              <Lock className="mx-auto text-green-400 mb-2" />
              <h4 className="font-bold text-white">Serveur</h4>
              <p className="text-xs text-slate-400">Réception sécurisée</p>
            </div>
          </div>

          <p className="text-sm text-red-200 italic text-center">
            👉 Le chiffrement TLS empêche toute lecture du contenu même en cas
            d’interception du trafic.
          </p>
        </div>
      )}

      {/* ================= MODE TRAFIC ================= */}
      {mode === 'traffic' && (
        <div className="bg-blue-950/30 border border-blue-500/30 rounded-3xl p-8 space-y-6">
          <h2 className="text-2xl font-black text-blue-400 flex items-center gap-2">
            <ArrowRightLeft /> Comparaison trafic réseau
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* TRAFIC CLAIR */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-red-500/40">
              <EyeOff className="text-red-400 mb-3" />
              <h4 className="font-bold text-red-300 mb-2">
                Trafic non chiffré (HTTP)
              </h4>
              <pre className="text-xs text-red-200 bg-black/50 p-4 rounded-xl overflow-x-auto">
{`{
  "username": "ousmane",
  "message": "Bonjour serveur",
  "password": "123456"
}`}
              </pre>
            </div>

            {/* TRAFIC CHIFFRÉ */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-green-500/40">
              <Lock className="text-green-400 mb-3" />
              <h4 className="font-bold text-green-300 mb-2">
                Trafic chiffré (HTTPS / TLS)
              </h4>
              <pre className="text-xs text-green-200 bg-black/50 p-4 rounded-xl overflow-x-auto">
{`17 af 3c 9b e2 a8 44 91
9d 7f 0a d4 2e 88 f1 6c
a9 31 8e 44 00 c1 9f`}
              </pre>
            </div>
          </div>

          <p className="text-sm text-blue-200 italic text-center">
            👉 Dans Wireshark, seul le trafic chiffré apparaît sous cette forme
            illisible.
          </p>
        </div>
      )}
    </div>
  );
};

export default TrafficSecuritySimulation;
