const blob = require('glob')

const store = {};
blob('../locales/**/*.json', (er, files) => {
  files.forEach(file => {
    const json = require(file);
    json.forEach(d => {
      console.log(`${d.id}: ${d.defaultMessage}`);
    })

    console.log('');
  })

  Object.keys(store).forEach(d => {
    console.log(`${d}: ${store[d]}`);
  })
})