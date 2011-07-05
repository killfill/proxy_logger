var express = require('express')
  , sio = require('socket.io');

var app = module.exports = express.createServer();

app.configure(function() {
    app.use(express.static(__dirname + '/../public', {maxAge: 31557600000}))
  , app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
  //, app.use(express.logger())
});


var io = app.io = sio.listen(app);  //, socketOptions

io.sockets.on('connection', function(socket) {

  socket.on('send buffer', function(data, fn) {
    fn({hola: 'sisipsipsips'});
    //socket.emit('buffer', {hola: 'chao'});
  });



});

