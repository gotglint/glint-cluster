import axon from 'axon';

export class MasterListener {
  constructor(host, port) {
    this.sock = axon.socket('req');

    this.sock.bind(port, host);
  }

  distribute() {
    this.sock.send('resize', img, function(res){

    });
  }
}