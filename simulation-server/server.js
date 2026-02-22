import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const rooms = new Map();
const typingUsers = new Map();

// ✅ FIX : utiliser globalThis.crypto au lieu de webcrypto
const subtle = globalThis.crypto.subtle;

// Générer clé serveur au démarrage
let serverSigningKeyPair;
let serverSigningPublicKeyJWK;

async function initServerKeys() {
  try {
    serverSigningKeyPair = await subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );
    serverSigningPublicKeyJWK = await subtle.exportKey('jwk', serverSigningKeyPair.publicKey);
    console.log('✅ Clés serveur générées');
  } catch (error) {
    console.error('❌ Erreur génération clés:', error);
    throw error;
  }
}

// Initialiser avant de démarrer
await initServerKeys();

async function issueSenderCertificate(userId, senderKeyJWK, validityDays = 7) {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validityDays);

  const certData = {
    userId,
    senderKey: senderKeyJWK,
    validUntil: validUntil.toISOString()
  };

  const certBytes = new TextEncoder().encode(JSON.stringify(certData));
  const signature = await subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    serverSigningKeyPair.privateKey,
    certBytes
  );

  return {
    ...certData,
    signature: Array.from(new Uint8Array(signature))
  };
}

console.log('🚀 Serveur de simulation démarré...');

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: rooms.size,
    sealedSender: {
      serverSigningPublicKeyJWK
    },
    timestamp: new Date().toISOString()
  });
});

// ... reste du code socket.io inchangé ...

// ✅ FIX : Écouter sur 0.0.0.0 et utiliser process.env.PORT
const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Serveur de simulation démarré...');
  console.log(`🌐 Serveur WebSocket sur port ${PORT}`);
  console.log(`📊 Dashboard : http://localhost:${PORT}/health`);
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
});