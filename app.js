/**
 * UI Controller (app.js)
 * Connects the DOM to the Socket.IO Server.
 */

const App = {
    socket: null,
    chart: {
        canvas: null,
        ctx: null,
        data: [], // Stores {x, y} points
        maxPoints: 200 // Sliding window size
    },

    init: () => {
        // Elements
        const canvas = document.getElementById('chartCanvas');
        App.chart.canvas = canvas;
        App.chart.ctx = canvas.getContext('2d');

        // Listeners - Window
        window.addEventListener('resize', App.resizeCanvas);
        App.resizeCanvas();

        // Connect to Socket.IO
        App.socket = io();

        App.socket.on('connect', () => {
            console.log("Connected to server:", App.socket.id);
        });

        // Server Events
        App.socket.on('INITIAL_STATE', App.onInit);
        App.socket.on('GAME_START', App.onGameStart);
        App.socket.on('TICK', App.onTick);
        App.socket.on('GAME_CRASHED', App.onCrash);
        App.socket.on('BET_CONFIRMED', App.onBetConfirmed);
        App.socket.on('CASHOUT_SUCCESS', App.onCashout);
        App.socket.on('ERROR', (msg) => alert(msg));
    },

    // --- Actions ---
    resizeCanvas: () => {
        const p = App.chart.canvas.parentElement;
        App.chart.canvas.width = p.clientWidth;
        App.chart.canvas.height = p.clientHeight;
    },

    // Login is simpler in this proto - just local state or basic socket auth
    login: () => {
        // For prototype, we just close the modal. 
        // Real app would send AUTH packet.
        document.getElementById('loginModal').classList.remove('active');
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('userStats').style.display = 'flex';
        // Mock user details
        document.getElementById('username').innerText = document.getElementById('usernameInput').value || 'Trader';
        document.getElementById('crashCashBalance').innerText = '5000';
    },

    startGame: () => {
        // Only admin/dev usually starts global server game, 
        // but for prototype we emit a trigger
        App.socket.emit('START_GAME');
    },

    placeBet: () => {
        const amt = parseInt(document.getElementById('betAmount').value);
        const username = document.getElementById('username').innerText;
        App.socket.emit('PLACE_BET', { amount: amt, username: username });
    },

    cashOut: () => {
        App.socket.emit('CASH_OUT');
    },

    // --- Event Handlers ---

    onInit: (state) => {
        if (state.running) {
            document.getElementById('course-text').innerText = "Live";
            if (!state.isCrashed) {
                // Join mid-game
                document.getElementById('placeBetBtn').disabled = true;
            }
        }
    },

    onGameStart: () => {
        document.getElementById('multiplierDisplay').className = 'multiplier-display';
        document.getElementById('multiplierDisplay').innerText = '1.00x';
        document.getElementById('marketHaltOverlay').classList.remove('active');
        document.getElementById('placeBetBtn').disabled = false;
        document.getElementById('placeBetBtn').style.display = 'block';
        document.getElementById('cashOutBtn').style.display = 'none';
        document.getElementById('placeBetBtn').innerText = 'PLACE TRADE';
        document.getElementById('course-text').innerText = "Live";

        // Reset Chart
        App.chart.data = [{ x: 0, y: 1.0 }];
        App.drawChart();
    },

    onTick: ({ multiplier }) => {
        // X can be just length for now, or timestamp
        const xVal = App.chart.data.length * 0.1;

        App.chart.data.push({ x: xVal, y: multiplier });
        if (App.chart.data.length > App.chart.maxPoints) {
            App.chart.data.shift();
        }
        App.drawChart(multiplier);

        const disp = document.getElementById('multiplierDisplay');
        disp.innerText = multiplier.toFixed(2) + 'x';
        disp.classList.add('positive');
    },

    onBetConfirmed: ({ amount }) => {
        document.getElementById('placeBetBtn').style.display = 'none';
        document.getElementById('cashOutBtn').style.display = 'block';
        document.getElementById('cashOutBtn').classList.add('active');
        document.getElementById('cashOutBtn').innerText = 'CASH OUT';
        document.getElementById('cashOutBtn').disabled = false;
    },

    onCashout: ({ winAmount }) => {
        document.getElementById('cashOutBtn').innerText = `WON ${winAmount}`;
        document.getElementById('cashOutBtn').disabled = true;
        // In real app, update balance here
    },

    onCrash: ({ crashPoint, results }) => {
        const disp = document.getElementById('multiplierDisplay');
        disp.innerText = crashPoint.toFixed(2) + 'x';
        disp.classList.remove('positive');
        disp.classList.add('negative');
        document.getElementById('marketHaltOverlay').classList.add('active');

        document.getElementById('cashOutBtn').disabled = true;

        // Update History
        App.updateHistory(crashPoint);
    },

    updateHistory: (crashPoint) => {
        const container = document.getElementById('gameHistory');
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <span class="history-multiplier ${crashPoint >= 2 ? 'won' : 'lost'}">${crashPoint.toFixed(2)}x</span>
            <span class="history-amount">-</span>
        `;
        container.prepend(div);
        if (container.children.length > 20) container.lastChild.remove();
    },

    // --- Helpers ---
    showPage: (id) => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    closeModal: (id) => document.getElementById(id).classList.remove('active'),

    drawChart: (currentMult = 1.0) => {
        const ctx = App.chart.ctx;
        const w = App.chart.canvas.width;
        const h = App.chart.canvas.height;
        const data = App.chart.data;

        ctx.clearRect(0, 0, w, h);
        ctx.beginPath();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;

        const minX = data[0].x;
        const maxX = data[data.length - 1].x;
        const rangeX = maxX - minX || 1;

        const maxY = currentMult * 1.1;
        const minY = 1.0;
        const rangeY = maxY - minY || 0.1;

        for (let i = 0; i < data.length; i++) {
            const p = data[i];
            const x = ((p.x - minX) / rangeX) * w;
            const normalizedY = (p.y - minY) / rangeY;
            const y = h - (normalizedY * h);

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
};

window.onload = App.init;

// Global Hooks
window.showLoginModal = () => document.getElementById('loginModal').classList.add('active');
window.closeModal = App.closeModal;
window.register = App.login;
window.startGame = App.startGame;
window.placeBet = App.placeBet;
window.cashOut = App.cashOut;
window.setBetAmount = (amt) => document.getElementById('betAmount').value = amt;
window.showPage = App.showPage;
window.logout = () => location.reload();
window.showRedeemModal = () => document.getElementById('redeemModal').classList.add('active');
window.redeemCash = () => alert("Not implemented in prototype");
window.showEnterCodeModal = () => document.getElementById('enterCodeModal').classList.add('active');
