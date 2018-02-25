/**
 * Base webpack config used across other specific configs
 */
const webpack = require('webpack');
const path = require('path');
const getReplacements = require('./app/app-info').getReplacements;
const { dependencies: externals } = require('./app/renderer/package.json');

module.exports = {
  module: {
    noParse: [path.join(__dirname, 'node_modules/ws')],
    loaders: [
      {
        test: /\.tsx?$/,
        loaders: ['react-hot-loader/webpack', 'ts-loader'],
        exclude: /node_modules/,
      },
      {
        test: /\.json$/,
        loader: 'json-loader',
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
    extensions: ['.js', '.ts', '.tsx', '.json'],
    modules: [path.join(__dirname, 'app', 'renderer'), 'node_modules'],
  },

  plugins: [
    new webpack.DefinePlugin(getReplacements()),
  ],

  externals: [...Object.keys(externals || {}), 'ws'],
};
