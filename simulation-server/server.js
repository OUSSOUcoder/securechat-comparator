import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const rooms = new Map();
const typingUsers = new Map();
const subtle = globalThis.crypto.subtle;

let serverSigningKeyPair;
let serverSigningPublicKeyJWK;

// ✅ Génération des clés serveur
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
  // ... reste de ta logique
  return { userId, senderKeyJWK, validUntil };
}

// ✅ Route santé
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    serverPublicKey: serverSigningPublicKeyJWK,
  });
});

// ✅ Socket.io — EN DEHORS de server.listen()
io.on('connection', (socket) => {
  console.log(`🔌 Nouvel utilisateur connecté : ${socket.id}`);

  // Ajoute ici tes événements (join, message, etc.)

  socket.on('disconnect', () => {
    console.log(`❌ Utilisateur déconnecté : ${socket.id}`);
  });
});

// ✅ Démarrage sécurisé — initServerKeys() appelé UNE SEULE fois ici
async function startServer() {
  try {
    console.log('⏳ Initialisation du serveur...');
    await initServerKeys();

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
    process.exit(1);
  }
}

startServer();

// Gestion des erreurs globales
process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
});