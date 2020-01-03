import * as fs from 'fs';
import * as path from 'path';
import * as webpack from 'webpack';

const _ = require('lodash');
const minimist = require('minimist');
const NodemonPlugin = require('nodemon-webpack-plugin');
const { TsConfigPathsPlugin, CheckerPlugin } = require('awesome-typescript-loader');

const DEFAULT_TARGET = 'node';

const nodeModules = fs.readdirSync('node_modules')
  .reduce(function (acc: any, mod: any) {
    if (mod === '.bin') {
      return acc;
    }

    acc[mod] = 'commonjs ' + mod;
    return acc;
  }, {});

const DEFAULT_PARAMS: webpack.Configuration = {
  mode: 'production',
  context: path.join(__dirname, `src`),
  target: 'node',
  externals: nodeModules,
  resolve: {
    extensions: ['.ts', '.js']
  },
  optimization: {
    minimize: false
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'awesome-typescript-loader',
            options: {
              configFileName: 'tsconfig.json'
            }
          }
        ]
      }
    ]
  }
};

const PARAMS_PER_TARGET: any = {
  node: {
    target: 'node',
    entry: {
      App: './server.ts'
    },
    output: {
      path: path.join(__dirname, 'dist'),
      libraryTarget: 'commonjs',
      filename: `[name].js`
    },
    plugins: [
      new NodemonPlugin(), // Dong
    ],
    node: {
      console: false,
      global: false,
      process: false,
      crypto: false,
      Buffer: false,
      __filename: false,
      __dirname: false
    }
  }
};

const target: string = _resolveBuildTarget(DEFAULT_TARGET);
const params: any = _.merge(DEFAULT_PARAMS, PARAMS_PER_TARGET[target], _mergeArraysCustomizer);

export default params;

function _resolveBuildTarget (defaultTarget: string): string {
  let target = minimist(process.argv.slice(2)).target;
  if (!target) {
    console.log('No build target provided, using default target instead\n\n');
    target = defaultTarget;
  }
  return target;
}

function _mergeArraysCustomizer (a: any, b: any): any {
  if (_.isArray(a)) {
    return a.concat(b);
  }
}
