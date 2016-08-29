require('colors');
const program = require('commander');

const master = require('./master');
const slave = require('./slave');

const log = require('./util/log');

// package info
const meta = require('../package.json');

program
  .version(meta.version);

program
  .option('-m, --master <master>', 'Override the IP/port that the master will listen on; defaults to localhost:45468.', 'localhost:45468')
  .option('-w, --worker <master>', 'Run as a worker; provide the IP/port of the master node (mandatory).')
  .option('-M --maxmem <mem>', 'Specify the amount of memory (in MB) for the slave to use (mandatory - defaults to 256mb).', parseInt, 256);

program.on('--help', function(){
  console.log('  By default, this application will fire up a master instance.');
  console.log('');
});

program.parse(process.argv);

if (program.worker) {
  const split = program.worker.split(':');
  if (split.length !== 2) {
    log.warn('%s is not a valid option for the master host; should be in the format host:port.', program.worker);
    process.exit(1);
  }

  const slaveOptions = {
    masterHost: split[0],
    masterPort: split[1],
    maxMem: program.maxmem
  };

  log.info('Initializing worker, connecting to master host: %s', program.worker);
  slave(slaveOptions).then(() => {
    log.info('Worker has been initialized and connected to the master.');
  }).catch((err) => {
    log.error(`Worker failed to initialize: ${err.message ? err.message : 'An unknown error occurred'}`);
    process.exit(1);
  });
} else {
  const split = program.master.split(':');
  if (split.length !== 2) {
    log.warn('%s is not a valid option for master; should be in the format host:port.', program.master);
    process.exit(1);
  }

  const masterOptions = {
    masterHost: split[0],
    masterPort: split[1]
  };

  log.info('Initializing new master [ binding to %s ]', program.master);
  master(masterOptions).then(() => {
    log.info('Master has been initialized, waiting for workers to connect.');
  }).catch((err) => {
    log.error(`Master failed to initialize: ${err.message ? err.message : 'An unknown error occurred'}`);
    process.exit(1);
  });
}

