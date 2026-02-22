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

// ✅ Utilisation de globalThis.crypto pour la compatibilité Node.js 18+ sur Render
const subtle = globalThis.crypto.subtle;

// Variables pour les clés serveur
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
    console.log('✅ Clés serveur générées avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la génération des clés:', error);
    throw error;
  }
}

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

// --- ROUTES ---

// Route de santé pour que Render sache que le serveur est prêt
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

// --- SOCKET.IO ---

io.on('connection', (socket) => {
  console.log(`🔌 Nouvel utilisateur connecté : ${socket.id}`);
  
  // Ajoute ici tes événements socket.io (join, message, etc.)
  
  socket.on('disconnect', () => {
    console.log(`❌ Utilisateur déconnecté : ${socket.id}`);
  });
});

// --- DÉMARRAGE SÉCURISÉ ---

// ✅ On enveloppe tout dans une fonction async pour éviter le blocage au démarrage
async function startServer() {
  try {
    console.log('⏳ Initialisation du serveur...');
    
    // Attendre la génération des clés avant d'ouvrir le port
    await initServerKeys();

    // Render injecte automatiquement le port dans process.env.PORT
    const PORT = process.env.PORT || 10000;

    server.listen(PORT, '0.0.0.0', () => {
      console.log('-------------------------------------------');
      console.log(`🚀 SERVEUR LIVE SUR LE PORT ${PORT}`);
      console.log(`🔗 URL : https://securechat-server-cjhj.onrender.com`);
      console.log(`📊 Health Check : /health`);
      console.log('-------------------------------------------');
    });
  } catch (error) {
    console.error('💥 Erreur fatale au démarrage:', error);
    process.exit(1); // Arrête le processus en cas d'erreur critique
  }
}

// Lancement du serveur
startServer();

// Gestion des erreurs globales
process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
});