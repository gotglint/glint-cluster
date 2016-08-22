const Promise = require('bluebird');

const log = require('../util/log').getLogger('manager');
const MasterListener = require('../listener/master-listener');
const GlintExecutor = require('./executor');
const GlintJob = require('./job');

const _jobs = Symbol('jobs');
const _master = Symbol('master');

/**
 * The brains of the master - actually controls all of the jobs and schedules and and and.
 */
class GlintManager {
  constructor(host, port) {
    log.debug('Master initializing; binding to %s:%d', host, port);
    this[_master] = new MasterListener(host, port);
    this[_master].registerManager(this);

    this[_jobs] = new Map();
  }

  /**
   * Initialize the Glint Manager; connecting the master listener to the broker.
   *
   * @returns {Promise} A promise to wait on
   */
  init() {
    try {
      log.debug('Master listener created, initializing.');
      return this[_master].init();
    } catch (error) {
      log.error('Could not initialize master listener: ', error);
      return Promise.reject(new Error('Could not initialize master listener.'));
    }
  }

  /**
   * Shutdown the Glint Manager; disconnect the master listener = require(the broker.
   *
   * @returns {Promise} A promise to wait on
   */
  shutdown() {
    log.debug('Glint manager shutting down.');

    return this[_master].shutdown();
  }

  /**
   * Execute a job, distributing data across nodes, etc.
   *
   * @param data The job data
   *
   * @returns {Promise} A promise to wait on
   */
  processJob(data) {
    const job = new GlintJob(data);

    const glintExecutor = new GlintExecutor(this[_master], job);
    glintExecutor.init();

    const jobId = glintExecutor.getId();
    log.debug(`Processing job: ${jobId}`);

    this[_jobs].set(jobId, glintExecutor);

    glintExecutor.execute();

    return jobId;
  }

  handleMessage(message) {
    log.debug('Manager handling message.');
    if (message && message.data) {
      log.debug('Manager propagating message up to executor.');
      const data = message.data;
      this[_jobs].get(data.jobId).handleMessage(data);
    }
  }

  waitForJob(jobId) {
    return this[_jobs].get(jobId).getPromise();
  }
}

module.exports = GlintManager;
