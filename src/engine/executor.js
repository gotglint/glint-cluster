const EventEmitter = require('events');

const log = require('../util/log').getLogger('executor');

const _master = Symbol('master');
const _job = Symbol('job');

const _status = Symbol('status');

const _promise = Symbol('promise');
const _resolve = Symbol('resolve');
const _reject = Symbol('reject');

const _emitter = Symbol('emitter');

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
          const block = this[_job].getNextBlock(client.maxMem);

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

    log.debug(`Executing: ${this[_job].id}`);
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
    log.debug(`Processing block ${message}`);
    this[_emitter].emit('block:completed', message);
  }

  jobCompleted() {
    log.debug('Job is complete, triggering completion.');
    this[_emitter].emit('job:completed');
  }
}

module.exports = GlintExecutor;
