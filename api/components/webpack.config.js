const { composePlugins, withNx } = require('@nx/webpack');
const ZipPlugin = require('zip-webpack-plugin');

module.exports = composePlugins(withNx(), config => {
  config.module.rules = [
    {
      test: /\.ts?$/,
      use: 'ts-loader',
      exclude: /node_modules/
    }
  ];

  config.plugins = config.plugins.concat(new ZipPlugin({ filename: 'dist.zip' }));
  return config;
});
