const JSONfn = require('jsonfn').JSONfn;
const Promise = require('bluebird');
const Primus = require('primus');
const uuid = require('node-uuid');

const log = require('../util/log').getLogger('ws-server');

const _host = Symbol('host');
const _port = Symbol('port');

const _primus = Symbol('primus');

const _connected = Symbol('connected');

const _clients = Symbol('clients');
const _master = Symbol('master');

const _chunks = Symbol('chunks');

class WebSocketServer {
  constructor(host, port) {
    this[_host] = host;
    this[_port] = port;

    this[_primus] = null;
    this[_connected] = false;

    this[_clients] = new Map();
    this[_master] = null;

    this[_chunks] = new Map();
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

        spark.on('data', (data) => {
          const deserialized = JSONfn.parse(data);
          log.verbose('WS server received a message: ', deserialized);

          this[_clients].set(spark.id, spark);

          if (this[_master]) {
            this[_master].handleMessage(spark.id, deserialized);
          }
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
      const serializedMessage = JSONfn.stringify(message);
      if (serializedMessage.length > 1024 * 1000) {
        log.debug('Serialized message is large, chunking it up.');
        const id = uuid.v4();
        spark.write({type: 'start', id: id});
        let i = 0;
        while (i < serializedMessage.length) {
          spark.write({type: 'chunk', id: id, data: serializedMessage.slice(i, i + 1024 * 1001)});
          i = i + 1024 * 1000;
        }
        spark.write({type: 'end', id: id});
      } else {
        log.debug('Serialized message is not too large, sending as one block.');
        spark.write({type: 'fullChunk', data: serializedMessage});
      }
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
