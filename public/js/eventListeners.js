addEventListener('click', (event) => {
  if (frontendPlayers[socket.id]) {
    const playerPosition = {
        x: frontendPlayers[socket.id].x,
        y: frontendPlayers[socket.id].y
    }
    const angle = Math.atan2(
      event.clientY * devicePixelRatio - playerPosition.y,
      event.clientX * devicePixelRatio - playerPosition.x
    )
    socket.emit('shoot', {
      x: playerPosition.x,
      y: playerPosition.y,
      angle
    })
  }
})
