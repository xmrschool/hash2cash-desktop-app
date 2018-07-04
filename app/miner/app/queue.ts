import * as Queue from 'p-queue';

const workQueue = new Queue({ concurrency: 1 });

export default workQueue;
