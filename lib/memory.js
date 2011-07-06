var fs = require('fs')
  , path = require('path')
  , helper = require('./helper');

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

exports.buffer = [];

exports.addInfo = function(info) {
  if (200<exports.buffer.length) exports.buffer.shift();
  exports.buffer.push(cloneObject(info));
  saveFile('buffer.json', JSON.stringify(exports.buffer));
};

exports.save = function(type, data, info) {

  var base = 'data/' + helper.humanDate(new Date(info.startTime)) + '/' + info.id;

  info[type]._fileName = base + '.' + type + '.' + info.mimeTypeExtension;

  saveFile('public/'+info[type]._fileName, data);
  saveFile('public/'+base+'.info.json', JSON.stringify(info));
}

exports.configure = function(conf) {

  path.exists('buffer.json', function(exist) {
    if (!exist) return;
    exports.buffer = JSON.parse(fs.readFileSync('buffer.json'));
  });

  path.exists('public/data/', function(exist) {
    if (!exist) fs.mkdirSync('public/data/', 0777);
  });


}
