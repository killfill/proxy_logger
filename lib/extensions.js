Array.prototype.compact = function() {
  return this.filter(function(i) {if (i) return true})
}

Array.prototype.collect = function(key) {
  return this.map(function(i){return i[key]})
}

Array.prototype.avg = function(key) {
  return eval(this.join('+')) / this.length;
}

Array.prototype.stats = function() {
  var avg = this.avg();
  var diff2 = this.map(function(i) {return (i-avg)*(i-avg)});
  var diff2avg = diff2.avg();
  return {
    diff2: diff2,
    var: diff2avg,
    std: Math.sqrt(diff2avg),
    avg: avg,
    total: this.length
  }
}

//Takes [{a: 'a1', b: 'b1'},{a: 'a2', b: 'b2'},{a: 'a2', b: 'yes'}].reduceToHash('a','b') ==> {a1: ['b1'], a2: ['b2','yes']}
Array.prototype.reduceToHash = function(key, val) {
  var tmp = {};
  this.forEach(function (i) {
    var k = i[key];
    var v = i[val];
    if (!tmp.hasOwnProperty(k))
      tmp[k] = [];
    tmp[k].push(v)
  });
  return tmp;
}
