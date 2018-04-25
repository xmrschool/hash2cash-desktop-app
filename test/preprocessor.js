const tsc = require('typescript');
const tsConfig = require('../tsconfig.json');

module.exports = {
  process(src, path) {
    console.log('gonna be proceed', path);
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      return tsc.transpile(src, tsConfig.compilerOptions, path, []);
    }
    return src;
  },
};
