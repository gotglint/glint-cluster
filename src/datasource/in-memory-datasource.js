const log = require('../util/log');
const sizeof = require('object-sizeof');

const Datasource = require('./datasource');

const _pointer = Symbol('pointer');
const _rowSize = Symbol('rowSize');

class InMemoryDatasource extends Datasource {
  constructor(data) {
    if (!(data instanceof Array)) {
      log.error('Provided data was not an array, failing.');
      throw new Error('Provided data was not an array.');
    }

    if (data.length < 1) {
      log.error('Provided data was an empty array, failing.');
      throw new Error('Provided data was an empty array.');
    }

    super(data);

    this[_rowSize] = sizeof(this.data[0]);
    this[_pointer] = 0;
  }

  getSize() {
    return this[_rowSize] * this.data.length;
  }

  getCurrentLocation() {
    return this[_pointer];
  }

  getDataLeftToProcess() {
    // something
  }

  getNextBlock(maxMem) {
    const blockSize = maxMem / this[_rowSize];
    const block = [];

    while (sizeof(block) < blockSize) {
      block.push(this.data[this[_pointer]]);
      this[_pointer] = this[_pointer] + 1;
    }

    return block;
  }

  hasNextBlock() {
    return this[_pointer] < this.data.length;
  }
}

module.exports = InMemoryDatasource;
