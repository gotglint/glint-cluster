const log = require('../../../src/util/log');
const operationUtils = require('../../../src/util/operation-utils');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const GlintClient = require('glint-lib');

describe('Test operation utilities', function() {
  chai.use(chaiAsPromised);
  chai.should();
  const expect = chai.expect;

  before(function() {
    // empty
  });

  after(function() {
    // empty
  });

  it('split operations with no reductions', function() {
    const gc = new GlintClient();
    const data = gc.parallelize([1, 2, 3, 4]).map((el) => {
      return el;
    }).getData();

    const split = operationUtils.splitOperations(data.operations);
    log.debug('Split result: ', split);
    expect(split).to.have.lengthOf(1);
  });

  it('split operations with reduction at end', function() {
    const gc = new GlintClient();
    const data = gc.parallelize([1, 2, 3, 4]).map((el) => {
      return el;
    }).reduce((a, b) => {
      return a+b;
    }).getData();

    const split = operationUtils.splitOperations(data.operations);
    log.debug('Split result: ', split);
    expect(split).to.have.lengthOf(2);
  });

  it('split operations with reduction in middle', function() {
    const gc = new GlintClient();
    const data = gc.parallelize([1, 2, 3, 4]).map((el) => {
      return el;
    }).reduce((a, b) => {
      return a+b;
    }).filter((a) => {
      return a;
    }).getData();

    const split = operationUtils.splitOperations(data.operations);
    log.debug('Split result: ', split);
    expect(split).to.have.lengthOf(3);
  });

  it('split operations with reduction at beginning', function() {
    const gc = new GlintClient();
    const data = gc.parallelize([1, 2, 3, 4]).reduce((a, b) => {
      return a+b;
    }).map((el) => {
      return el;
    }).filter((a) => {
      return a;
    }).getData();

    const split = operationUtils.splitOperations(data.operations);
    log.debug('Split result: ', split);
    expect(split).to.have.lengthOf(2);
  });
});
