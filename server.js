var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.use(express.static(__dirname + '/'));

var roomQueue = [];
var roomQueueFull = [];
var counterRooms = 0;
//key:value  --> key:client , value:room's client
var usersConnected = {};

//Socket = Server ?

//Socket = Server !
io.on('connection', function (socket) {

    //Sinvoller Console Log
    console.log("Client " + socket.id + " connected");

    //startet den server
    socket.on('start', function (playerData) {

        //Erstellt Räume
        counterRooms += 1;
        roomName = "room" + counterRooms;
        usersConnected[socket.id] = roomName;

        //Wenn kein Räume da sind 
        if (roomQueue[0]) {

            //Erstellt ein Räume
            var room = roomQueue.shift();
            var clientsInRoom = io.sockets.adapter.rooms[room];

            //Wenn Raum ist Voll 0 und 1 also wenn zwei spieler da 
            if (clientsInRoom.length == 1) {

                //Raum wird auf die Raum Voll liste gepusht
                roomQueueFull.push(room);
            }

            //Verbindet Client mit Raum
            usersConnected[socket.id] = room;
            socket.join(room);

            //Sendet dem Info das er in einem Raum ist
            socket.broadcast.to(room).emit('handshake1', playerData);
        } else {

            //Wenn Räum nicht voll sind wird der nächste Client mit einem nicht vollen raum verbunden
            roomQueue.push(usersConnected[socket.id]);
            socket.join(roomName);
        }
    });

    socket.on('handshake2', function (playerData) {
        socket.broadcast.to(usersConnected[socket.id]).emit('handshake3', playerData);
        var coords = [];
        var i;
        for (i = 0; i < 50; i++) {
            var c = {
                x: Math.floor(Math.random() * 1001) - 500,
                y: 2.5,
                z: Math.floor(Math.random() * 1001) - 500
            }
            coords.push(c);
        }
        socket.broadcast.to(usersConnected[socket.id]).emit('setSpheres', coords);
        coords.forEach(function (coord) {
            coord.x = -coord.x;
            coord.z = -coord.z;
        });
        socket.emit('setSpheres', coords);
    });

    socket.on('sendUpdate', function (data) {
        socket.broadcast.to(usersConnected[socket.id]).emit('receiveUpdate', data);
    });

    socket.on('hit', function (idSphere) {
        socket.broadcast.to(usersConnected[socket.id]).emit('spherePicked', idSphere);
    });

    socket.on('gameOver', function () {
        socket.disconnect();
    });

    socket.on('disconnect', function () {
        console.log("Client " + socket.id + " disconnected");
        var roomClientRemoved = usersConnected[socket.id];
        delete usersConnected[socket.id];

        var index = roomQueueFull.indexOf(roomClientRemoved);
        if (index > -1) {
            roomQueueFull.splice(index, 1);
            roomQueue.push(roomClientRemoved);
        } else {
            index = roomQueue.indexOf(roomClientRemoved)
            if (index > -1) {
                roomQueue.splice(index, 1)
            }
        }
        socket.broadcast.to(roomClientRemoved).emit('connect', "");
    });
});

server.listen(8001, 'localhost', function () {
    var host = server.address().address
    var port = server.address().port
    console.log("\nServer running http://%s:%s", host, port)
});
