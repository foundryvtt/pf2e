import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import { Compiler, Configuration, Stats } from 'webpack';
import copyWebpackPlugin from 'copy-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import TerserPlugin from 'terser-webpack-plugin';
// import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'; Will hopefully be fixed in the next few days
import WebpackBar from 'webpackbar';

const mode = (process.argv[2] === '--mode' && process.argv[3]) ?? 'development';
const isProductionBuild = mode === 'production';

const pf2eSystemPath = (() => {
    const configPath = path.resolve(process.cwd(), 'foundryconfig.json');
    const configData = fs.existsSync(configPath) ? fs.readJSONSync(configPath) : undefined;
    return configData !== undefined ? path.join(configData.dataPath, 'Data', 'systems', configData.systemName) : null;
})();

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
              '...',
              new CssMinimizerPlugin(),
          ],
          splitChunks: {
              chunks: 'all',
          },
      }
    : undefined;

const config: Configuration = {
    context: __dirname,
    entry: {
        main: {
            import: path.resolve(__dirname, './src/pf2e.ts'),
            dependOn: 'entities',
        },
        entities: {
            import: path.resolve(__dirname, './src/module/entities.ts'),
        }
    },
    mode: isProductionBuild ? 'production' : 'development',
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
                        options: {
                            sourceMap: true,
                            additionalData: `@import "${path.resolve(__dirname, 'src/styles/_globals.scss')}";`,
                        },
                    },
                ],
            },
            {
                loader: 'thread-loader',
                options: {
                    workers: os.cpus.length - 1,
                    poolTimeout: Infinity,
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
            patterns: [{ from: 'static' }, { from: 'system.json' }],
        }),
        new ForkTsCheckerWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: 'styles/[name].css',
            insert: 'head',
        }),
        new WebpackBar({}),
        {
            apply: (compiler: Compiler) => {
                compiler.hooks.done.tap('DonePlugin', (_stats: Stats) => {
                    if (isProductionBuild) {
                        setTimeout(() => {
                            process.exit(0);
                        });
                    }
                });
            },
        },
    ],
    resolve: {
        extensions: ['.ts'],
        plugins: [
            // new TsconfigPathsPlugin({ configFile: "./path/to/tsconfig.json" }),
        ],
    },
    output: {
        path: pf2eSystemPath ?? path.join(__dirname, 'dist'),
        filename: '[name].bundle.js',
    },
};

export default config;
