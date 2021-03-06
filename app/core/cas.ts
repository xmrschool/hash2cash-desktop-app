// We had some troubles with CA root servers.
require('https').globalAgent.options.ca = require('ssl-root-cas/ssl-root-cas-latest.js');
/*
import * as fs from 'fs';
const generate = require('ssl-root-cas/ca-store-generator').generate;

const fileName = require('path').join(
  process.resourcesPath,
  'ssl-root-cas-latest.js'
);

export function attemptToInejct() {
  console.log('Attempting to inject...');
  try {
    require(fileName);
  } catch (e) {
    console.error('Failed to inject root cas');
  }
}
if (fs.existsSync(fileName)) {
  console.log('ssl-root-cas exists, injecting them...');
  attemptToInejct();
} else {
  generate(fileName).then(() => attemptToInejct());
}*/

console.log("Root Ca's injected!");
let rejectUnauthorized = false;
let ignoreSslErrors = false;

export function getRequestArgs() {
  return ignoreSslErrors
    ? {
        rejectUnauthorized,
        strictSSL: false,
      }
    : {};
}

export function exposeCaRemoval() {
  (window as any).__ignoreSslErrors = function(text: string) {
    console.log(`Please, be aware that ignoring SSL errors will blow up your security. 
We HIGHLY do not recommend that and we don't take responsibility for your actions in that way.
Please, call it with "Yes, I agree upon that.", so, SSL errors will be ignored unless next session.`);

    if (text !== 'Yes, I agree upon that.') {
      console.log('We disabled SSL errors.');

      rejectUnauthorized = true;
      ignoreSslErrors = true;
    }
  };
}

if (typeof window !== 'undefined' && window.localStorage.debug) {
  exposeCaRemoval();
}
