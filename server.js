const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));
const rooms = {}; // roomCode -> { controllerId, cameras: Set }

io.on('connection', (socket) => {
    socket.on('create-room', () => {
        const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
        rooms[roomCode] = { controllerId: socket.id, cameras: new Set() };
        socket.join(roomCode);
        socket.emit('room-created', { roomCode });
    });

    socket.on('join-room', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (room) {
            socket.join(roomCode);
            room.cameras.add(socket.id);
            io.to(room.controllerId).emit('camera-joined', { cameraId: socket.id });
            socket.emit('room-joined', { hostId: room.controllerId });
        } else {
            socket.emit('error-msg', 'Invalid Pin Code!');
        }
    });

    socket.on('signal', ({ to, signal }) => {
        io.to(to).emit('signal', { from: socket.id, signal });
    });

    // Relay chat, draw, and interactions across room
    socket.on('room-broadcast', ({ roomCode, data }) => {
        socket.to(roomCode).emit('room-broadcast', data);
    });

    socket.on('disconnecting', () => {
        for (const roomCode of socket.rooms) {
            const room = rooms[roomCode];
            if (room) {
                if (room.controllerId === socket.id) {
                    socket.to(roomCode).emit('peer-disconnected');
                    delete rooms[roomCode];
                } else if (room.cameras.has(socket.id)) {
                    room.cameras.delete(socket.id);
                    io.to(room.controllerId).emit('camera-left', { cameraId: socket.id });
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
