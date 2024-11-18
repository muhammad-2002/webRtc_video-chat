const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); 

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
    socket.to(room).emit('peer-connected', { id: socket.id });
  });

  socket.on('offer', (data) => {
    socket.to(data.to).emit('offer', { offer: data.offer, from: socket.id });
  });

  socket.on('answer', (data) => {
    socket.to(data.to).emit('answer', { answer: data.answer, from: socket.id });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.to).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
  });

  socket.on('chat-message', (data) => {
    socket.to(data.room).emit('chat-message', { message: data.message, from: data.from });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    socket.broadcast.emit('peer-disconnected', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
