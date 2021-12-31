const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

const peers = new Set();

io.on('connection', (socket) => {
    let id;
    let connected = false;

    socket.on('join', (data) => {
        id = data.id;
        console.log(`User ${id} is joining the call.`);
        
        socket.emit('send offer to', { peers: [...peers] });
        socket.broadcast.emit('joined', id);
        peers.add(id);

        connected = true;
    });

    socket.on('offer', (data) => {
        console.log(`${id} sent offer.`);
        socket.broadcast.emit('offer', { ...data, source: id });
    });

    socket.on('answer', (data) => {
        console.log(`${id} sent answer.`);
        socket.broadcast.emit('answer', { ...data, source: id });
    });

    socket.on('candidate', (data) => {
        console.log(`${id} sent new ICE candidate.`);
        socket.broadcast.emit('candidate', { ...data, source: id });
    });

    function leaveCall() {
        if (!connected) return;

        console.log(`User ${id} is leaving the call.`);
        socket.broadcast.emit('quit', id);
        peers.delete(id);

        connected = false;
        id = undefined;
    }

    socket.on('quit', leaveCall);
    socket.on('disconnect', leaveCall);
});

server.listen(5100, () => console.log('Listening on :5100'));