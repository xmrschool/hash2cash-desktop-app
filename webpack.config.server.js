/* eslint-disable max-len */
/**
 * Build config for development process that uses Hot-Module-Replacement
 * https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
 */

const webpack = require('webpack');
const path = require('path');
const merge = require('webpack-merge');
const baseConfig = require('./webpack.config.base');
const getReplacements = require('./app/app-info').getReplacements;

const isDebug = process.env.NODE_ENV !== 'production';

const port = process.env.PORT || 4513;

module.exports = merge(baseConfig, {
  devtool: isDebug ? 'inline-source-map' : 'none',

  mode: isDebug ? 'development' : 'production',
  entry: isDebug
    ? [
        `webpack-hot-middleware/client?path=http://localhost:${port}/__webpack_hmr&reload=true`,
        './app/miner/app/index.ts',
      ]
    : './app/miner/app/index.ts',

  output: isDebug
    ? {
        publicPath: `http://localhost:${port}/dist/`,
      }
    : {
        path: path.join(__dirname, 'app/main/dist'),
        publicPath: '../dist/',
        filename: 'server.js',
      },

  plugins: [
    // https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
    ...(isDebug
      ? [
          new webpack.HotModuleReplacementPlugin(),
          new webpack.LoaderOptionsPlugin({
            debug: true,
          }),
        ]
      : []),

    new webpack.DefinePlugin(getReplacements()),
  ],

  // https://github.com/chentsulin/webpack-target-electron-renderer#how-this-module-works
  target: 'electron-renderer',
});
