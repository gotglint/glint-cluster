const SDC = require('statsd-client');
const sdc = new SDC({host: 'localhost'});

module.exports = sdc;
