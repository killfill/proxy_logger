

var http = require('http')
  , mime = require('mime')
  , io = require('socket.io')
  , proxy = require('./proxy')
  , memory = require('./memory')
  , _ = require('./extensions')
  , helper = require('./helper').helper
  , logger = require('./logger')
  , web = require('./web');

var config = {};

exports.configure = function(conf) {

  config = conf || {};

  //Default mime type.
  //mime.define({'application/xml': ['xml', 'asmx', 'ashx']}); es necesario?...
  mime.default_type = mime.types[config.defaultmime];

  logger.configure(config);
  proxy.configure(config);

  if (!config.die)
    process.on('uncaughtException', function(err) {
      logger.error(err);
    });
}

var proxyServer = exports.proxy = proxy.createHttpProxy(function(context, data) {

  helper.debug(context);
  context[context.state]._fileName = helper.getFileName(context);

  //if content is Soap, check if its a soap fault.
  if (context.state=='response' && context.statusCode==200 && context.mimeType=="application/xml")
    context.response.isSoapFault = data.toString('utf8').indexOf(':Fault ')>-1;

  memory.saveEvent(context, data);
  //web.io.sockets.emit('request', context);
  web.io.sockets.emit(context.state, context);

});

/*
proxyServer.on('request', function() {
  helper.debug(context);
  context[context.state]._fileName = helper.getFileName(context);

  memory.saveEvent(context, data);
  web.io.sockets.emit('request', context);
});

proxyServer.on('response', function() {
  helper.debug(context);
  context[context.state]._fileName = helper.getFileName(context);

  //if content is Soap, check if its a soap fault.
  if (context.state=='response' && context.statusCode==200 && context.mimeType=="application/xml")
    context.response.isSoapFault = data.toString('utf8').indexOf(':Fault ')>-1;

  memory.saveEvent(context, data);
  web.io.sockets.emit('request', context);
});
*/

exports.start = function() {
  proxyServer.listen(config.proxyport);
  web.listen(config.controlport);

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

