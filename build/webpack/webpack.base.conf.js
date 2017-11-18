const path = require('path')
const config = require('../config')
const vueLoaderConfig = require('./loaders/vue-loader.conf')
const { getEntries, nodeModulesRegExp } = require('../utils/utils')
const { styleLoaders } = require('./loaders/style-loader')
const paths = config.paths

const entry = `src/view/${process.env.ENTRY || '*'}/index.js`
const entries = getEntries(entry, require.resolve('./polyfills'))
const isProd = process.env.NODE_ENV === 'production'
const maraConf = require(paths.marauder)
const shouldUseSourceMap = isProd && !!maraConf.sourceMap
const assetsHash = isProd && !!maraConf.assetsHash ? '.[hash:8]' : ''

function babelExternalMoudles(esm) {
  if (!(esm && esm.length)) return nodeModulesRegExp(config.esm)

  // 当 esm 为 all 时，编译 node_modules 下所有模块
  if (esm === 'all') esm = ''

  return nodeModulesRegExp([].concat(config.esm, esm))
}

module.exports = {
  entry: entries,
  output: {
    path: paths.dist,
    filename: 'static/js/[name].js',
    chunkFilename: 'static/js/[name].chunk.js'
  },
  resolve: {
    extensions: [
      '.js',
      '.ts',
      '.mjs',
      '.tsx',
      '.web.js',
      '.vue',
      '.json',
      '.web.jsx',
      '.jsx'
    ],
    modules: ['node_modules', paths.nodeModules],
    alias: {
      vue$: 'vue/dist/vue.esm.js',
      src: paths.src,
      'babel-runtime': path.dirname(
        require.resolve('babel-runtime/package.json')
      ),
      // Support React Native Web
      // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
      'react-native': 'react-native-web'
    }
  },
  module: {
    // makes missing exports an error instead of warning
    strictExportPresence: false,
    loaders: [{ test: /\.html$/, loader: 'html-withimg-loader' }],
    rules: [
      {
        oneOf: [
          ...styleLoaders({
            sourceMap: shouldUseSourceMap,
            extract: isProd,
            minimize: isProd
          }),
          {
            test: /\.(bmp|png|jpe?g|gif|svg)(\?.*)?$/,
            loader: 'url-loader',
            options: {
              limit: 10000,
              name: `static/img/[name]${assetsHash}.[ext]`
            }
          },
          {
            test: /\.art$/,
            loader: 'art-template-loader'
          },
          {
            test: /\.vue$/,
            loader: 'vue-loader',
            options: vueLoaderConfig
          },
          // Process JS with Babel.
          {
            test: /\.(js|jsx)$/,
            include: [paths.src, paths.test].concat(
              babelExternalMoudles(maraConf.esm)
            ),
            loader: 'babel-loader',
            options: {
              babelrc: false,
              presets: ['babel-preset-react-app'],
              compact: isProd,
              // `babel-loader` 特性
              // 在 ./node_modules/.cache/babel-loader/ 中缓存执行结果
              // 提升性能
              cacheDirectory: !isProd
            }
          },
          {
            test: /\.tsx?$/,
            loader: 'ts-loader',
            include: [paths.src, paths.test].concat(
              babelExternalMoudles(maraConf.esm)
            ),
            options: {
              appendTsSuffixTo: [/\.vue$/]
            }
          },
          {
            test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
            loader: 'file-loader',
            options: {
              name: `static/fonts/[name]${assetsHash}.[ext]`
            }
          },
          {
            // Exclude `js` files to keep "css" loader working as it injects
            // it's runtime that would otherwise processed through "file" loader.
            // Also exclude `html` and `json` extensions so they get processed
            // by webpacks internal loaders.
            exclude: [/\.js$/, /\.html$/, /\.json$/],
            loader: 'file-loader',
            options: {
              name: `static/media/[name]${assetsHash}.[ext]`
            }
          }
        ]
      }
    ]
  },
  // Some libraries import Node modules but don't use them in the browser.
  // Tell Webpack to provide empty mocks for them so importing them works.
  node: {
    dgram: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    child_process: 'empty'
  }
}