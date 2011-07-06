var fs = require('fs')
  , path = require('path');

cloneObject = function(obj) {
  var x = {};
  for (att in obj)
    if (obj.hasOwnProperty(att))
      x[att] = obj[att];
  return x;
}

saveFile = function(fileName, data) {
	
  var dir = path.dirname(fileName);
  var file = path.basename(fileName);

  path.exists(dir, function(exists) {
    if (!exists)
      fs.mkdir(dir, 0777, function (err) {
        fs.writeFile(dir+'/'+file, data);
      });
    else
      fs.writeFile(dir+'/'+file, data);
  });

}

var buffer = exports.buffer = [];

exports.addInfo = function(info) {
  if (200<buffer.length) buffer.shift();
  buffer.push(cloneObject(info));
  saveFile('buffer.json', JSON.stringify(buffer));
};

exports.save = function(type, data, info) {

  var base = 'public/data/' + helper.humanDate(new Date(info.startTime)) + '/' + info.id;

  info[type]._fileName = base + '.' + type + '.' + info.mimeTypeExtension;

  saveFile(info[type]._fileName, data);
  saveFile(base+'.info.json', JSON.stringify(info));
}

exports.configure = function(conf) {
	path.exists('buffer.json', function(exist) {
		if (!exist) return;
		exports.buffer = JSON.parse(fs.readFileSync('buffer.json'));
	});
}

