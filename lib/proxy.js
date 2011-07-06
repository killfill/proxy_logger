var util = require('util')
  , http = require('http')
  , mime = require('mime')
  , url  = require('url')
  , events = require('events')
  , logger = require('./logger')


exports.configure = function(config) {
  mime.define({'application/xml': ['xml', 'asmx', 'ashx']});
  mime.default_type = mime.types[config.defaultmime];
};

var HttpProxy = function(opts) {
  events.EventEmitter.call(this);
  this.config = opts || {}

  //Why doesnt this.server = http.createServer.call(this, this.newRequest) work?...
  var self = this;
  this.server = http.createServer(function(req, res) {
    self.handleRequest.call(self, req, res)
  });
}
HttpProxy.prototype = new events.EventEmitter;

HttpProxy.prototype.handleRequest = function(req, res) {

  var self = this;

//  Dont we like gzip?..
//  if ('accept-encoding' in req.headers && req.headers['accept-encoding'].indexOf('gzip') > -1)
//    req.headers['accept-encoding'] = '';

  /* Build the request options */
  var parsedUrl = url.parse(req.url);
  var requestOpts = {
      host: parsedUrl.hostname
    , port: parsedUrl.port || 80
    , method: req.method
    , path: parsedUrl.href
    , headers: req.headers
  }
  if (this.config.remoteproxyhost) {
    requestOpts.host = config.remoteproxyhost;
    requestOpts.port = config.remoteproxyport;
  }

  /* Define de info object, that gives info about the proxy requests */
  var pathName = parsedUrl.pathname || 'index.html';
  var mimeType = mime.lookup(pathName=='/'? 'index.html' : pathName);
  var info = {
      id: new Date().getTime()
    , startTime: new Date().getTime()
    , method: req.method
    , url: req.url
    , mimeType : mimeType
    , mimeTypeExtension : mime.extensions[mimeType]
    , request : {
        headers: req.headers
      , remoteAddress: req.socket.remoteAddress
      , remotePort: req.socket.remotePort
    }
    , response: {
        remoteAddress: parsedUrl.hostname
      , remotePort: parsedUrl.port || 80
    }
  };

  /* Build the request */
  var remoteReq = http.request(requestOpts, function(remoteRes) {

    res.writeHead(remoteRes.statusCode, remoteRes.headers);
    util.pump(remoteRes, res);

    var buffer = new Buffer(parseInt(remoteRes.headers['content-length']||2*1024*1024))
      , bufferIdx = 0;

    remoteRes.on('data', function(chunk) {
      if (bufferIdx + chunk.length > buffer.length) {
        console.error('buffer went short, saved response will not be good');
	return;
      }
      chunk.copy(buffer, bufferIdx, 0, chunk.length);
      bufferIdx += chunk.length
    });

    remoteRes.on('end', function() {
      info.took = (new Date().getTime() - info.startTime) / 1000;
      info.response.size = buffer.length/1000;
      info.response.headers = remoteRes.headers;
      info.statusCode = remoteRes.statusCode;
      info.statusCodeDesc = http.STATUS_CODES[remoteRes.statusCode];

      self.emit('response', buffer, remoteReq, remoteRes, info);
    });

  });

  remoteReq.on('error', function(err) {
    res.writeHeader(504);
    res.end();
    info.took = (new Date().getTime() - info.startTime) / 1000;
    info.statusCode = 504;
    info.statusCodeDesc = http.STATUS_CODES[504];
    info.errorMsg = err.message;
    self.emit('error', err, remoteReq, info);
  });

  /* Pass to the server, data from the client */
  util.pump(req, remoteReq);

  var buffer = new Buffer(parseInt(req.headers['content-length']||0))
    , bufferIdx = 0;

  req.on('data', function(chunk) {
    chunk.copy(buffer, bufferIdx, 0, chunk.length);
    bufferIdx += chunk.length;
  });

  req.on('end', function() {
    info.request.took = (new Date().getTime() - info.startTime) / 1000;
    info.request.size = buffer.length/1000;
    self.emit('request', buffer, req, res, info);
  });

}

HttpProxy.prototype.listen = function(port, ip) {
  this.server.listen(port, ip||'0.0.0.0');
}

exports.create = function(opts) {
  return new HttpProxy(opts);
}
