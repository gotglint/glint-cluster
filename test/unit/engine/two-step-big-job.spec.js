const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const GlintClient = require('glint-lib');

const log = require('../../../src/util/log').getLogger('engine.spec');

const GlintManager = require('../../../src/engine/manager');
const SlaveListener = require('../../../src/listener/slave-listener');

describe('test the engine', function() {
  chai.use(chaiAsPromised);
  chai.should();
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

  it('runs a big map/reduce operation', function(done) {
    this.timeout(60000);

    log.info('Beginning test.');

    const input = [...new Array(50001).keys()].slice(1);

    const gc = new GlintClient();
    const data = gc.parallelize(input).map((el) => {
      return el + 324;
    }).filter((el) => {
      return el % 137 === 0;
    }).reduce((a, b) => {
      return Number(a + b);
    }, 0).getData();

    log.info('Job data composed, submitting for processing.');

    console.time('glint-job');
    const jobId = glintManager.processJob(data);
    expect(jobId).to.not.be.null;
    log.info(`Job ID: ${jobId}`);

    return glintManager.waitForJob(jobId).then((results) => {
      console.timeEnd('glint-job');
      log.info(`Job passed, result size: ${results.length}`);
      log.debug('Job results: ', results);
      expect(results).to.equal(9250925);
      done();
    }).catch((err) => {
      done(err ? err : new Error());
    });
  });
});
