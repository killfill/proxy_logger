var fs = require('fs'),
    path = require('path');


cloneObject = function(obj) {
        var x = {};
        for (att in obj)
                if (obj.hasOwnProperty(att)) //whowho functions...
                        x[att] = obj[att];
        return x;
}

saveFile = function(fileName, data) {
	
	var dir = path.dirname(fileName);
	var file = path.basename(fileName);

	path.exists(dir, function(exists) {
		if (!exists)
			fs.mkdir(dir, 0777, function (err) {
				fs.writeFileSync(dir+'/'+file, data);
			});
		else
			fs.writeFileSync(dir+'/'+file, data);
	});

}

exports.eventBuffer = [];
/*
config = {
	maxBufferLength: 2000*2,
};*/

exports.saveEvent = function(context, data) {
	saveFile('public/'+context[context.state]._fileName, data);
	
//	if (exports.eventBuffer.length>=config.maxBufferLength) exports.eventBuffer.shift();
	exports.eventBuffer.push(cloneObject(context));
	saveFile('eventBuffer.data', JSON.stringify(exports.eventBuffer));
}

exports.use = function(conf) {
	//config.maxBufferLength = conf.remember;
	path.exists('eventBuffer.data', function(exist) {
		if (!exist) return;
		exports.eventBuffer = JSON.parse(fs.readFileSync('eventBuffer.data'));
	});
	
}

