/**
 * Base webpack config used across other specific configs
 */
const webpack = require('webpack');
const SentryCliPlugin = require('@sentry/webpack-plugin');
const path = require('path');
const getReplacements = require('./app/app-info').getReplacements;
const { dependencies: externals } = require('./app/renderer/package.json');

const isDebug = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: isDebug ? 'development' : 'production',
  module: {
    noParse: [path.join(__dirname, 'node_modules/ws')],
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'babel-loader',
          },
          {
            loader: 'ts-loader',
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },

  output: {
    path: path.join(__dirname, 'app', 'renderer'),
    filename: 'bundle.js',

    // https://github.com/webpack/webpack/issues/1114
    libraryTarget: 'commonjs2',
  },
  // https://webpack.github.io/docs/configuration.html#resolve
  resolve: {
    extensions: ['.js', '.ts', '.tsx', 'json'],
    modules: [path.join(__dirname, 'app', 'renderer'), 'node_modules'],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  plugins: [new webpack.DefinePlugin(getReplacements())],
};
