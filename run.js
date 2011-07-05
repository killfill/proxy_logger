#!/usr/bin/env node

var app = require('./lib/app.js')

var opts = require('optimist')
  .default('controlport', 8099)
  .default('proxyport', 9099)
  .default('defaultmime', 'xml')
  .default('logconsole', true)
  .default('remember', 4000)

  //need to get out via a remote proxy?
  .default('remoteproxyhost', false)
  .default('remoteproxyport', 8080)

  .default('die', true)

  .usage('Usage: $0 opts')
  .argv

app.configure(opts);
app.start();
