const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const activeRooms = new Map(); // roomCode -> hostSocketId

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('create-room', () => {
        const roomCode = generateRoomCode();
        activeRooms.set(roomCode, socket.id);
        socket.join(roomCode);
        socket.emit('room-created', { roomCode });
        console.log(`Room created: ${roomCode} by host: ${socket.id}`);
    });

    socket.on('join-room', ({ roomCode }) => {
        if (activeRooms.has(roomCode)) {
            socket.join(roomCode);
            const hostId = activeRooms.get(roomCode);
            socket.emit('room-joined', { roomCode, hostId });
            io.to(hostId).emit('viewer-joined', { viewerId: socket.id });
            console.log(`Client ${socket.id} joined room ${roomCode}`);
        } else {
            socket.emit('error-msg', 'অবৈধ বা মেয়াদোত্তীর্ণ পিন কোড!');
        }
    });

    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        for (let [code, hostId] of activeRooms.entries()) {
            if (hostId === socket.id) {
                activeRooms.delete(code);
                io.to(code).emit('host-disconnected');
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Remote Screen Server running on port ${PORT}`);
});

