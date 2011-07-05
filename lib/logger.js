var inspect = require('util').inspect,
    sys = require('sys'),
	path = require('path'),
	fs = require('fs');
 
var config = {
  console: {
    enable: true
  },
  file: {
    enable: true,
    name: 'log',
    dir: './logs',
    exten: 'txt'
  }
};

exports.configure = function(conf) {
  config.console.enable = conf.logconsole;
};

//Check the log directory
 path.exists(config.file.dir, function(yep) {
	if (!yep) 
		fs.mkdirSync(config.file.dir, 0777)
 });

 function _log2File(s) {
		var fName = config.file.dir + '/' + config.file.name + '-' + helper.longHumanDate() + '.'+config.file.exten;
		fs.createWriteStream(fName, {flags: 'a'}).write(s + "\r\n");
 }
 
 function _log(level, log, detail) {

	var d = new Date();

	var s = helper.humanDate(d) + ' ' + helper.humanTime(d);
	s+= ' [' + level +'] ' +log;
	if (detail!=null)
		s+= ' detail: ' + inspect(detail);
 
	if (config.console.enable==true)
		sys.puts(s);

	if (config.file.enable==true)
		_log2File(s);
 }
 
 exports.debug = function(msg, detail) {
	_log('Debug', msg, detail);
 }
 
 exports.info = function(msg, detail) {
	_log('Info ', msg, detail);
 }
 
 exports.error = function(msg, detail) {
	_log('ERROR', msg, detail);
 }
 
var helper = {
	humanDate: function(d) {
		if (typeof d == 'undefined')
	    	d = new Date();

		return  helper.twoDigits(d.getDate()) + '/' + helper.twoDigits(d.getMonth() + 1);	
	},	
	longHumanDate: function(d) {
		if (typeof d == 'undefined')
	    	d = new Date();
			
		return  d.getFullYear() + '-' + helper.twoDigits(d.getMonth() + 1) + '-' + helper.twoDigits(d.getDate());	
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
	}	
}
