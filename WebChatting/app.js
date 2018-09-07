var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require("mysql");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);


// DB client 연결 생성
var dbClient = mysql.createConnection({
  user: "<userId>",     // DB userId
  password: "<password>",    // DB userId's password
  database: "webchatting",  // DB name
});

app.io = require("socket.io")();

var roomList = [];

app.io.on("connect", function (socket) {
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
          // console.log(app.io.sockets.adapter.rooms);
          console.log("room list: ", roomList);
          
          app.io.sockets.emit("roomlist", roomList);
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
      // app.io.sockets.emit("message", data);

      // 대화방 Client에게 message 송신합니다.
      app.io.sockets.in(roomName.room).emit("message", data);
  });
});

// 데이터베이스에 대화 내용 저장한다.
// 1. 전체 대화내용을 하나의 테이블에 저장
function writeChatTable (data, roomName) {
    dbClient.query("INSERT INTO history (room, name, content, datetime)VALUES (?, ?, ?, ?)", [roomName, data.name, data.message, new Date(data.date)], function (err) {
        if (err) 
            console.log(err);
        else
            console.log("Success DB Write.");
    });
}

// 2. 대화방마다 테이블을 생성하여 대화내용 저장

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
