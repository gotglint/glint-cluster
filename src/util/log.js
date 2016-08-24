const intel = require('intel');

intel.basicConfig({
  format: {
    'format': '[%(date)s] %(name)s.%(levelname)s: %(message)s',
    'colorize': true,
  }
});

intel.setLevel(intel.DEBUG);
intel.info('Logging configured.');

module.exports = intel;
