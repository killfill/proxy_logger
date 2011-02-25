var util = require('util'),
	http = require('http'),
	mime = require('mime'),
	logger = require('./logger'),
	url  = require('url');

mime.define({'application/xml': ['xml', 'asmx', 'ashx']});

var config = {}

exports.use = function(conf) {
	config = conf || {}
}


createProxy = function(req, res, callback) {

	var parsedUrl = url.parse(req.url);
	var pathName = parsedUrl.pathname || 'index.html';
	var mimeType = mime.lookup(pathName=='/'? 'index.html' : pathName);

	var context = {
		id: new Date().getTime(),
		method: req.method,
		url: req.url,
		mimeType : mimeType,
		mimeTypeExtension : mime.extensions[mimeType],
		state : 'start',
		startTime : new Date().getTime(),
		request : {
			headers: req.headers,
			remoteAddress: req.socket.remoteAddress,
			remotePort: req.socket.remotePort,
		},
		response: {
			remoteAddress: parsedUrl.hostname,
			remotePort: parsedUrl.port || 80,
		}
	}
	
	if ('accept-encoding' in req.headers && req.headers['accept-encoding'].indexOf('gzip') > -1)
	 	req.headers['accept-encoding'] = '';
	
	var requestOpts = {
		host: context.response.remoteAddress,
		port: context.response.remotePort,
		method: req.method,
		path: parsedUrl.href,
		headers: req.headers
	};
	
	if (config.proxyhost) {
		requestOpts.host = config.proxyhost;
		requestOpts.port = config.proxyport;
	}
	
	var proxyReq = http.request(requestOpts, function(proxyResp) {

		var contentType = proxyResp.headers['content-type'] || 'unknown';
		var respSize = proxyResp.headers['content-length'] || '1048576' //1M

		respSize = parseInt(respSize);

		context.statusCode = proxyResp.statusCode;
		context.statusCodeDescr = http.STATUS_CODES[proxyResp.statusCode];
		context.contentType = contentType;
		context.response.headers = proxyResp.headers;
		context.response.size = respSize / 1000;
		
		res.writeHead(proxyResp.statusCode, proxyResp.headers);
		
		var buffer = new Buffer(respSize);
		var bufferIdx = 0;
		proxyResp.on('data', function(data) {
			if (bufferIdx + data.length > buffer.length) {
				logger.error('Buffer went short!');
				process.exit(1);
			}

			data.copy(buffer, bufferIdx, 0, data.length);
			bufferIdx += data.length;
			res.write(data);
		});

		proxyResp.on('end', function() {
			context.state = 'response';
			context.response.time = new Date().getTime();
			context.response.took = (context.response.time-context.request.time)/1000;
			context.took = (context.response.time-context.startTime)/1000;
			res.end();
			callback(context, buffer, req, res);
		});
	
		
		
	});
	
	proxyReq.on('error', function(err) {
		res.writeHeader(503);
		res.end();
		context.statusCode = 503;
		context.statusCodeDescr = http.STATUS_CODES[context.statusCode];
		context.response.size = 0;
		
		context.state = 'error';
		context.response.time = new Date().getTime();
		context.response.took = (context.errorTime - context.startTime)/1000;
		context.errorMsg = err.message,
		callback(context, err.message, req, res);
	})
		
	//From the client to the server
	var requestBuffer = new Buffer(parseInt(req.headers['content-length']) || 1048576);
	var requestBufferIdx = 0;
	req.on('data', function(data) {
		data.copy(requestBuffer, requestBufferIdx, 0, data.length);
		requestBufferIdx += data.length;
		proxyReq.write(data);
	});
	
	req.on('end', function() {
		context.state = 'request';
		context.request.time = new Date().getTime();
		context.request.took = (context.request.time - context.startTime) / 1000
		context.request.size = requestBuffer.length/1000;
		proxyReq.end();
		callback(context, requestBuffer, req, res);
	});
		
}


exports.createHttpProxy = function(callback) {

	return http.createServer(function(req, res) {
		createProxy(req, res, callback);
	});
	
};

