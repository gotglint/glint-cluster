const JSONfn = require('jsonfn').JSONfn;
const Promise = require('bluebird');
const Primus = require('primus');

const log = require('../util/log').getLogger('ws-client');

const _id = Symbol('id');

const _host = Symbol('host');
const _port = Symbol('port');

const _client = Symbol('client');
const _connected = Symbol('connected');

const _slave = Symbol('slave');

class WebSocketClient {
  constructor(host, port) {
    this[_id] = null;

    this[_host] = host;
    this[_port] = port;

    this[_client] = null;
    this[_connected] = false;

    this[_slave] = null;
  }

  init() {
    log.debug(`WS client is initializing, connecting to: ${this[_host]}:${this[_port]}`);

    return new Promise((resolve) => {
      const wsServer = `http://${this[_host]}:${this[_port]}`;
      log.debug(`Connecting to ${wsServer}`);

      const Socket = Primus.createSocket({transformer: 'websockets', parser: 'binary'});
      this[_client] = new Socket(wsServer);

      this[_client].on('data', (data) => {
        log.verbose('WS client raw data: ', data);
        const deserialized = JSONfn.parse(data);
        log.verbose('WS client received a message: ', deserialized);

        if (this[_slave]) {
          this[_slave].handleMessage(deserialized);
        }
      });

      this[_client].on('error', (err) => {
        log.error(`WS client threw an error: ${err}`);
      });

      this[_client].on('close', () => {
        log.debug('WS client closed connection.');
      });

      this[_client].on('open', () => {
        log.debug('WS client is connected.');

        this[_connected] = true;
        resolve('Connection opened.');
      });

      this[_client].id((id) => {
        this[_id] = id;
      });
    });
  }

  get id() {
    return this[_id];
  }

  registerSlave(slave) {
    this[_slave] = slave;
  }

  /**
   * Send a message to a specified client
   *
   * @param message The message to send to the client
   */
  sendMessage(message) {
    if (this[_connected] === true) {
      const serializedMessage = JSONfn.stringify(message);
      log.verbose('WS client sending message to server: ', message);
      this[_client].write(serializedMessage);
    } else {
      throw new Error('WS server not online, cannot send message.');
    }
  }

  shutdown() {
    if (this[_connected] === false) {
      log.warn('WS client not online; bypassing shutdown request.');
      return Promise.resolve('WS client not online; bypassing shutdown request.');
    }

    log.debug('Shutting down WS client.');
    return new Promise((resolve) => {
      this[_client].destroy({ timeout: 500 }, () => {
        log.debug('WS client destroyed.');
        this[_connected] = false;
        resolve();
      });
    });
  }
}

module.exports = WebSocketClient;
