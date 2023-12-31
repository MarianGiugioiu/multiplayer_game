const express = require('express')
const app = express()

const http = require('http');
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 });

const port = 3000

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const backendPlayers = {}
const backendProjectiles = {};

const SPEED = 10;
const RADIUS = 10;
let projectileId = 0;

io.on('connection', (socket) => {
  console.log('a user connected');

  io.emit('updatePlayers', backendPlayers);

  socket.on('shoot', ({x, y, angle}) => {
    projectileId++;
    const velocity = {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5
    }
    // console.log(angle * (180 / Math.PI));
    backendProjectiles[projectileId] = {x, y, velocity, playerId: socket.id};
  })

  socket.on('initGame', ({username, width, height, devicePixelRatio}) => {
    backendPlayers[socket.id] = {
      x: 500 * Math.random(),
      y: 500 * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username
    }

    backendPlayers[socket.id].canvas = { width, height };
    backendPlayers[socket.id].radius = RADIUS
    if (devicePixelRatio > 1) {
      backendPlayers[socket.id].radius = 2 * RADIUS
    }
  })

  socket.on('disconnect', (reason) => {
    delete backendPlayers[socket.id];
    io.emit('updatePlayers', backendPlayers);
  })

  socket.on('keydown', ({keycode, sequenceNumber}) => {
    backendPlayers[socket.id].sequenceNumber = sequenceNumber;
    switch(keycode) {
      case 'KeyW':
        backendPlayers[socket.id].y -= SPEED;
        break;
      case 'KeyA':
        backendPlayers[socket.id].x -= SPEED;
        break;
      case 'KeyS':
        backendPlayers[socket.id].y += SPEED;
        break;
      case 'KeyD':
        backendPlayers[socket.id].x += SPEED;
        break;
      }
  })
});

setInterval(() => {
  for (const id in backendProjectiles) {
    backendProjectiles[id].x += backendProjectiles[id].velocity.x;
    backendProjectiles[id].y += backendProjectiles[id].velocity.y;
    if (backendPlayers[backendProjectiles[id].playerId]) {
      if (backendProjectiles[id].x - 5 >= backendPlayers[backendProjectiles[id].playerId].canvas.width ||
        backendProjectiles[id].x - 5 <= 0 ||
        backendProjectiles[id].y - 5 >= backendPlayers[backendProjectiles[id].playerId].canvas.height ||
        backendProjectiles[id].y - 5 <= 0) {
        delete backendProjectiles[id];
      }
    }

    if (backendProjectiles[id]) {
      for (const playerId in backendPlayers) {
        if (playerId !== backendProjectiles[id].playerId) {
          const backendPlayer = backendPlayers[playerId];
    
          const distance = Math.hypot(backendProjectiles[id].x - backendPlayer.x, backendProjectiles[id].y - backendPlayer.y);
          if (distance <= backendPlayer.radius + 5) {
            if (backendPlayers[backendProjectiles[id].playerId]) {
              backendPlayers[backendProjectiles[id].playerId].score++;
            }
            delete backendPlayers[playerId];
            delete backendProjectiles[id];
            break;
          }
        }
      }
    }
  }

  io.emit('updateProjectiles', backendProjectiles);
  io.emit('updatePlayers', backendPlayers);
}, 15)

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
