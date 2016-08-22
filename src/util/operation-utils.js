module.exports = {
  splitOperations: function(operations) {
    if (operations === null || !(operations instanceof Array)) {
      throw new Error('Operations cannot be null, and must be an array.');
    }

    const steps = [];

    const reductionOps = [];
    operations.forEach((currVal, idx) => {
      if (currVal.task === 'reduce') {
        reductionOps.push(idx);
      }
    });

    if (reductionOps.length === 0) {
      // no reductions found, happy days
      return [operations];
    }

    let lastPos = 0;
    let lastReductionOpIndex = 0;

    for (let i=0; i<reductionOps.length; i++) {
      const reductionOpIndex = lastReductionOpIndex = reductionOps[i];

      if (reductionOpIndex === 0) {
        steps.push([operations[0]]);
        lastPos = 1;
      } else {
        const lastNonReductionOp = reductionOpIndex - 1;
        steps.push(operations.slice(lastPos, lastNonReductionOp+1));
        steps.push(operations.slice(reductionOpIndex, reductionOpIndex+1));
        lastPos = reductionOpIndex + 1;
      }
    }

    // we're on the last element, and we only add the slice if such a slice exists
    // i.e. the reduce isn't the last op
    if (lastReductionOpIndex !== operations.length - 1) {
      steps.push(operations.slice(lastPos, operations.length));
    }

    return steps;
  }
};
