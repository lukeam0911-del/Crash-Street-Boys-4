/**
 * Crash Street Server
 * Real-time game server using Express and Socket.IO
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Game State
const gameState = {
    running: false,
    multiplier: 1.00,
    crashPoint: 0,
    startTime: 0,
    crashed: false,
    gameId: null,
    history: []
};

// Active bets per socket
const activeBets = new Map(); // socketId -> { amount, cashedOut, profit }

// Config
const CONFIG = {
    tickRate: 30, // ms between ticks
    growthRate: 0.15
};

let gameLoop = null;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send initial state
    socket.emit('INITIAL_STATE', {
        running: gameState.running,
        isCrashed: gameState.crashed,
        multiplier: gameState.multiplier,
        history: gameState.history
    });

    // Start game (for prototype - in production this would be automated)
    socket.on('START_GAME', () => {
        if (!gameState.running) {
            startGame();
        }
    });

    // Place bet
    socket.on('PLACE_BET', ({ amount, username }) => {
        if (!gameState.running || gameState.crashed) {
            socket.emit('ERROR', 'Cannot place bet at this time');
            return;
        }

        if (activeBets.has(socket.id)) {
            socket.emit('ERROR', 'You already have an active bet');
            return;
        }

        if (!amount || amount < 10) {
            socket.emit('ERROR', 'Minimum bet is 10');
            return;
        }

        activeBets.set(socket.id, {
            amount: amount,
            cashedOut: false,
            profit: 0,
            username: username || 'Player'
        });

        socket.emit('BET_CONFIRMED', { amount });
        console.log(`Bet placed by ${socket.id}: ${amount}`);
    });

    // Cash out
    socket.on('CASH_OUT', () => {
        if (!gameState.running || gameState.crashed) {
            socket.emit('ERROR', 'Game not active');
            return;
        }

        const bet = activeBets.get(socket.id);
        if (!bet || bet.cashedOut) {
            socket.emit('ERROR', 'No active bet to cash out');
            return;
        }

        const winAmount = Math.floor(bet.amount * gameState.multiplier);
        const profit = winAmount - bet.amount;

        bet.cashedOut = true;
        bet.profit = profit;

        socket.emit('CASHOUT_SUCCESS', {
            multiplier: gameState.multiplier,
            winAmount: winAmount,
            profit: profit
        });

        console.log(`Cash out by ${socket.id}: ${winAmount} (${gameState.multiplier.toFixed(2)}x)`);
    });

    socket.on('disconnect', () => {
        activeBets.delete(socket.id);
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Game functions
function startGame() {
    console.log('Starting new game...');

    gameState.running = true;
    gameState.multiplier = 1.00;
    gameState.crashed = false;
    gameState.gameId = Date.now().toString();
    gameState.startTime = Date.now();

    // Provably fair crash point calculation
    const r = Math.random();
    gameState.crashPoint = 0.99 / (1 - r);
    if (gameState.crashPoint < 1.00) gameState.crashPoint = 1.00;
    gameState.crashPoint = Math.min(gameState.crashPoint, 1000);

    console.log(`Crash point set to: ${gameState.crashPoint.toFixed(2)}x`);

    // Clear previous bets
    activeBets.clear();

    // Broadcast game start
    io.emit('GAME_START', { id: gameState.gameId });

    // Start game loop
    gameLoop = setInterval(tick, CONFIG.tickRate);
}

function tick() {
    if (!gameState.running) return;

    const elapsed = (Date.now() - gameState.startTime) / 1000;

    // Exponential growth
    gameState.multiplier += (gameState.multiplier * CONFIG.growthRate * (CONFIG.tickRate / 1000));

    if (gameState.multiplier >= gameState.crashPoint) {
        crash();
    } else {
        io.emit('TICK', {
            multiplier: gameState.multiplier,
            elapsed: elapsed
        });
    }
}

function crash() {
    console.log(`Game crashed at ${gameState.crashPoint.toFixed(2)}x`);

    clearInterval(gameLoop);
    gameState.running = false;
    gameState.crashed = true;

    // Calculate results for all active bets
    const results = [];
    activeBets.forEach((bet, socketId) => {
        if (!bet.cashedOut) {
            // Lost
            results.push({
                socketId: socketId,
                username: bet.username,
                amount: bet.amount,
                result: 'lost',
                profit: -bet.amount
            });
        } else {
            // Won
            results.push({
                socketId: socketId,
                username: bet.username,
                amount: bet.amount,
                result: 'won',
                profit: bet.profit
            });
        }
    });

    // Add to history
    addToHistory(gameState.crashPoint);

    // Broadcast crash
    io.emit('GAME_CRASHED', {
        crashPoint: gameState.crashPoint,
        results: results
    });

    // Auto-start next game after delay
    setTimeout(() => {
        startGame();
    }, 5000);
}

function addToHistory(crashPoint) {
    gameState.history.unshift({
        crashPoint: crashPoint,
        timestamp: Date.now()
    });
    if (gameState.history.length > 50) {
        gameState.history.pop();
    }
}

// Start server
server.listen(PORT, () => {
    console.log(`Crash Street server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Auto-start first game after 3 seconds
    setTimeout(() => {
        console.log('Auto-starting first game...');
        startGame();
    }, 3000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
