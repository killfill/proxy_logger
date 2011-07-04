var logger = require('./logger.js');
var memory = require('./memory');

stats = {
	
		build: function(key) {
			var data = stats.map(key, 'took');
			return stats.show(data);
		},
		
		//Map the data. key is the key of the request header. val is the value.
		map: function(key, val) {
			return memory.eventBuffer.map(function(i) { 
				if (i.state=='response' && i.statusCode==200 && !i.response.isSoapFault) 
					return {key: i.request.headers[key], value: i[val]} 
			}).compact();
		},
		
		//key: key of the request header
		show: function(data) {
			var _data = data.reduceToHash('key', 'value');
			var result = {}
			for (i in _data) {
				var s = _data[i].stats();
				result[i] = { 
					std: helper.round(s.std),
					avg: helper.round(s.avg),
					total: s.total
				};
			}
			return result;		
		}
	}

helper = {
	
	stats: stats,
	
	round: function(n, precision) {
		if (typeof precision == 'undefined') precision = 2;
		precision = Math.pow(10, precision);
		return Math.round(n*precision)/precision;
	},
	
	getFileName: function(context) {
		var dir = 'data/' + helper.humanDate(new Date(context.startTime));
		return dir + '/' + context.id+'.'+context.state+'.'+context.mimeTypeExtension;
	},
	
	humanDate: function(d) {
		if (typeof d == 'undefined')
	    	d = new Date();

		return d.getFullYear() + '-' + helper.twoDigits(d.getMonth() + 1) + '-' + helper.twoDigits(d.getDate());	
	},
	
	humanTime: function(d) {
			if (typeof d == 'undefined')
	        	d = new Date();
	        return helper.twoDigits(d.getHours()) + ':' + helper.twoDigits(d.getMinutes()) + ':' + helper.twoDigits(d.getSeconds());
	},
	
	twoDigits: function(num) {
		if (num<10)
			return '0'+num;
		else
			return num;
	},
	
	debug: function(ctx) {
		if (ctx.state=='request') {
			logger.debug('-> ' + ctx.method + ' ' + ctx.url);
			return;
		}
		logger.debug('   ' + ctx.statusCodeDescr + ' (' + ctx.statusCode + ')  ' + 'length: ' + ctx.response.size + ' -> ' + ctx.contentType);
		if (process.argv.indexOf('-v')>-1 && ctx.contentType.indexOf('text')>=0 && ctx.response.size>0 && ctx.statusCode==200) {
			logger.debug('   Took: ' + ctx.took + ' [s]');
			logger.debug('   Content: ' + ctx.data);
		}
	}	,
	
	
	
}


exports.helper = helper;
exports.stats = stats;