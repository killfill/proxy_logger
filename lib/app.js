var http = require('http')
  , proxy = require('./proxy')
  , memory = require('./memory')
  , logger = require('./logger')
  , web = require('./web');

var config = {}

exports.configure = function(conf) {
  config = conf || {};

  logger.configure(config);
  memory.configure(config);
  proxy.configure(config);

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

  logger.debug('   ' + info.statusCode + ' - '+info.statusCodeDesc+' [' +info.response.size+'kb '+info.took+'s]' );

  //Check if its a soap fault.
  if (info.statusCode==200 && info.mimeType=="application/xml")
    info.response.isSoapFault = data.toString('utf8').indexOf(':Fault ')>-1;

  memory.save('response', data, info);
  memory.addInfo(info);
  web.io.sockets.emit('response', info);

});


exports.start = function() {

  httpProxy.listen(config.proxyport);
  web.listen(config.controlport);

  logger.info('Starting proxy on :' + config.proxyport + ', control on :'+ config.controlport);
  if (config.remoteproxyhost) logger.info('Using proxy '+config.remoteproxyhost + ':'  + config.remoteproxyport);

}
