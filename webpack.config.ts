import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as process from "process";
import { Configuration, DefinePlugin } from "webpack";
import copyWebpackPlugin from "copy-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TerserPlugin from "terser-webpack-plugin";
import SimpleProgressWebpackPlugin from "simple-progress-webpack-plugin";

const buildMode = process.argv[3] === "production" ? "production" : "development";
const isProductionBuild = buildMode === "production";

const outDir = (() => {
    const configPath = path.resolve(process.cwd(), "foundryconfig.json");
    const config = fs.readJSONSync(configPath, { throws: false });
    return config instanceof Object
        ? path.join(config.dataPath, "Data", "systems", config.systemName ?? "pf2e")
        : path.join(__dirname, "dist/");
})();

type Optimization = Configuration["optimization"];
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
          splitChunks: {
              chunks: "all",
              cacheGroups: {
                  default: {
                      name: "main",
                      test: "src/pf2e.ts",
                  },
                  vendor: {
                      name: "vendor",
                      test: /node_modules/,
                  },
              },
          },
      }
    : undefined;

const config: Configuration = {
    context: __dirname,
    mode: buildMode,
    entry: {
        main: "./src/pf2e.ts",
        tinymce: "./src/styles/tinymce.scss",
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: "ts-loader",
                        options: {
                            configFile: path.resolve(__dirname, "tsconfig.json"),
                            experimentalWatchApi: !isProductionBuild,
                            happyPackMode: true,
                            transpileOnly: true,
                            compilerOptions: {
                                noEmit: false,
                            },
                        },
                    },
                ],
            },
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: {
                            url: false,
                            sourceMap: true,
                        },
                    },
                    {
                        loader: "sass-loader",
                        options: { sourceMap: true },
                    },
                ],
            },
            {
                test: /nouislider\.min\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: {
                            url: false,
                            sourceMap: true,
                        },
                    },
                ],
            },
            {
                loader: "thread-loader",
                options: {
                    workers: os.cpus().length + 1,
                    poolRespawn: false,
                    poolTimeout: isProductionBuild ? 500 : Infinity,
                },
            },
        ],
    },
    optimization: optimization,
    devtool: isProductionBuild ? undefined : "inline-source-map",
    bail: isProductionBuild,
    watch: !isProductionBuild,
    plugins: [
        new ForkTsCheckerWebpackPlugin({ typescript: { memoryLimit: 4096 } }),
        new DefinePlugin({
            BUILD_MODE: JSON.stringify(buildMode),
        }),
        new copyWebpackPlugin({
            patterns: [
                { from: "system.json" },
                {
                    from: "static/",
                    transform(content: Buffer, absoluteFrom: string) {
                        if (path.basename(absoluteFrom) === "en.json") {
                            return JSON.stringify(JSON.parse(content.toString()));
                        }
                        return content;
                    },
                },
            ],
        }),
        new MiniCssExtractPlugin({ filename: "styles/[name].css" }),
        new SimpleProgressWebpackPlugin({ format: "compact" }),
    ],
    resolve: {
        alias: {
            "@actor": path.resolve(__dirname, "src/module/actor"),
            "@item": path.resolve(__dirname, "src/module/item"),
            "@module": path.resolve(__dirname, "src/module"),
            "@scene": path.resolve(__dirname, "src/module/scene"),
            "@scripts": path.resolve(__dirname, "src/scripts"),
            "@system": path.resolve(__dirname, "src/module/system"),
            "@util": path.resolve(__dirname, "src/util"),
        },
        extensions: [".ts"],
    },
    output: {
        clean: true,
        path: outDir,
        filename: "[name].bundle.js",
    },
};

// eslint-disable-next-line import/no-default-export
export default config;
