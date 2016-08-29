const EventEmitter = require('events');

const log = require('../util/log').getLogger('executor');

const _master = Symbol('master');
const _job = Symbol('job');

const _status = Symbol('status');

const _promise = Symbol('promise');
const _resolve = Symbol('resolve');
const _reject = Symbol('reject');

const _emitter = Symbol('emitter');

const _blockTracker = Symbol('block-tracker');

/**
 * Encapsulation layer that corresponds to running an entire job
 */
class GlintExecutor {
  constructor(master, job) {
    this[_master] = master;
    this[_job] = job;
    this[_job].setExecutor(this);

    this[_status] = null;

    this[_promise] = new Promise((resolve, reject) => {
      this[_resolve] = resolve;
      this[_reject] = reject;
    });

    this[_emitter] = new EventEmitter();

    this[_blockTracker] = new Map();
  }

  init() {
    this[_emitter].on('block:added', () => {
      log.debug('Performing sanity check, to ensure that there are actually blocks to process.');
      if (!this[_job].hasMoreBlocks()) {
        log.debug('Job has no more blocks, nothing to add.');
        return;
      }

      log.debug('Distributing blocks to free clients.');
      const clients = this[_master].getFreeClients();
      for (const client of clients) {
        if (this[_job].hasMoreBlocks()) {
          const blockSize = this._getBlockSize(client.sparkId, client.maxMem);
          const block = this[_job].getNextBlock(blockSize, client.maxMem);

          log.debug(`Sending block ${block.blockId} to client: ${client.sparkId} - ${client.maxMem}`);
          this[_master].setClientBusy(client);
          this[_master].sendMessage(client.sparkId, block);
        } else {
          log.debug('No more blocks queued up, wrapping up current iteration.');
          break;
        }
      }

      // check to see if we still have blocks left and try again in a bit
      if (this[_job].hasMoreBlocks()) {
        log.debug('More blocks to go, rescheduling.');
        setTimeout(() => { this[_emitter].emit('block:added'); }, 250);
      }
    });

    this[_emitter].on('block:completed', (block) => {
      log.debug('Tracking block memory consumption.');
      this._handleClientMemoryConsumption(block.clientId, block.blockSize, block.memoryUsed);

      log.debug('Block completed, processing.');
      this[_job].blockCompleted(block);

      log.debug(`Freeing up ${block.clientId}`);
      this[_master].freeClient(block.clientId);

      if (this[_job].hasMoreBlocks()) {
        log.debug('Job has more blocks to process.');
        this[_emitter].emit('block:added');
      } else {
        log.debug('Job has no more blocks to complete.');
      }
    });

    this[_emitter].on('job:completed', () => {
      log.debug('No more blocks outstanding, resolving.');
      this[_resolve](this[_job].getResults());
    });
  }

  execute() {
    if (this[_job] === undefined || this[_job] === null) {
      log.error('No job provided for execution, terminating.');
      this[_status] = 'TERMINATED';
      return this[_reject](new Error('No job provided for execution, terminating.'));
    }

    if (!this[_job].validate()) {
      this[_status] = 'BAD_JOB';
      return this[_reject](new Error('Job was not valid, terminating.'));
    }

    log.info(`Job executor processing job with ID: ${this[_job].id}`);
    this[_status] = 'PROCESSING';

    // start the job
    this[_emitter].emit('block:added');
  }

  getId() {
    return this[_job].id;
  }

  getPromise() {
    return this[_promise];
  }

  handleMessage(message) {
    log.debug('Processing block completion.');
    this[_emitter].emit('block:completed', message);
  }

  jobCompleted() {
    log.info('Job is complete, triggering completion.');
    this[_emitter].emit('job:completed');
  }

  /**
   * Used to get the maximum block that we can send to a specific client
   *
   * @param clientId The client to get the block size for
   * @param clientMemoryUsage The maximum amount of memory the client has available
   *
   * @private
   *
   * @return Integer Percentage of a block to send back
   */
  _getBlockSize(clientId, clientMemoryUsage) {
    // check to see if we have sent the client a block, yet
    if (this[_blockTracker].has(clientId)) {
      const clientBlocks = this[_blockTracker].get(clientId);
      const lastClientBlock = clientBlocks.slice(-1)[0];

      const freeMemory = clientMemoryUsage - lastClientBlock.memoryUsed / clientMemoryUsage * 100;
      log.debug(`Client ${clientId} last used ${lastClientBlock.memoryUsed} for a block of size ${lastClientBlock.blockSize}, and had ${freeMemory} memory left.`);
      if (freeMemory > 20) {
        const blockSize = lastClientBlock.blockSize + freeMemory * 0.1;
        log.debug(`Last block left ${freeMemory}% of the memory free, bumping up block size to ${blockSize}.`);
        return blockSize;
      } else {
        log.debug(`Re-using last block size, as it came close to the memory cap: ${lastClientBlock.blockSize}`);
        return lastClientBlock.blockSize;
      }
    }

    // nope, they don't - send 20% back as a starting point
    log.debug(`We have never sent a block to client ${clientId}, sending back the default start value of 20.`);
    return 20;
  }

  _handleClientMemoryConsumption(clientId, blockSize, memoryUsed) {
    log.debug(`Client ${clientId} consumed a block of size ${blockSize}% and used ${memoryUsed} bytes`);

    if (this[_blockTracker].has(clientId)) {
      const clientBlocks = this[_blockTracker].get(clientId);
      clientBlocks.push({blockSize: blockSize, memoryUsed: memoryUsed});
      this[_blockTracker].set(clientId, clientBlocks);
    } else {
      const clientBlocks = [{blockSize: blockSize, memoryUsed: memoryUsed}];
      this[_blockTracker].set(clientId, clientBlocks);
    }
  }
}

module.exports = GlintExecutor;
