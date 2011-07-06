var http = require('http')
  , mime = require('mime')
  , proxy = require('./proxy')
  , memory = require('./memory')
  , _ = require('./extensions')
  , helper = require('./helper').helper
  , logger = require('./logger')
  , web = require('./web');

var config = {}

exports.configure = function(conf) {

  config = conf || {};

  //Default mime type.
  //mime.define({'application/xml': ['xml', 'asmx', 'ashx']}); es necesario?...
  mime.default_type = mime.types[config.defaultmime];

  logger.configure(config);
  memory.configure(config);

  if (!config.die)
    process.on('uncaughtException', function(err) {
      logger.error(err);
    });
}

var httpProxy = exports.proxy = proxy.create(config);

httpProxy.on('request', function(data, req, res, info) {
  logger.debug('-> '+ info.method+ ' '+ info.url+ ' ['+info.request.size+'kb]');
  memory.save('request', data, info);
  web.io.sockets.emit('request', info);
});

httpProxy.on('response', function(data, req, res, info) {
  logger.debug('   ' + info.statusCode + ' - '+info.statusCodeDesc+' [' +info.response.size+'kb '+info.response.took+'s]' );

  //Check if its a soap fault.
  if (info.statusCode==200 && info.mimeType=="application/xml")
    info.response.isSoapFault = data.toString('utf8').indexOf(':Fault ')>-1;

  memory.save('response', data, info);

  //Remember in buffer only response events
  memory.addInfo(info);

  web.io.sockets.emit('response', info);
});

exports.start = function() {
  httpProxy.listen(config.proxyport);
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

