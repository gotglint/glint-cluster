const Promise = require('bluebird');
const Primus = require('primus');

const log = require('../util/log').getLogger('ws-server');
const WebSocketChunker = require('@gotglint/glint-client').WebSocketChunker;

const _host = Symbol('host');
const _port = Symbol('port');

const _primus = Symbol('primus');

const _connected = Symbol('connected');

const _clients = Symbol('clients');
const _master = Symbol('master');

const _chunker = Symbol('chunker');

class WebSocketServer {
  constructor(host, port) {
    this[_host] = host;
    this[_port] = port;

    this[_primus] = null;
    this[_connected] = false;

    this[_clients] = new Map();
    this[_master] = null;

    this[_chunker] = new WebSocketChunker(1024 * 1000);
  }

  init() {
    log.debug(`WS server is initializing, binding to: ${this[_host]}:${this[_port]}`);

    return new Promise((resolve) => {
      this[_primus] = Primus.createServer({
        hostname: this[_host],
        port: this[_port],
        transformer: 'uws',
        iknowhttpsisbetter: true,
        parser: 'binary'
      });

      this[_primus].on('connection', (spark) => {
        log.debug('WS server client connected: ', spark);

        this[_chunker].registerCallback((deserialized) => {
          if (this[_master]) {
            this[_master].handleMessage(spark.id, deserialized);
          }
        });

        spark.on('data', (data) => {
          this[_chunker].onMessage(data);
          log.verbose('WS server received a message: ', data);

          this[_clients].set(spark.id, spark);
        });
      });

      this[_primus].on('disconnection', (spark) => {
        log.debug('Client disconnected: ', spark);

        if (this[_master]) {
          this[_master].clientDisconnected(spark.id);
        }
      });

      this[_primus].on('error', function (err) {
        log.debug('WS server error: ', err);
      });

      log.debug('WS server has initialized, is now listening for clients.');
      this[_connected] = true;
      resolve();
    });
  }

  registerMaster(master) {
    this[_master] = master;
  }

  /**
   * Send a message to a specified client
   *
   * @param clientId The client to send a message to
   * @param message The message to send to the client
   */
  sendMessage(clientId, message) {
    if (this[_connected] === true) {
      const spark = this[_clients].get(clientId);
      if (spark === undefined) {
        log.error('No client with ID %s found.', clientId);
        throw new Error(`No client with ID ${clientId} found`);
      }

      log.verbose(`WS server sending message to ${clientId}: `, message);
      this[_chunker].sendMessage(spark, message);
    } else {
      throw new Error('WS server not online, cannot send message.');
    }
  }

  shutdown() {
    if (this[_connected] === false) {
      log.warn('WS server not online; bypassing shutdown request.');
      return Promise.resolve('WS server not online; bypassing shutdown request.');
    }

    log.debug('Shutting down WS server.');

    return new Promise((resolve) => {
      this[_primus].on('destroy', () => {
        log.debug('WS server shutdown.');
        this[_connected] = false;

        resolve();
      });

      for (let [clientId, spark] of this[_clients]) {
        log.debug(`Closing connection to ${clientId}`);
        spark.end();
      }

      this[_primus].destroy();
    });
  }
}

module.exports = WebSocketServer;
