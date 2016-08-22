const chai = require('chai');

const GlintClient = require('glint-lib');

const log = require('../../../src/util/log').getLogger('engine.spec');

const GlintManager = require('../../../src/engine/manager');
const SlaveListener = require('../../../src/listener/slave-listener');

describe('two step job engine test', function() {
  const expect = chai.expect;

  const glintManager = new GlintManager('localhost', 45468);
  const glintSlave1 = new SlaveListener('localhost', 45468, 125000);
  const glintSlave2 = new SlaveListener('localhost', 45468, 125000);

  const pause = new Promise((resolve) => {
    setTimeout(() => {log.info('Waiting...'); resolve();}, 2500);
  });

  before(function() {
    this.timeout(30000);

    log.info('Doing pre-test configuration/initialization.');

    return Promise.all([glintManager.init(), glintSlave1.init(), glintSlave2.init(), pause]);
  });

  after(function() {
    log.info('Cleaning up after test.');

    return [glintManager.shutdown(), glintSlave1.shutdown(), glintSlave2.shutdown()];
  });

  it('runs a simple map-reduce operation that returns a string', function(done) {
    this.timeout(60000);

    log.info('Beginning test.');

    const input = [...new Array(5).keys()].slice(1);

    const gc = new GlintClient();
    const data = gc.parallelize(input).map((el) => {
      return el + 324;
    }).filter((el, idx) => {
      return !!(el === 325 || idx === 2);
    }).reduce((a, b) => {
      console.log(`Reducing: ${a} :: ${b}`);
      return a + b;
    }, 'zzz').getData();

    log.info('Job data composed, submitting for processing.');

    const jobId = glintManager.processJob(data);
    expect(jobId).to.not.be.null;
    log.info(`Job ID: ${jobId}`);

    glintManager.waitForJob(jobId).then((results) => {
      log.info('Job passed.');
      log.debug('Job results: ', results);
      expect(results).to.eql(['zzz325327']);
      done();
    }).catch((err) => {
      done(err ? err : new Error());
    });
  });

  it('runs a simple map-reduce operation that sums', function(done) {
    this.timeout(60000);

    log.info('Beginning test.');

    const input = [...new Array(5).keys()].slice(1);

    const gc = new GlintClient();
    const data = gc.parallelize(input).map((el) => {
      return el + 324;
    }).filter((el, idx) => {
      return !!(el === 325 || idx === 2);
    }).reduce((a, b) => {
      console.log(`Reducing: ${a} :: ${b}`);
      return a + b;
    }, 0).getData();

    log.info('Job data composed, submitting for processing.');

    const jobId = glintManager.processJob(data);
    expect(jobId).to.not.be.null;
    log.info(`Job ID: ${jobId}`);

    glintManager.waitForJob(jobId).then((results) => {
      log.info('Job passed.');
      log.debug('Job results: ', results);
      expect(results).to.eql([652]);
      done();
    }).catch((err) => {
      done(err ? err : new Error());
    });
  });
});
