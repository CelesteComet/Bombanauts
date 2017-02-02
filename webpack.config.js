'use strict';

const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './browser/react/index.js',
  output: {
    path: path.join(__dirname, 'public'),
    publicPath: '/',
    filename: './bundle.js'
  },
  context: __dirname,
  devtool: 'source-map',
  resolve: {
    extensions: ['', '.js', '.jsx', '.scss']
  },
  // plugins: [
  //   new webpack.optimize.UglifyJsPlugin({
  //     sourceMap: false,
  //     mangle: false
  //   })
  // ],
  // plugins: [
  //       new webpack.ProvidePlugin({
  //           $: "jquery",
  //           jQuery: "jquery"
  //       })
  //   ],
  module: {
    loaders: [
      {
        test: /jsx?$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel',
        query: {
          presets: ['react', 'es2015', 'stage-2']
        }
      },
      {test: /\.scss?$/, loaders: ['style', 'css', 'sass']},
      {
        test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)(\?.*$|$)/,
        loader: 'file'
      },
      {
            // I want to uglify with mangling only app files, not thirdparty libs
            test: /.*\/App\/.*\.js$/,
            exclude: /.spec.js/, // excluding .spec files
            loader: "uglify"
      }
    ]
  }
};
