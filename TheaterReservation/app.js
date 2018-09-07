// 모듈 추출
var http = require("http");
var express = require("express");
var socketio = require("socket.io");
var fs = require("fs");

// 변수 선언
var moviesSchedule = [
    { title: "독쩐", timetable: ["08:00", "13:00", "17:00", "22:00"] },
    { title: "레드풀", timetable: ["11:00", "14:00", "20:00", "24:00"] },
    { title: "버님", timetable: ["09:30", "11:00", "13:30", "15:00", "17:00"] },
    { title: "어벤져스5", timetable: ["07:30", "10:00", "14:00", "18:00", "22:30"] },
];

var seats = [
    [1,1,0,3,3,0,0,0,0,1,1,0,1,1],
    [1,1,0,1,1,3,3,1,1,1,1,0,1,1],
    [1,1,0,1,1,1,1,1,1,1,1,0,1,1],
    [1,1,0,1,1,1,1,1,1,1,1,0,1,1],
    [1,1,0,1,1,1,1,1,1,1,1,0,3,3],
    [1,1,0,1,1,1,1,1,1,1,1,0,1,1],
    [1,1,0,1,1,1,1,1,1,1,1,0,1,1],
    [1,1,0,1,1,1,1,1,1,1,1,0,1,1],
    [1,1,0,1,1,1,1,1,1,1,1,0,1,1],
    [1,1,0,1,1,1,1,1,1,1,1,0,1,1],
    [1,1,0,1,1,3,3,1,1,1,1,0,1,1],
    [1,1,0,1,3,3,3,3,1,1,1,0,1,1],
];

// 영화 스케줄 마다 좌석 정보를 생성합니다.
var createSeatsData = function () {
    var seatsData = {};
    for (var item of moviesSchedule) {
        item.timetable.forEach(function (schedule) {
            seatsData[item.title.concat("&", schedule)] = randomSeats();
        });
    }
    return seatsData;
};

// 임의의 좌석 정보를 만듭니다.
function randomSeats () {
    var newRows = []; 
    seats.forEach(function (line) {
        var newColumns = [];
        line.forEach(function (seat) {
            newColumns.push((seat === 0)? 0 : Math.ceil(Math.random()*2));
        });
        newRows.push(newColumns);
    });
    return newRows;
}

// 웹 서버 생성
var app = express();
var server = http.createServer(app);
var seatsData = createSeatsData();

// 라우트 정의
app.get("/", function (req, res, next) {
    fs.readFile("HTMLPage.html", function (err, data) {
        res.send(data.toString());
    });
});

app.get("/seats", function (req, res, next) {
    var movieTitle = req.query.movieTitle;
    var schedule = req.query.schedule;

    if (movieTitle && schedule) {
        res.send(seatsData[movieTitle.concat("&", schedule)]);
    }
    else {
        // res.send(seats);
    }
});

app.get("/coupleSeat", function (req, res, next) {
    var movieTitle = req.query.movieTitle;
    var schedule = req.query.schedule;

    if (movieTitle && schedule) {
        res.send(seatsData[movieTitle.concat("&", schedule)]);
    }
    else {
        // res.send(seats);
    }
});

app.get("/movies_schedule", function (req, res, next) {
    res.send(moviesSchedule);
});

// 웹 서버 실행
server.listen(51515, function() {
    console.log("Server Running at http:/127.0.0.1:51515");
});

// 소켓 서버 생성 및 실행
var io = socketio.listen(server);
io.sockets.on("connection", function (socket) {
    // 좌석 예약
    socket.on("reserve", function (data) {
        if (data.movieTitle && data.schedule) {
            seatsData[data.movieTitle.concat("&", data.schedule)][data.y][data.x] = 2;
            io.sockets.emit("reserve", data);
        }
    });

    // 좌석 예약 취소
    socket.on("cancel", function (data) {
        if (data.movieTitle && data.schedule) {
            seatsData[data.movieTitle.concat("&", data.schedule)][data.y][data.x] = 1;
            io.sockets.emit("cancel", data);
        }
    });

    // 커플좌석 예약
    socket.on("coupleReserve", function (data) {
        if (data.movieTitle && data.schedule) {
            seatsData[data.movieTitle.concat("&", data.schedule)][data.y][data.x] = 3;
            io.sockets.emit("reserve", data);
        }
    });
});