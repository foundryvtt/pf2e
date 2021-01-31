import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import { Configuration } from 'webpack';
import copyWebpackPlugin from 'copy-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import WebpackBar from 'webpackbar';

const buildMode = process.argv[3] == 'production' ? 'production' : 'development';
const isProductionBuild = buildMode === 'production';

const pf2eSystemPath = (() => {
    const configPath = path.resolve(process.cwd(), 'foundryconfig.json');
    const configData = fs.existsSync(configPath) ? fs.readJSONSync(configPath) : undefined;
    return configData !== undefined ? path.join(configData.dataPath, 'Data', 'systems', configData.systemName) : null;
})();
const outDir = pf2eSystemPath ?? path.join(__dirname, 'dist/');

type Optimization = Configuration['optimization'];
const optimization: Optimization = isProductionBuild
    ? {
          minimize: true,
          minimizer: [
              new TerserPlugin({
                  terserOptions: {
                      mangle: false,
                  },
              }),
              new CssMinimizerPlugin(),
          ],
      }
    : undefined;

const config: Configuration = {
    context: __dirname,
    mode: buildMode,
    entry: './src/pf2e.ts',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(__dirname, 'tsconfig.json'),
                            experimentalWatchApi: !isProductionBuild,
                            happyPackMode: true,
                        },
                    },
                ],
            },
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            url: false,
                            sourceMap: true,
                        },
                    },
                    {
                        loader: 'sass-loader',
                        options: { sourceMap: true },
                    },
                ],
            },
            {
                loader: 'thread-loader',
                options: {
                    workers: os.cpus().length + 1,
                    poolRespawn: false,
                    poolTimeout: isProductionBuild ? 500 : Infinity,
                },
            },
        ],
    },
    optimization: optimization,
    devtool: isProductionBuild ? undefined : 'inline-source-map',
    bail: isProductionBuild,
    watch: !isProductionBuild,
    plugins: [
        new CleanWebpackPlugin(),
        new copyWebpackPlugin({
            patterns: [{ from: 'static/' }, { from: 'system.json' }],
        }),
        new ForkTsCheckerWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: 'styles/pf2e.css',
            insert: 'head',
        }),
        new WebpackBar({}),
    ],
    resolve: {
        alias: {
            '@actor': path.resolve(__dirname, 'src/module/actor'),
            '@item': path.resolve(__dirname, 'src/module/item'),
        },
        extensions: ['.ts'],
    },
    output: {
        path: outDir,
        filename: 'main.bundle.js',
    },
};

export default config;
