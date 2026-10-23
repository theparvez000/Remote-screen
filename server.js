const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));

// Nodemailer Transporter Setup
// Gmail-er app password use kora recommended (বা SendGrid/Ethereal/Environment Variables)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'theparvez000@gmail.com', // Sender Email
        pass: process.env.GMAIL_APP_PASS || 'YOUR_GMAIL_APP_PASSWORD' // Replace with App Password
    }
});

// Endpoint to receive image and send via email
app.post('/send-snapshot', async (req, res) => {
    const { image, recipient } = req.body;
    if (!image) return res.status(400).json({ error: 'No image data provided' });

    try {
        const mailOptions = {
            from: 'Remote Camera Hub <theparvez000@gmail.com>',
            to: recipient || 'theparvez000@gmail.com',
            subject: '🚨 Motion Detected - Remote Camera Snapshot',
            text: 'Remote camera phone-e motion detect hoyeche! Attached snapshot-ti dekhoon.',
            attachments: [
                {
                    filename: `motion-snapshot-${Date.now()}.png`,
                    content: image.split(';base64,').pop(),
                    encoding: 'base64'
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        console.log('Snapshot email sent successfully to', recipient);
        res.json({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// Room & Socket Logic
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
