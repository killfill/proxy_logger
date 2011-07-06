var express = require('express')
  , sio = require('socket.io')
  , memory = require('./memory')
  , helper = require('./helper');

var app = module.exports = express.createServer();

app.configure(function() {
    app.use(express.static(__dirname + '/../public', {maxAge: 31557600000}))
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

  socket.on('send stats', function(data, cb) {
    var res = helper.buildStats(memory.buffer, data.key);
    cb({
        data: res
      , date: new Date()
      , total: memory.buffer.length
      , first: memory.buffer[0].startTime
      , last: memory.buffer[memory.buffer.length-1].startTime
    });
  });

});
