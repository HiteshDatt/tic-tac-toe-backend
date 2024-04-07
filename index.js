const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
require('dotenv').config();


const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN
    }
});


let rooms = {};
const maxplayersInRoom = 2;
let socketRoomMap = {};

app.get('/', (req, res) => {
    res.status(200).send({ "message": "OK" })
});

app.get('/rooms', (req, res) => {
    res.status(200).send({ rooms })
});

app.get('/players', (req, res) => {
    res.status(200).send({ socketRoomMap })
});

app.get('/delete-rooms', (req, res) => {
    rooms = {}
    socketRoomMap = {}
    res.status(200).send({ rooms, socketRoomMap });
});



io.on('connection', (socket) => {

    socket.on('join-room', ({ roomID }) => {
        if (rooms[roomID]?.playerCount) {
            rooms[roomID].playerCount++
        } else {
            rooms[roomID] = {
                playerCount: 1
            }
        }

        if (rooms[roomID]?.playerCount === maxplayersInRoom) {
            socket.join(roomID);
            socketRoomMap[socket.id] = roomID;
            io.to(roomID).emit('room-joined', { roomID });
            io.to(roomID).emit('start-game', { roomID });
            socket.to(roomID).emit("your-turn");
        } else if (rooms[roomID]?.playerCount > maxplayersInRoom) {
            rooms[roomID].playerCount = maxplayersInRoom;
            const tempRoom = `${roomID}_${new Date().getTime()}`;// random temporary room
            socket.join(tempRoom);
            io.to(tempRoom).emit('room-full', { roomID });
            socket.leave(tempRoom);
        }
        else {
            socket.join(roomID);
            socketRoomMap[socket.id] = roomID;
            io.to(roomID).emit('room-joined', { roomID });
        }
    });

    socket.on('played', ({ columnIndex, rowIndex, roomID }) => {
        io.to(roomID).emit('played', { columnIndex, rowIndex });
        socket.to(roomID).emit("your-turn");
    });

    socket.on('disconnect', () => {
        const roomID = socketRoomMap[socket.id];
        if (roomID) {
            io.to(roomID).emit('room-left', { roomID });
            delete socketRoomMap[socket.id];
            delete rooms[roomID];
        }
    });

});



server.listen(4000, () => {
    console.log('listening on *:4000');
});