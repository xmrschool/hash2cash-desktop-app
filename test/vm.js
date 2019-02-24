const vm = require('vm');

let isRunning = false;
const miners = 123;
function getMiners(cb) {
  cb(miners);
}

function start() {
  isRunning = true;
}

const context = { getMiners, start, console: console };

vm.createContext(context);

vm.runInContext(`
  getMiners(miners => {
    console.log('got a miners: ', miners); 
  })
  start();
`, context);

setInterval(() => console.log(isRunning), 1000);