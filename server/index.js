const http = require('http');
const express = require('express');
const {Server}= require('socket.io');
const cors = require('cors');
const router = require('./router');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');
const { text } = require('stream/consumers');

const PORT = process.env.PORT || 5001;

const app = express();

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(router);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
socket.on('join', ({ name, room }, callback) => {
    const { error, user } =addUser({ id: socket.id, name, room});
    
    if(error) return callback(error);

    socket.emit('message', { user: 'admin', text: `${user.name}, welcome to the room ${user.room}` });
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!` });
    
    socket.join(room);

    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)})

    callback();
  });
    
  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    if(!user) {
      if(callback) callback('User not found');
      return;
    }

    io.to(user.room).emit('message', { user: user.name, text: message});
    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    callback();
  });
  
    socket.on('disconnect', () => {
      const user = removeUser(socket.id);

      if(user){
        io.to(user.room).emit('message', {user: 'admin', text: '${user.name} has left!'})
      }
  });
});

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));