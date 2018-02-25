const { URL } = require('url');
const { UTM_TAGS, BASE_URL } = require('../config');

module.exports = {
  getRelativeLink,
};

function getRelativeLink(relative) {
  const url = new URL(relative, BASE_URL);
  Object.keys(UTM_TAGS).forEach(key =>
    url.searchParams.append(key, UTM_TAGS[key])
  );
  return url.href;
}
