const path = require('path');
const chalk = require('chalk');
const http = require('http');
const server = http.createServer();
const port = process.env.PORT || 1337;
const express = require('express');
const app = express();
const socketio = require('socket.io');
const { Maps, randomGeneration } = require('./maps/map');
const { updatePlayers, removePlayer, killPlayer } = require('./players/action-creator');
const { addBomb, updateBombPositions, removePlayerBombs, removeBomb } = require('./bombs/action-creator')
const { updateMap, loadMap } = require('./maps/action-creator')
const { setTime } = require('./timer/action-creator')
const { roomName, convertStateForFrontEnd } = require('./utils')

const store = require('./store')
const worldNames = require('./world-names')
server.on('request', app);


// creates a new connection server for web sockets and integrates
// it into our HTTP server
const io = socketio(server)

//  use socket server as an event emitter in order to listen for new connctions
io.on('connection', (socket) => {
  delete socket.adapter.rooms[socket.id]
  let rooms = io.sockets.adapter.rooms;
  let { currentRoomName, createdRoom } = roomName(socket, rooms)

  socket.join(currentRoomName);
  socket.currentRoom = currentRoomName;

  let currState;

  if (createdRoom) {
    let randomMap = randomGeneration(Maps)
    store.dispatch(loadMap(randomMap, socket.currentRoom))
    let currentTime = Date.now();

    store.dispatch(setTime(currentTime, 180, socket.currentRoom))

    currState = convertStateForFrontEnd(store.getState(), socket.currentRoom);
    socket.emit('initial', currState);
  } else {
    currState = convertStateForFrontEnd(store.getState(), socket.currentRoom);
    socket.emit('initial', currState);
  }

  console.log(chalk.blue('A new client has connected'));
  console.log(chalk.yellow('socket id: ', socket.id));

  socket.on('get_players', () => {
    socket.emit('get_players', store.getState().players[socket.currentRoom]);
  })

  socket.on('update_world', (data) => {
    store.dispatch(updatePlayers({ id: data.playerId, position: data.playerPosition, dead: data.dead }, socket.currentRoom));
    store.dispatch(updateBombPositions({ userId: data.playerId, bombs: data.playerBombs }, socket.currentRoom))

    let newState = convertStateForFrontEnd(store.getState(), socket.currentRoom)
    io.in(socket.currentRoom).emit('update_world', newState)
  })

  //add new bomb to the state when a player clicks
  socket.on('add_bomb', (data) => {
    store.dispatch(addBomb(data, socket.currentRoom))
    io.in(socket.currentRoom).emit('update_bomb_positions', store.getState().bombs[socket.currentRoom])
  })

  //kill player on bomb collision
  socket.on('kill_player', (data) => {
    store.dispatch(killPlayer(data.id, socket.currentRoom))
    io.in(socket.currentRoom).emit('kill_player', data.id)
    let currentState = store.getState();
    let newState = convertStateForFrontEnd(currentState, socket.currentRoom)
    io.in(socket.currentRoom).emit('update_world', newState)
  })

  socket.on('destroy_cube', (data) => {
    store.dispatch(updateMap(data, socket.currentRoom))
  })

  socket.on('reset_world', (data) => {
    let newMap = randomGeneration(Maps)
    store.dispatch(loadMap(newMap, socket.currentRoom))
    let state = store.getState()

    io.in(socket.currentRoom).emit('reset_world', {
      players: state.players[socket.currentRoom],
      bombs:  {},
      map: state.map[socket.currentRoom],
      timer: state.timer[socket.currentRoom],
      winner: null
    })
  })

  //remove the player from the state on socket disconnect
  socket.on('disconnect', () => {
    store.dispatch(removePlayer(socket.id, socket.currentRoom))
    store.dispatch(removePlayerBombs(socket.id, socket.currentRoom))

    io.in(socket.currentRoom).emit('remove_player', socket.id)
    console.log('socket id ' + socket.id + ' has disconnected. : (');
  })

})

app.use(express.static(path.join(__dirname, '..', 'public', 'assets')));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

server.listen(port, function() {
  console.log(`The server is listening on port ${port}!`);
});
