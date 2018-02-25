"use strict";
let configureStore;
if (process.env.NODE_ENV === 'production') {
    configureStore = require('./configureStore.production');
}
else {
    configureStore = require('./configureStore.development');
}
module.exports = configureStore;
//# sourceMappingURL=configureStore.js.map