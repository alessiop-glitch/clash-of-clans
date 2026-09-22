// Connessione al Server Render
const RENDER_URL = "https://clash-of-clans-y9lb.onrender.com"; // <-- INSERISCI IL TUO URL DI RENDER
const socket = io(RENDER_URL);

let username = "Player1";
let playerGold = 500;
let playerGems = 50;

// Configurazione Phaser 3
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#2d572c',
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

function preload() {
    // Caricamento texture base
}

function create() {
    const scene = this;

    // Disegno Terreno Isometrico di prova
    const graphics = scene.add.graphics();
    graphics.lineStyle(1, 0x3d7a3a, 0.8);

    const tileWidth = 64;
    const tileHeight = 32;
    const mapSize = 10;
    const startX = window.innerWidth / 2;
    const startY = 150;

    for (let x = 0; x < mapSize; x++) {
        for (let y = 0; y < mapSize; y++) {
            const isoX = startX + (x - y) * (tileWidth / 2);
            const isoY = startY + (x + y) * (tileHeight / 2);

            graphics.beginPath();
            graphics.moveTo(isoX, isoY);
            graphics.lineTo(isoX + tileWidth / 2, isoY + tileHeight / 2);
            graphics.lineTo(isoX, isoY + tileHeight);
            graphics.lineTo(isoX - tileWidth / 2, isoY + tileHeight / 2);
            graphics.closePath();
            graphics.strokePath();
        }
    }

    // Caricamento Dati del Villaggio dal Server
    socket.emit('loadVillage', username);

    socket.on('villageData', (data) => {
        playerGold = data.gold;
        playerGems = data.gems;
        updateUI();
    });

    // Ascolta Risposta Acquisto dall'Admin
    socket.on('purchaseStatus', (res) => {
        showToast(res.message || `Stato acquisto: ${res.status}`);
        if (res.status === 'APPROVED') {
            if (res.item.includes('Gemme')) {
                playerGems += res.amount;
                updateUI();
            }
        }
    });
}

function update() { }

function updateUI() {
    document.getElementById('gold-count').innerText = playerGold;
    document.getElementById('gems-count').innerText = playerGems;
}

function toggleShop() {
    const shop = document.getElementById('shop-modal');
    shop.style.display = (shop.style.display === 'none') ? 'flex' : 'none';
}

function buyItem(item, amount) {
    socket.emit('requestPurchase', {
        username: username,
        item: item,
        amount: amount
    });
    toggleShop();
    showToast("Inviata richiesta d'acquisto all'amministratore...");
}

function showToast(text) {
    const toast = document.getElementById('status-toast');
    toast.innerText = text;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
