const chai = require('chai');

const GlintClient = require('@gotglint/glint-client');

const log = require('../../../src/util/log').getLogger('engine.spec');

const GlintManager = require('../../../src/engine/manager');

describe('system evaluation 2', function() {
  const expect = chai.expect;

  const glintManager = new GlintManager('127.0.0.2', 45468);

  const pause = new Promise((resolve) => {
    setTimeout(() => {log.info('Waiting...'); resolve();}, 15000);
  });

  before(function() {
    this.timeout(30000);

    log.info('Doing pre-test configuration/initialization.');

    return Promise.all([glintManager.init(), pause]);
  });

  after(function() {
    log.info('Cleaning up after test.');

    return [glintManager.shutdown(), pause];
  });

  it('runs a simple map-reduce operation that returns a string', function(done) {
    this.timeout(600000);

    log.info('Beginning test.');

    const input = [...new Array(5001).keys()].slice(1);
    log.debug('Input: ' + input);

    const glintClient = new GlintClient();
    const data = glintClient.parallelize(input).map(function (el) {
      return el + 324;
    }).filter(function (el) {
      return el % 1337 === 0;
    }).reduce(function(a, b) {
      return a + b;
    }, 0).getData();

    log.info('Job data composed, submitting for processing.');

    const jobId = glintManager.processJob(data);
    expect(jobId).to.not.be.null;
    log.info(`Job ID: ${jobId}`);

    glintManager.waitForJob(jobId).then((results) => {
      log.info('Job passed.');
      log.info('Job results: ', results);
      done();
    }).catch((err) => {
      done(err ? err : new Error());
    });
  });
});
