const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

const socket = io();

const scoreEl = document.querySelector('#scoreEl')

let devicePixelRatio = window.devicePixelRatio || 1;
devicePixelRatio = 2;

canvas.width = innerWidth * devicePixelRatio;
canvas.height = innerHeight * devicePixelRatio;

const x = canvas.width / 2
const y = canvas.height / 2

const frontendPlayers = {};
const frontendProjectiles = {};

// socket.on('connect', () => {
//   socket.emit('initCanvas', {
//     width: canvas.width,
//     height: canvas.height,
//     devicePixelRatio
//   });
// })

socket.on('updateProjectiles', (backendProjectiles) => {
  for (const id in backendProjectiles) {
    const backendProjectile = backendProjectiles[id];
    if (!frontendProjectiles[id]) {
      frontendProjectiles[id] = new Projectile({
        x: backendProjectile.x,
        y: backendProjectile.y,
        radius: 5,
        color: frontendPlayers[backendProjectile.playerId]?.color,
        velocity: backendProjectile.velocity
      })
    } else {
      frontendProjectiles[id].x += backendProjectiles[id].velocity.x;
      frontendProjectiles[id].y += backendProjectiles[id].velocity.y;
    }
  }

  for (const id in frontendProjectiles) {
    if (!backendProjectiles[id]) {
      delete frontendProjectiles[id];
    }
  }
});

socket.on('updatePlayers', (backendPlayers) => {
  for (const id in backendPlayers) {
    const backendPlayer = backendPlayers[id];
    if (!frontendPlayers[id]) {
      frontendPlayers[id] = new Player({
        x: backendPlayer.x,
        y: backendPlayer.y,
        radius: 10,
        color: backendPlayer.color
      })

      document.querySelector('#playerLabels').innerHTML += `<div data-id="${id}" data-score="${backendPlayer.score}">${backendPlayer.username}: ${backendPlayer.score}</div>`
    } else {
      const divToUpdate = document.querySelector(`div[data-id="${id}"]`);
      divToUpdate.innerHTML = `${backendPlayer.username}: ${backendPlayer.score}`;
      divToUpdate.setAttribute('data-score', backendPlayer.score);
      const parentDiv = document.querySelector('#playerLabels');
      const childDivs = Array.from(parentDiv.querySelectorAll('div'));
      childDivs.sort((a, b) => {
        return (+b.getAttribute('data-score') - (+a.getAttribute('data-score')))
      })

      childDivs.forEach(div => {
        parentDiv.removeChild(div);
      })
      childDivs.forEach(div => {
        parentDiv.appendChild(div);
      })

      if (id === socket.id) {
        frontendPlayers[id].x = backendPlayer.x;
        frontendPlayers[id].y = backendPlayer.y;
  
        const lastBackendInputIndex = playerInputs.findIndex(input => {
          return backendPlayer.sequenceNumber === input.sequenceNumber;
        });
  
        if (lastBackendInputIndex > -1) {
          playerInputs.splice(0, lastBackendInputIndex + 1);
        }
  
        playerInputs.forEach(input => {
          frontendPlayers[id].x += input.dx;
          frontendPlayers[id].y += input.dy;
        });
      } else {
        gsap.to(frontendPlayers[id], {
          x: backendPlayer.x,
          y: backendPlayer.y,
          duration: 0.015,
          ease: 'linear'
        })
      }
    }
  }

  for (const id in frontendPlayers) {
    if (!backendPlayers[id]) {
      const divToDelete = document.querySelector(`div[data-id="${id}"]`);
      divToDelete.parentNode.removeChild(divToDelete);

      if (id === socket.id) {
        document.querySelector('#usernameForm').style.display = 'block';
      }
      delete frontendPlayers[id];
    }
  }
})

let animationId
let score = 0
function animate() {
  animationId = requestAnimationFrame(animate)
  c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  c.fillRect(0, 0, canvas.width, canvas.height)

  for (const id in frontendPlayers) {
    const frontentPlayer = frontendPlayers[id];
    frontentPlayer.draw();
  }

  for (const id in frontendProjectiles) {
    const frontendProjectile = frontendProjectiles[id];
    frontendProjectile.draw();
  }
}

animate()

const keys = {
  w: {
    pressed: false
  },
  a: {
    pressed: false
  },
  s: {
    pressed: false
  },
  d: {
    pressed: false
  }
}

const SPEED = 10;
const playerInputs = []
let sequenceNumber = 0;
setInterval(() => {
  if (keys.w.pressed) {
    sequenceNumber++;
    playerInputs.push({sequenceNumber, dx: 0, dy: -SPEED});
    frontendPlayers[socket.id].y -= SPEED;
      socket.emit('keydown', {keycode: 'KeyW', sequenceNumber});
  }
  if (keys.a.pressed) {
    sequenceNumber++;
    playerInputs.push({sequenceNumber, dx: -SPEED, dy: 0});
    frontendPlayers[socket.id].x -= SPEED;
      socket.emit('keydown', {keycode: 'KeyA', sequenceNumber});
  }
  if (keys.s.pressed) {
    sequenceNumber++;
    playerInputs.push({sequenceNumber, dx: 0, dy: SPEED});
    frontendPlayers[socket.id].y += SPEED;
      socket.emit('keydown', {keycode: 'KeyS', sequenceNumber});
  }
  if (keys.d.pressed) {
    sequenceNumber++;
    playerInputs.push({sequenceNumber, dx: SPEED, dy: 0});
    frontendPlayers[socket.id].x += SPEED;
      socket.emit('keydown', {keycode: 'KeyD', sequenceNumber});
  }
}, 15);

window.addEventListener('keydown', (event) => {
  if (!frontendPlayers[socket.id]) {
    return;
  }
  switch(event.code) {
    case 'KeyW':
      keys.w.pressed = true;
      break;
    case 'KeyA':
      keys.a.pressed = true;
      break;
    case 'KeyS':
      keys.s.pressed = true;
      break;
    case 'KeyD':
      keys.d.pressed = true;
      break;
    }
})

window.addEventListener('keyup', (event) => {
  if (!frontendPlayers[socket.id]) {
    return;
  }
  switch(event.code) {
    case 'KeyW':
      keys.w.pressed = false;
      break;
    case 'KeyA':
      keys.a.pressed = false;
      break;
    case 'KeyS':
      keys.s.pressed = false;
      break;
    case 'KeyD':
      keys.d.pressed = false;
      break;
    }
})

document.querySelector('#usernameForm').addEventListener('submit', (event) => {
  event.preventDefault();
  document.querySelector('#usernameForm').style.display = 'none';
  const username = document.querySelector('#usernameInput').value
  socket.emit('initGame', {
    username,
    width: canvas.width,
    height: canvas.height,
    devicePixelRatio
  });
})
