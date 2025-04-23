const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

//pack the electron main process and preload script

module.exports = (env, argv) => {
  const config = {
    entry: {
      app: './src/main/app.ts',
      preload: './src/main/preload.ts'
    },
    target: 'electron-main',
    output: {
      path: path.resolve(__dirname, '../../dist'),
      filename: '[name].js',
      devtoolModuleFilenameTemplate: '[absolute-resource-path]'
    },
    externals: [
      nodeExternals(),
      nodeExternals({
        modulesDir: path.resolve(__dirname, '../../../../node_modules')
      })
    ],
    module: {
      rules: [
        {
          test: /\.ts?$/,
          loader: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.jsx', '.json'],
      alias: { src: path.resolve('./src') }
    },
    node: {
      __dirname: false
    },
    plugins: [
      new webpack.DefinePlugin({
        IS_DEV: argv.mode === 'development',
        IS_TESTING: env.isTesting ? true : false,
        WEBSITE_URL:
          process.env.WEB_URL ||
          JSON.stringify(
            argv.mode === 'development'
              ? 'http://localhost:3000/api'
              : 'https://mockoon.com/' //TODO: GREEN APP
          ),
        API_URL:
          process.env.API_URL ||
          JSON.stringify(
            argv.mode === 'development'
              ? 'http://localhost:5003/api'
              : 'https://api.mockoon.com/' //TODO: GREEN APP: should init the form for the api on startup and injects to the renderer
          )
      })
    ]
  };

  if (argv.mode === 'development') {
    config.devtool = 'source-map';
  }

  return config;
};
