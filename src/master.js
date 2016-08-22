const log = require('./util/log');

const GlintManager = require('./engine/manager');

/**
 * Kick on the master and add a signal handler listener for shutdown.
 *
 * @param options The options to pass to the GlintManager
 *
 * @returns {Promise} A promise to wait on
 */
function initMaster(options) {
  log.debug('Kicking off the master - binding to [ %d:%d ]', options.masterHost, options.masterPort);

  log.debug('Instantiating Glint manager.');
  const glintManager = new GlintManager(options.masterHost, options.masterPort);

  process.on('SIGINT', () => {
    glintManager.shutdown();
  });

  return glintManager.init();
}

module.exports = initMaster;
