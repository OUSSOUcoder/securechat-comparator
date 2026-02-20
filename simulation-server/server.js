import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { webcrypto } from 'crypto';

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

// Stockage des rooms
const rooms = new Map();

// Stockage des sessions de typing
const typingUsers = new Map();

// ===================== CA (certificats Sealed Sender) =====================
const subtle = webcrypto.subtle;

const serverSigningKeyPair = await subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
);
const serverSigningPublicKeyJWK = await subtle.exportKey('jwk', serverSigningKeyPair.publicKey);

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

io.on('connection', (socket) => {
  console.log('✅ Utilisateur connecté:', socket.id);
  
  let currentRoom = null;
  let currentUsername = null;

  // Rejoindre une simulation
  socket.on('join-simulation', async ({ roomId, username, publicKey, publicKeyFingerprint, identityKey }) => {
    console.log(`👤 ${username} rejoint la room ${roomId}`);
    
    if (currentRoom) {
      socket.leave(currentRoom);
    }
    
    currentRoom = roomId;
    currentUsername = username;
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: [],
        messages: [],
        attacks: [],
        sessions: new Map(),
        createdAt: Date.now()
      });
      console.log(`📦 Nouvelle room créée: ${roomId}`);
    }
    
    const room = rooms.get(roomId);
    
    // Certificat Sealed Sender (signé par le serveur)
    let certificate = null;
    try {
      if (identityKey) {
        certificate = await issueSenderCertificate(username, identityKey);
      }
    } catch (e) {
      console.error('❌ Erreur émission certificat:', e);
    }

    const user = {
      id: socket.id,
      username,
      publicKey, // RSA-OAEP JWK (pour SealedSender v1)
      publicKeyFingerprint,
      identityKey, // ECDH P-256 JWK (identité ratchet)
      certificate,
      joinedAt: Date.now()
    };
    
    const existingUserIndex = room.users.findIndex(u => u.username === username);
    if (existingUserIndex !== -1) {
      room.users[existingUserIndex].id = socket.id;
      console.log(`🔄 ${username} reconnecté`);
    } else {
      room.users.push(user);
    }
    
    socket.join(roomId);
    
    socket.emit('room-state', {
      messages: room.messages,
      attacks: room.attacks,
      users: room.users,
      serverSigningPublicKey: serverSigningPublicKeyJWK
    });
    
    socket.to(roomId).emit('user-joined', {
      user,
      users: room.users,
      serverSigningPublicKey: serverSigningPublicKeyJWK
    });
    
    console.log(`📊 Room ${roomId}: ${room.users.length} utilisateur(s)`);
  });

  // Rejoindre automatiquement (reconnexion)
  socket.on('rejoin-simulation', ({ roomId, username }) => {
    console.log(`🔄 Tentative de reconnexion: ${username} -> ${roomId}`);
    
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const user = room.users.find(u => u.username === username);
      
      if (user) {
        user.id = socket.id;
        currentRoom = roomId;
        currentUsername = username;
        
        socket.join(roomId);
        
        socket.emit('room-state', {
          messages: room.messages,
          attacks: room.attacks,
          users: room.users
        });
        
        console.log(`✅ ${username} reconnecté à ${roomId}`);
      }
    }
  });

  // Initialisation de session chiffrée
  socket.on('init-session', ({ roomId, recipientId, sessionData }) => {
    console.log(`🔐 Initialisation session: ${socket.id} -> ${recipientId}`);
    
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    
    if (!room.sessions.has(recipientId)) {
      room.sessions.set(recipientId, new Map());
    }
    room.sessions.get(recipientId).set(socket.id, sessionData);
    
    io.to(recipientId).emit('session-init', {
      senderId: socket.id,
      sessionData
    });
  });

  // Envoyer un message chiffré
  socket.on('send-encrypted-message', ({ roomId, from, to, encryptedData }) => {
    console.log(`📨 Message: ${from} -> ${to}`);
    
    if (!rooms.has(roomId)) {
      console.log(`❌ Room ${roomId} n'existe pas`);
      return;
    }
    
    const room = rooms.get(roomId);
    
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from,
      to,
      encryptedData,
      timestamp: Date.now()
    };
    
    room.messages.push(message);
    
    if (room.messages.length > 1000) {
      room.messages = room.messages.slice(-1000);
    }
    
    io.to(roomId).emit('new-message', message);
  });

  // Envoyer un message SEALED (serveur ne voit pas l'expéditeur)
  socket.on('send-sealed-message', ({ roomId, to, sealedMessage }) => {
    console.log(`📨 Message SEALED: ??? -> ${to}`);

    if (!rooms.has(roomId)) {
      console.log(`❌ Room ${roomId} n'existe pas`);
      return;
    }

    const room = rooms.get(roomId);

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: null,
      to,
      sealed: true,
      sealedMessage,
      timestamp: Date.now()
    };

    room.messages.push(message);

    if (room.messages.length > 1000) {
      room.messages = room.messages.slice(-1000);
    }

    io.to(roomId).emit('new-message', message);
  });

  // Utilisateur en train d'écrire
  socket.on('user-typing', ({ roomId, username }) => {
    if (!typingUsers.has(roomId)) {
      typingUsers.set(roomId, new Set());
    }
    
    typingUsers.get(roomId).add(username);
    
    socket.to(roomId).emit('user-typing', { username });
    
    setTimeout(() => {
      if (typingUsers.has(roomId)) {
        typingUsers.get(roomId).delete(username);
      }
    }, 5000);
  });

  // Arrêter d'écrire
  socket.on('stop-typing', ({ roomId, username }) => {
    if (typingUsers.has(roomId)) {
      typingUsers.get(roomId).delete(username);
    }
  });

  // Lancer une attaque
  socket.on('launch-attack', ({ roomId, attackType, target }) => {
    console.log(`⚠️ Attaque ${attackType} sur ${target} dans ${roomId}`);
    
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    
    const attack = {
      id: `attack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: attackType,
      target,
      launchedBy: currentUsername,
      status: 'active',
      timestamp: Date.now()
    };
    
    room.attacks.push(attack);
    
    io.to(roomId).emit('attack-launched', attack);
    
    setTimeout(() => {
      attack.status = 'stopped';
      io.to(roomId).emit('attack-stopped', attack);
    }, 30000);
  });

  // Déconnexion
  socket.on('disconnect', () => {
    console.log('❌ Utilisateur déconnecté:', socket.id);
    
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      
      const user = room.users.find(u => u.id === socket.id);
      
      if (user) {
        socket.to(currentRoom).emit('user-left', {
          username: user.username
        });
        
        setTimeout(() => {
          if (rooms.has(currentRoom)) {
            const roomNow = rooms.get(currentRoom);
            const userIndex = roomNow.users.findIndex(u => u.username === user.username);
            
            if (userIndex !== -1) {
              const currentUser = roomNow.users[userIndex];
              if (currentUser.id === socket.id) {
                roomNow.users.splice(userIndex, 1);
                console.log(`🗑️ ${user.username} supprimé après timeout`);
                
                if (roomNow.users.length === 0) {
                  rooms.delete(currentRoom);
                  console.log(`🗑️ Room ${currentRoom} supprimée (vide)`);
                }
              }
            }
          }
        }, 5 * 60 * 1000);
      }
    }
    
    if (currentRoom && typingUsers.has(currentRoom)) {
      typingUsers.get(currentRoom).delete(currentUsername);
    }
  });

  socket.on('error', (error) => {
    console.error('❌ Erreur socket:', error);
  });
});

// Nettoyage périodique
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;
  
  for (const [roomId, room] of rooms.entries()) {
    const lastActivity = room.messages.length > 0
      ? room.messages[room.messages.length - 1].timestamp
      : room.createdAt;
    
    if (now - lastActivity > maxAge) {
      rooms.delete(roomId);
      console.log(`🗑️ Room ${roomId} supprimée (inactive depuis > 24h)`);
    }
  }
}, 60 * 60 * 1000);

// Démarrage
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