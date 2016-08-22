class Datasource {
  constructor(data) {
    if (new.target === Datasource) {
      throw new TypeError('A datasource cannot be created directly.');
    }

    if (this.getSize === Datasource.prototype.getSize) {
      throw new TypeError('Please implement the abstract method getSize.');
    }

    if (this.getCurrentLocation === Datasource.prototype.getCurrentLocation) {
      throw new TypeError('Please implement the abstract method getCurrentLocation.');
    }

    if (this.getDataLeftToProcess === Datasource.prototype.getDataLeftToProcess) {
      throw new TypeError('Please implement the abstract method getDataLeftToProcess.');
    }

    if (this.getNextBlock === Datasource.prototype.getNextBlock) {
      throw new TypeError('Please implement the abstract method getNextBlock.');
    }

    if (this.hasNextBlock === Datasource.prototype.hasNextBlock) {
      throw new TypeError('Please implement the abstract method getNextBlock.');
    }

    this.data = data;
  }

  getSize() {
    // something
  }

  getCurrentLocation() {
    // something
  }

  getDataLeftToProcess() {
    // something
  }

  hasNextBlock() {
    // something
  }

  /**
   * Get the next block
   *
   * @param maxMem The maximum memory of the node, used to ensure we only send that much data
   */
  getNextBlock(maxMem) { // eslint-disable-line no-unused-vars
    // something
  }
}

module.exports = Datasource;
