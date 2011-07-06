var express = require('express')
  , sio = require('socket.io')
  , memory = require('./memory');

var app = module.exports = express.createServer();

app.configure(function() {
    app.use(express.static(__dirname + '/../public', {maxAge: 31557600000}))
  , app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
});


var io = app.io = sio.listen(app);

io.configure(function() {
  //io.set('transports', ['websocket', 'flashsocket', 'xhr-polling']);
  io.set('log level', 1);
  io.enable('browser client minification');
});

io.sockets.on('connection', function(socket) {
  socket.on('send buffer', function(data, cb) {
    cb({info: memory.buffer.slice(0, data.count)});
  });
});

