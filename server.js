const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
    socket.on('create-room', () => {
        const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
        rooms[roomCode] = socket.id;
        socket.join(roomCode);
        socket.emit('room-created', { roomCode });
    });

    socket.on('join-room', ({ roomCode }) => {
        const hostId = rooms[roomCode];
        if (hostId) {
            socket.join(roomCode);
            socket.emit('room-joined', { hostId });
            io.to(hostId).emit('viewer-joined', { viewerId: socket.id });
        } else {
            socket.emit('error-msg', 'Invalid Pin Code!');
        }
    });

    socket.on('signal', ({ to, signal }) => {
        io.to(to).emit('signal', { from: socket.id, signal });
    });

    socket.on('disconnecting', () => {
        for (const room of socket.rooms) {
            socket.to(room).emit('peer-disconnected');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
