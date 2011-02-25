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

var argv = require('optimist')
			.default('control', 8099)
			.default('port', 9099)
			.default('proxyhost', false)
			.default('proxyport', 8080)
			.default('defaultmime', 'xml')
			.default('logconsole', 'true')
			.default('logfile', 'true')

			.default('remember', 4000)
			.default('sendlasttime', 1000*3*60*60)
			.usage('Usage: $0 opts') 
			.argv;

/* Configurations */
mime.define({'application/xml': ['xml', 'asmx', 'ashx']});
mime.default_type = mime.types[argv.defaultmime];
memory.use(argv);
logger.use({console: argv.logconsole=='true', file: argv.logfile=='true'});
proxy.use(argv);


process.on('uncaughtException', function(err) {
	logger.error(err);
});

proxy.createHttpProxy(function(context, data) {

	helper.debug(context);
	context[context.state]._fileName = helper.getFileName(context);
	
	//if content is Soap, check if its a soap fault.
	if (context.state=='response' && context.statusCode==200 && 
		context.mimeType=="application/xml")
		context.response.isSoapFault = data.toString('utf8').indexOf(':Fault ')>-1;
	
	memory.saveEvent(context, data);
	socket.broadcast(context);
	
}).listen(argv.port);

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



controlServer.listen(argv.control);
var socket = io.listen(controlServer);

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
	
})

logger.info('Starting proxy on :' + argv.port + ', control on :'+ argv.control);
if (argv.proxyhost) logger.info('Using proxy '+argv.proxyhost + ':'  + argv.proxyport);
