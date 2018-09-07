var fs = require("fs");
var server = require("http").createServer();
var mysql = require("mysql");

server.addListener("request", function (req, res) {
    fs.readFile("HTMLPage.html", function (err, data) {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(data);
    });
}).listen(51515, function () {
    console.log("Server Running at http://127.0.0.1:51515");
});

// DB client 연결 생성
var dbClient = mysql.createConnection({
    user: "<userId>",     // DB userId
    password: "<password>",    // DB userId's password
    database: "webchatting",  // DB name
});

var io = require("socket.io")(server);

var roomList = [];

io.on("connect", function (socket) {
    var roomName = {};

    // 대화방 목록을 송신합니다.
    socket.emit("roomlist", roomList);
    
    // room 생성, room 목록을 송신합니다.
    socket.on("join", function (data) {
        console.log("add room: ",data);

        roomName = data;
        socket.join(data.room);

        if (roomList.findIndex( function (item) {
            return (item.room === data.room);
        }) < 0) {
            roomList.push(data);
            // console.log(io.sockets.adapter.rooms);
            console.log("room list: ", roomList);
            
            io.sockets.emit("roomlist", roomList);
        }
    });
    
    // 대화방을 나갑니다.
    socket.on("leave", function (data) {
        socket.leave(roomName.room);
        
        // 대화방에 모든 client가 나간다면 대화방 목록을 삭제 할 수 있겠는데.. 어떻게 해야 할까?
        // roomList.pop(roomName);

        console.log("leave ",data,", Current Rooms: ",roomList);
    });

    // 한 Client의 message를 수신하면 모든 Client에게 송신합니다.
    socket.on("message", function (data) {
        // message를 webchatting DB에 저장합니다.
        writeChatTable(data, roomName.room);

        // 모든 Client에게 message 송신합니다.
        // io.sockets.emit("message", data);

        // 대화방 Client에게 message 송신합니다.
        io.sockets.in(roomName.room).emit("message", data);
    });
});

    // 데이터베이스에 대화 내용 저장한다.
    // 1. 전체 대화내용을 하나의 테이블에 저장
    function writeChatTable (data, roomName) {
        dbClient.query("INSERT INTO history (room, name, content, datetime) VALUES (?, ?, ?, ?)", [roomName, data.name, data.message, new Date(data.date)], function (err) {
            if (err) 
                console.log(err);
            else
                console.log("Success DB Write.");
        });
    }

    // 2. 대화방마다 테이블을 생성하여 대화내용 저장