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

//Build http request, based on the original request...
HttpProxy.prototype.buildRequest = function(req) {
  var parsedUrl = url.parse(req.url);
  var opts = {
      host: parsedUrl.hostname
    , port: parsedUrl.port || 80
    , method: req.method
    , path: req.url
    , headers: req.headers
  }
  if (this.config.remoteproxyhost) {
    opts.host = config.remoteproxyhost;
    opts.port = config.remoteproxyport;
  }

  return http.request(opts);
}

HttpProxy.prototype.handleRequest = function(req, res) {
  var self = this;

//  Dont we like gzip?..
//  if ('accept-encoding' in req.headers && req.headers['accept-encoding'].indexOf('gzip') > -1)
//    req.headers['accept-encoding'] = '';
  
  var remoteReq = this.buildRequest(req);

  /* Define de info object, that gives info about proxy moves... */
  var parsedUrl = url.parse(req.url);
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

  remoteReq.on('response', function(remoteRes) {

    res.writeHead(remoteRes.statusCode, remoteRes.headers);
    util.pump(remoteRes, res);

    var remoteContentLength = remoteRes.headers['content-length'] || 2*1024*1024;

    var buffer = new Buffer(parseInt(remoteContentLength))
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
    res.writeHeader(503);
    res.end();
    info.took = (new Date().getTime() - info.startTime) / 1000;
    info.response.size = 0;
    info.statusCode = 503;
    info.statusCodeDesc = http.STATUS_CODES[503];
    info.errorMsg = err.message;
    self.emit('response', err, remoteReq, null, info);
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
