const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let pendingPurchases = [];
let playerVillages = {};

io.on('connection', (socket) => {
    console.log('Nuova connessione:', socket.id);

    // Caricamento Dati Villaggio
    socket.on('loadVillage', (username) => {
        const data = playerVillages[username] || { gold: 500, gems: 50, buildings: [] };
        socket.emit('villageData', data);
    });

    // Richiesta Acquisto dal Giocatore
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

        socket.emit('purchaseStatus', { status: 'PENDING', message: 'In attesa di approvazione da alessiopuzzolo...' });
        io.to('admin_room').emit('pendingList', pendingPurchases.filter(p => p.status === 'PENDING'));
    });

    // Autenticazione Admin (alessiopuzzolo)
    socket.on('registerAdmin', (credentials) => {
        if (credentials.username === 'alessiopuzzolo' && credentials.password === 'admin123') {
            socket.join('admin_room');
            socket.emit('pendingList', pendingPurchases.filter(p => p.status === 'PENDING'));
        }
    });

    // Risposta dell'Admin (Accetta / Rifiuta)
    socket.on('processPurchase', (data) => {
        const purchase = pendingPurchases.find(p => p.id === data.purchaseId);
        if (!purchase) return;

        if (data.action === 'APPROVE') {
            purchase.status = 'APPROVED';
            io.to(purchase.socketId).emit('purchaseStatus', {
                status: 'APPROVED',
                item: purchase.item,
                amount: purchase.amount,
                message: 'Acquisto APPROVATO da alessiopuzzolo!'
            });
        } else {
            purchase.status = 'REJECTED';
            io.to(purchase.socketId).emit('purchaseStatus', {
                status: 'REJECTED',
                message: 'Acquisto RIFIUTATO da alessiopuzzolo.'
            });
        }

        pendingPurchases = pendingPurchases.filter(p => p.id !== data.purchaseId);
        io.to('admin_room').emit('pendingList', pendingPurchases.filter(p => p.status === 'PENDING'));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server avviato sulla porta ${PORT}`));
