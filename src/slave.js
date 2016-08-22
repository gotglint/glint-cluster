const log = require('./util/log');

const SlaveListener = require('./listener/slave-listener');

// hack for us to be able to pull in options
function initSlave(options) {
  log.debug('Slave coming online - kicking off the listener on %s:%s', options.masterHost, options.masterPort);
  const slaveListener = new SlaveListener(options.masterHost, options.masterPort, options.maxMem);

  log.debug('Slave listener created, initializing.');

  return slaveListener.init().then(() => {
    log.debug('Slave listener online, ready for work.');
  });
}

module.exports = initSlave;
