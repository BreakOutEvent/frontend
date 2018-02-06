'use strict';
const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const extractLess = new ExtractTextPlugin({
  filename: '[name].css'
});

module.exports = {
  entry: {
    reactApp: ['babel-polyfill', './src/client/react/App.jsx'],
    bundle: ['./src/client/js/main.js'],
    registration: ['./src/client/js/registration.js'],
    profile: ['./src/client/js/profile.js'],
    admin: ['./src/client/js/admin.js'],
    sponsoring: ['./src/client/js/sponsoring.js'],
    map: ['./src/client/js/map.js'],
    messages: ['./src/client/js/messages.js'],
    team: ['./src/client/js/team.js'],
    liveblog: ['./src/client/js/liveblog.js'],
    landingpage: ['./src/client/js/landingpage.js'],
    styles: ['./src/less/styles.less']
  },
  output: {
    path: path.resolve(__dirname, 'public/js'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: path.resolve(__dirname, 'src/client/react/'),
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true
          }
        }
      },
      {
        test: /\.(js)$/,
        include: path.resolve(__dirname, 'src/client/js'),
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.(less)$/,
        include: path.resolve(__dirname, 'src/less/'),
        use: extractLess.extract({
          use: [{
            loader: 'css-loader'
          }, {
            loader: 'less-loader'
          }]
        })
      }, {
        test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
        loader: 'url-loader',
        options: {
          limit: 10000
        }
      }
    ]
  },
  plugins: [extractLess]
};