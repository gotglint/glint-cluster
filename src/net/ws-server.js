const JSONfn = require('jsonfn').JSONfn;
const Promise = require('bluebird');
const Primus = require('primus');

const log = require('../util/log').getLogger('ws-server');

const _host = Symbol('host');
const _port = Symbol('port');

const _primus = Symbol('primus');

const _connected = Symbol('connected');

const _clients = Symbol('clients');
const _master = Symbol('master');

class WebSocketServer {
  constructor(host, port) {
    this[_host] = host;
    this[_port] = port;

    this[_primus] = null;
    this[_connected] = false;

    this[_clients] = new Map();
    this[_master] = null;
  }

  init() {
    log.debug(`WS server is initializing, binding to: ${this[_host]}:${this[_port]}`);

    return new Promise((resolve) => {
      this[_primus] = Primus.createServer({
        hostname:           this[_host],
        port:               this[_port],
        transformer:        'websockets',
        iknowhttpsisbetter: true,
        parser:             'binary'
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
      spark.write(serializedMessage);
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
      this[_primus].destroy({timeout: 500}, () => {
        log.debug('WS server destroyed.');
        this[_connected] = false;

        resolve();
      });
    });
  }
}

module.exports = WebSocketServer;
