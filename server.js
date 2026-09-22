const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permette le connessioni da GitHub Pages
        methods: ["GET", "POST"]
    }
});

let pendingPurchases = [];
let playerVillages = {};

io.on('connection', (socket) => {
    console.log('Un giocatore o admin si è connesso:', socket.id);

    // Caricamento / Salvataggio Villaggio
    socket.on('loadVillage', (username) => {
        const data = playerVillages[username] || { gold: 500, gems: 50, buildings: [] };
        socket.emit('villageData', data);
    });

    socket.on('saveVillage', (data) => {
        playerVillages[data.username] = data.village;
    });

    // Richiesta d'acquisto dal Negozio dell'iPad
    socket.on('requestPurchase', (data) => {
        const newPurchase = {
            id: 'ORD-' + Date.now(),
            socketId: socket.id,
            username: data.username,
            item: data.item,
            amount: data.amount,
            status: 'PENDING'
        };
        pendingPurchases.push(newPurchase);

        // Avvisa l'iPad che la richiesta è in attesa
        socket.emit('purchaseStatus', { status: 'PENDING', message: 'In attesa di approvazione da alessiopuzzolo...' });

        // Notifica l'Admin in tempo reale
        io.to('admin_room').emit('newPurchaseRequest', newPurchase);
    });

    // Autenticazione Admin (alessiopuzzolo)
    socket.on('registerAdmin', (credentials) => {
        if (credentials.username === 'alessiopuzzolo' && credentials.password === 'admin123') {
            socket.join('admin_room');
            socket.emit('pendingList', pendingPurchases.filter(p => p.status === 'PENDING'));
        }
    });

    // Decisione dell'Admin (Accetta / Rifiuta)
    socket.on('processPurchase', (data) => {
        const purchase = pendingPurchases.find(p => p.id === data.purchaseId);
        if (!purchase) return;

        if (data.action === 'APPROVE') {
            purchase.status = 'APPROVED';
            io.to(purchase.socketId).emit('purchaseStatus', { status: 'APPROVED', item: purchase.item, amount: purchase.amount });
        } else {
            purchase.status = 'REJECTED';
            io.to(purchase.socketId).emit('purchaseStatus', { status: 'REJECTED', message: 'Acquisto rifiutato dall\'amministratore.' });
        }

        io.to('admin_room').emit('pendingList', pendingPurchases.filter(p => p.status === 'PENDING'));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server attivo sulla porta ${PORT}`));