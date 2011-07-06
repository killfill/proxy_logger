require('./extensions');

round = function(n, precision) {
  if (typeof precision == 'undefined') precision = 2;
  precision = Math.pow(10, precision);
  return Math.round(n*precision)/precision;
}

//Map the data. key is the key of the request header. val is the value.
statsMap = function(data, key, val) {
  return data.map(function(i) { 
    if (i.statusCode==200 && !i.response.isSoapFault) {
      return {key: i.request.headers[key], value: i[val]} 
    }
  }).compact();
}

//key: key of the request header
statsShow = function(data) {
  var _data = data.reduceToHash('key', 'value');
  var result = {}
  for (i in _data) {
    var s = _data[i].stats();
    result[i] = { 
      std: round(s.std),
      avg: round(s.avg),
      total: s.total
    };
  }
  return result;    
}

twoDigits = function(num) {
  if (num<10) return '0'+num;
  else return num;
}

module.exports = {

  buildStats: function(data, key) {
    var res = statsMap(data, key, 'took');
    return statsShow(res);
  }, 

  humanDate: function(d) {
    if (typeof d == 'undefined') d = new Date();
    //short: helper.twoDigits(d.getDate()) 
    return d.getFullYear() + '-' + twoDigits(d.getMonth() + 1) + '-' + twoDigits(d.getDate());  
  },

  humanShortDate: function(d) {
    if (typeof d == 'undefined') d = new Date();
    return twoDigits(d.getDate()) + '/' + twoDigits(d.getMonth() + 1);
  },

  humanTime: function(d) {
    if (typeof d == 'undefined') d = new Date();
    return twoDigits(d.getHours()) + ':' + twoDigits(d.getMinutes()) + ':' + twoDigits(d.getSeconds());
  },

}
