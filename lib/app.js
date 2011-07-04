var http = require('http'),
	url = require('url'),
	path = require('path'),
	fs = require('fs'),
	mime = require('mime'),
	io = require('socket.io'),
	proxy = require('./proxy'),
	memory = require('./memory'),
	_ = require('./extensions.js'),
	helper = require('./helper.js').helper,
	logger = require('./logger');


var config = {};

exports.init = function(_config) {

  //Default mime type.
  mime.define({'application/xml': ['xml', 'asmx', 'ashx']});
  mime.default_type = mime.types[_config.defaultmime];

  //Log 
  logger.init({console: _config.logconsole=='true'});

  //The proxy
  proxy.use({proxyhost: _config.remoteproxyhost, proxyport: _config.remoteproxyport});

  //Die on error
  if (!_config.die)
    process.on('uncaughtException', function(err) {
      logger.error(err);
    });

  config = _config;

}

var proxyServer = proxy.createHttpProxy(function(context, data) {

  helper.debug(context);
  context[context.state]._fileName = helper.getFileName(context);

  //if content is Soap, check if its a soap fault.
  if (context.state=='response' && context.statusCode==200 && context.mimeType=="application/xml")
    context.response.isSoapFault = data.toString('utf8').indexOf(':Fault ')>-1;
	
  memory.saveEvent(context, data);
  //socket.broadcast(context);
	
});

var controlServer = http.createServer(function(req, res){
	
	var _url = url.parse(req.url);
	var fileToRead = 'public' + (_url.pathname=="/" ? '/index.html': _url.pathname);
	
	fs.stat(fileToRead, function(err, s) {
		if (err) {
			//console.log('--> 404 '+fileToRead + ' Error: '+err);
			res.writeHead(404);
			res.end('Huh?...');
		}
		else {
			//console.log('--> 200 '+fileToRead + ' mime: ' + mType);
			res.writeHead(200, {'content-type': mime.lookup(fileToRead)});
			var content = fs.readFileSync(fileToRead);
			res.end(content);
		}
	});
	
});


exports.start = function() {
  proxyServer.listen(config.proxyport);
  controlServer.listen(config.controlport);

  logger.info('Starting proxy on :' + config.proxyport + ', control on :'+ config.controlport);
  if (config.proxyhost) logger.info('Using proxy '+config.remoteproxyhost + ':'  + config.remoteproxyport);
}

//var socketOptions = {
//	transports: [ 'websocket', /*'flashsocket'*/, 'htmlfile', 'xhr-multipart', 'xhr-polling']
//};
/*
var socket = io.listen(controlServer, socketOptions);
socket.on('connection', function(client) {
	var hoursAgo = new Date().getTime() - argv.sendlasttime;
	memory.eventBuffer.forEach(function (ev) {
		if (hoursAgo>ev.id) return;
		client.send(ev);
	});
	client.on('message', function(msg) {
		switch (msg.type) {
			case 'stats':
				var res = helper.stats.build(msg.key);
				client.send({state: 'stats', data: res, date: new Date(), total: memory.eventBuffer.length, first: memory.eventBuffer.first().id, last: memory.eventBuffer.last().id})
				break;
			default:
				log.error("What means '"+msg.type+"' ?..." + msg);
				break;
		}
	})
	
})*/

