const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

describe('Test simple big map operation', function() {
  chai.use(chaiAsPromised);
  chai.should();
  const expect = chai.expect;

  before(function() {
    // empty
  });

  after(function() {
    // empty
  });

  it('runs a big map/reduce operation locally', function(done) {
    this.timeout(60000);

    const input = [...new Array(50001).keys()].slice(1);

    const results = input.map((el) => {
      return el + 324;
    }).filter((el) => {
      return el % 137 === 0;
    }).reduce((a, b) => {
      return a+b;
    }, 0);

    expect(results).to.equal(9250925);
    done();
  });
});
