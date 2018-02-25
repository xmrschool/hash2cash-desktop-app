/**
 * Setup and run the development server for Hot-Module-Replacement
 * https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
 */
const argv = require('minimist')(process.argv.slice(2));
const { spawn } = require('child_process');

async function createMiddleware(port, configPath) {
  const express = require('express');
  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');

  const config = require(configPath);


  const app = express();
  const compiler = webpack(config);
  const PORT = process.env.PORT || port;

  const wdm = webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath,
    stats: {
      colors: true
    }
  });

  app.use(wdm);

  app.use(webpackHotMiddleware(compiler));

  const server = app.listen(PORT, serverError => {
    if (serverError) {
      return console.error(serverError);
    }

    console.log(`Listening at http://localhost:${PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('Stopping dev server');
    wdm.close();
    server.close(() => {
      process.exit(0);
    });
  });
}

createMiddleware(3000, './webpack.config.development')
createMiddleware(3010, './webpack.config.server');

if (argv['start-hot']) {
  spawn('npm', ['run', 'start-hot'], { shell: true, env: process.env, stdio: 'inherit' })
    .on('close', code => process.exit(code))
    .on('error', spawnError => console.error(spawnError));
}