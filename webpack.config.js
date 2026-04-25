const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.jsx',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    clean: true,
  },
  devServer: {
    static: path.join(__dirname, 'public'),
    open: true,
  },
  module: {
    rules: [
      { test: /\.jsx?$/, exclude: /node_modules/, use: 'babel-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader', 'postcss-loader'] },
      { test: /\.csv$/, use: 'd3-dsv-loader' },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      fs: false,
    },
  },
  plugins: [
  new HtmlWebpackPlugin({
    template: './public/index.html',
  }),
  new CopyWebpackPlugin({
    patterns: [
      {
        from: 'public',
        to: '.',
        globOptions: {
          ignore: ['**/index.html'],
        },
      },
    ],
  }),
],
};
