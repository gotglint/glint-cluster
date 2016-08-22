const InMemoryDatasource = require('./in-memory-datasource');

module.exports = {
  getDataSource: function(jobData) {
    if (jobData.hasOwnProperty('data')) {
      return new InMemoryDatasource(jobData.data);
    }

    throw new Error('No datasource could be created for the given job.');
  }
};
