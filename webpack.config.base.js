/**
 * Base webpack config used across other specific configs
 */
const webpack = require('webpack');
const SentryWebpackPlugin = require('@sentry/webpack-plugin');
const SentryCli = require('@sentry/cli');
const path = require('path');
const getReplacements = require('./app/app-info').getReplacements;
const { dependencies: externals } = require('./app/renderer/package.json');

const isDebug = process.env.NODE_ENV !== 'production';

function proposeVersion() {
  const cli = new SentryCli('./sentry.properties');

  const hash = require('crypto').randomBytes(30).toString('hex');

  return `${require('./package').version}-${hash}`;
}

const version = proposeVersion();
module.exports = {
  mode: 'development',
  module: {
    noParse: [path.join(__dirname, 'node_modules/ws')],
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: [
                '@babel/plugin-proposal-object-rest-spread',
                '@babel/plugin-syntax-dynamic-import',
                ["react-intl", {
                  "messagesDir": "./locales/"
                }]
              ],
            },
          },
          {
            loader: 'ts-loader',
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.yaml$/,
        use: ['json-loader', 'yaml-loader'],
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
  plugins: [
    new webpack.DefinePlugin(getReplacements(version)),
  ],
};
