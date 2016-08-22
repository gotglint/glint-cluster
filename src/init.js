require('colors');
const fs = require('fs');
const program = require('commander');

const master = require('./master');
const slave = require('./slave');

const log = require('./util/log');

const meta = JSON.parse(fs.readFileSync('./package.json'));

program
  .version(meta.version);

program
  .option('-m, --master <master>', 'Override the IP/port that the master will listen on; defaults to localhost:45468.', 'localhost:45468')
  .option('-s, --slave <master>', 'Run as a slave; provide the IP/port of the master node (mandatory).')
  .option('-m --maxmem <mem>', 'Specify the amount of memory for the slave to use (mandatory - defaults to 1024).', parseInt, 1024);

program.on('--help', function(){
  console.log('  By default, this application will fire up a master instance.');
  console.log('');
});

program.parse(process.argv);

if (program.slave) {
  const slaveOptions = {
    masterHost: program.slave,
    maxMem: program.maxmem
  };

  log.info('Initializing slave, connecting to master: %s', program.slave);
  slave(slaveOptions);
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
  master(masterOptions);
}

