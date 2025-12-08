# Crash Street Boys 🚀

A real-time multiplayer crash game built with Node.js, Express, and Socket.IO. Players bet on a rising multiplier and must cash out before the market "crashes."

## Features

- Real-time multiplayer gameplay using Socket.IO
- Provably fair crash point generation
- Trading-themed UI with multiple volatility modes
- Responsive design for mobile and desktop
- Live game history
- Auto-restart game loop

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **Styling**: CSS3 with custom design system

## Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Crash-Street-Boys-4
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Edit `.env` if needed (default PORT is 3000)

## Running Locally

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

## Project Structure

```
Crash-Street-Boys-4/
├── public/              # Static files served to clients
│   ├── css/
│   │   └── style.css   # Main stylesheet
│   ├── js/
│   │   └── app.js      # Client-side UI controller
│   └── index.html      # Main HTML file
├── server.js           # Express + Socket.IO server
├── package.json        # Dependencies and scripts
├── .env.example        # Environment variables template
├── .gitignore         # Git ignore rules
├── Dockerfile         # Docker container definition
└── README.md          # This file
```

## How It Works

### Game Flow

1. Server automatically starts a new game every 5 seconds
2. Players can place bets during the active game
3. Multiplier increases exponentially from 1.00x
4. Players can cash out at any time to secure their winnings
5. Game crashes at a predetermined (provably fair) point
6. Players who didn't cash out lose their bet

### Provably Fair Algorithm

The crash point is calculated using:
```javascript
crashPoint = 0.99 / (1 - random())
```

This ensures a 1% house edge and fair distribution of crash points.

## Deployment

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t crash-street .
```

2. Run the container:
```bash
docker run -p 3000:3000 -e PORT=3000 crash-street
```

### Platform Deployments

#### Heroku
```bash
heroku create your-app-name
git push heroku main
```

#### Railway
1. Connect your GitHub repository
2. Deploy from the dashboard
3. Railway will auto-detect Node.js and use `npm start`

#### Render
1. Create a new Web Service
2. Connect your repository
3. Use build command: `npm install`
4. Use start command: `npm start`

#### DigitalOcean App Platform
1. Create new app from GitHub
2. Select Node.js environment
3. Set run command to `npm start`

### Environment Variables

For production deployment, set:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Set to `production`

## API/Socket Events

### Client → Server
- `START_GAME` - Manually trigger game start (dev/admin)
- `PLACE_BET` - Place a bet with amount
- `CASH_OUT` - Cash out current bet

### Server → Client
- `INITIAL_STATE` - Initial game state on connect
- `GAME_START` - New game started
- `TICK` - Multiplier update (every 30ms)
- `GAME_CRASHED` - Game ended with crash point
- `BET_CONFIRMED` - Bet successfully placed
- `CASHOUT_SUCCESS` - Cash out successful
- `ERROR` - Error message

## Configuration

Game parameters can be adjusted in `server.js`:

```javascript
const CONFIG = {
    tickRate: 30,      // Milliseconds between updates
    growthRate: 0.15   // Multiplier growth rate
};
```

## Security Notes

⚠️ **This is a prototype/educational project.** Before deploying to production with real money:

1. Implement proper authentication
2. Add input validation and sanitization
3. Implement rate limiting
4. Add database for persistence
5. Implement proper session management
6. Add SSL/TLS encryption
7. Implement anti-fraud measures
8. Add comprehensive logging
9. Follow gambling regulations in your jurisdiction

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## Support

For issues and questions, please open an issue on GitHub.
