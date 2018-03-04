function s(text) {
  return JSON.stringify(text);
}

function getReplacements() {
  return {
    __DARWIN__: "process.platform === 'darwin'",
    __WIN32__: "process.platform === 'win32'",
    __LINUX__: process.platform === 'linux',
    __DEV__: s(
      process.env.NODE_ENV !== 'production'
    ),
    'process.platform': s(process.platform),
    'process.env.NODE_ENV': s(process.env.NODE_ENV || 'development'),
    'process.env.TEST_ENV': s(process.env.TEST_ENV),
  };
}

module.exports = { getReplacements };
