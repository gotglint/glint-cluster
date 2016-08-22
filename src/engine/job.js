const _ = require('lodash');
const sizeof = require('object-sizeof');
const uuid = require('node-uuid');

const log = require('../util/log').getLogger('job');
const dataSourceFactory = require ('../datasource/datasource-factory');
const operationUtils = require('../util/operation-utils');

const _id = Symbol('id');

const _jobData = Symbol('jobData');
const _steps = Symbol('steps');

const _dataSource = Symbol('dataSource');
const _stepResults = Symbol('stepResults');

const _blocks = Symbol('blocks');
const _results = Symbol('results');

const _executor = Symbol('executor');

class GlintJob {
  constructor(jobData) {
    this[_id] = uuid.v4();

    this[_jobData] = jobData;
    this[_steps] = operationUtils.splitOperations(jobData.operations);
    log.debug('Operations split up into proper chunks: ', this[_steps]);

    this[_dataSource] = dataSourceFactory.getDataSource(this[_jobData]);
    this[_stepResults] = [];

    this[_blocks] = new Map();
    this[_results] = null;
  }

  setExecutor(executor) {
    this[_executor] = executor;
  }

  get id() {
    return this[_id];
  }

  get data() {
    return this[_jobData].data;
  }

  get operations() {
    return this[_jobData].operations;
  }

  /**
   * Used to take a wild guess at how big the data will in memory;
   * used to calculate the scaling heuristic by acting as a baseline.
   */
  getProjectedSize() {
    return this[_dataSource].getSize();
  }

  _createBlock(block, step) {
    const newBlockId = uuid.v4();
    const fullBlock = {blockId: newBlockId, type: 'job', jobId: this[_id], block: block, operations: this[_steps][step], step: step};
    this[_blocks].set(newBlockId, fullBlock);
    return fullBlock;
  }

  /**
   * Act as a pointer to the specific place in the dataset
   */
  getNextBlock(maxMem) {
    log.debug(`Getting next block with max size ${maxMem}`);

    if (this[_dataSource].hasNextBlock()) {
      log.debug('Consuming block from data source.');
      let block = this[_dataSource].getNextBlock(maxMem);
      block = block.filter((e) => {
        return e === 0 || e;
      });
      return this._createBlock(block, 0);
    } else if (this[_stepResults].length > 0) {
      log.debug('Consuming block from prior step.');
      return this._createBlock(this._getStepBlock(maxMem), 1);
    }
  }

  _getStepBlock(maxMem) {
    const results = this[_stepResults];
    log.debug('Results: ', results);
    const blockSize = maxMem / sizeof(results[0]); // the (1)[0] is a dirty hack based on us only allowing one reduction
    const block = [];

    while (sizeof(block) < blockSize) {
      const stepBlock = this[_stepResults].shift();
      if (stepBlock === undefined) {
        log.debug('No more step blocks left, removing step.');
        break;
      } else {
        block.push(stepBlock);
      }
    }

    return block;
  }

  /**
   * Tell us how much data is left to process
   */
  hasMoreBlocks() {
    const hasNextBlock = this[_dataSource].hasNextBlock();
    log.debug(`Checking to see if there is another block of data for this job: ${hasNextBlock}`);

    if (!hasNextBlock) {
      log.debug('Datasource has no more blocks, checking to see if we have step results to process.');
      return this[_stepResults].length > 0;
    } else {
      log.debug('Datasource has more blocks.');
      return true;
    }
  }

  /**
   * A block (data + set of operations) finished being processed somewhere
   * @param block
   */
  blockCompleted(block) {
    const blockId = block.blockId;
    const blockExists = this[_blocks].has(blockId);
    if (blockExists === true) {
      log.debug(`Block ${blockId} came back from a slave.`);

      this[_blocks].delete(blockId);
      log.debug(`Removed ${blockId} from the list of outstanding blocks.`);

      // check to see if there were more steps
      const blockStep = block.step;
      var blockData = block.block;
      if (blockStep === this[_steps].length - 1) {
        // we're done
        log.debug('Block was at the end of a chain, nothing more to do.');
        if (blockStep === 0) {
          if (this[_results] === null) {
            log.debug('Results type not set yet - creating array.');
            this[_results] = [];
          }

          this[_results] = this[_results].concat(blockData);
        } else {
          if (this[_results] === null) {
            log.debug('Results type not set yet.');
            if (_.isNumber(blockData)) {
              this[_results] = 0;
              log.debug('Set results type to numeric.');
            } else if (_.isString(blockData)) {
              this[_results] = '';
              log.debug('Set results type to alphabetic.');
            } else if (_.isArray(blockData)) {
              this[_results] = [];
              log.debug('Set results type to an array.');
            } else {
              log.warn('Unknown datatype for block data, assuming everything is a String.');
              this[_results] = '';
            }
          }
          this[_results] = this[_results] + blockData;
        }
      } else {
        // let's add the data that came back as a new block
        log.debug('Block had results, adding it to the results for further processing.');
        this[_stepResults] = this[_stepResults].concat(blockData);
        log.debug(`Added result for step ${blockStep}`);
      }
    } else {
      log.warn(`No block with ID ${blockId} exists in the system.`);
    }

    // if we have no more blocks to be processed, notify
    log.debug('Block completed - checking to see if any slaves are still working.');
    if (this.isProcessing() === false) {
      log.info('Job has no more blocks to complete, notifying.');
      this[_executor].jobCompleted();
    } else {
      log.debug('Blocks still being processed, proceeding apace.');
    }
  }

  isProcessing() {
    return this[_blocks].size > 0 || this[_stepResults].length > 0;
  }

  getResults() {
    return this[_results];
  }

  /**
   * Make sure that we can actually run this job
   */
  validate() {
    const jd = this[_jobData];
    if (!jd.hasOwnProperty('id')) {
      log.error('Job is not valid - missing an ID.');
      return false;
    }

    if (!jd.hasOwnProperty('data')) {
      log.error('Job is not valid - missing a data source.');
      return false;
    }

    if (!jd.hasOwnProperty('operations')) {
      log.error('Job is not valid - no operations were provided.');
      return false;
    }

    if (!Array.isArray(jd.operations)) {
      log.error('Job is not valid - operations provided were not an array.');
      return false;
    }

    return true;
  }
}

module.exports = GlintJob;
