import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as process from "process";
import glob from "glob";
import webpack from "webpack";
import { Configuration as WebpackDevServerConfiguration, Request } from "webpack-dev-server";
// eslint-disable-next-line import/default
import CopyPlugin from "copy-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TerserPlugin from "terser-webpack-plugin";
import SimpleProgressWebpackPlugin from "simple-progress-webpack-plugin";

const buildMode = process.argv[3] === "production" ? "production" : "development";
const isProductionBuild = buildMode === "production";

interface Configuration extends Omit<webpack.Configuration, "devServer"> {
    devServer?: Omit<WebpackDevServerConfiguration, "proxy"> & {
        // the types in typescript are wrong for this, so we're doing it live here.
        proxy?: {
            context: (pathname: string, _request: Request) => boolean;
            target: string;
            ws: boolean | undefined;
        };
    };
}

const allTemplates = (): string => {
    return glob
        .sync("**/*.html", { cwd: path.join(__dirname, "static/templates") })
        .map((file: string) => `"systems/pf2e/templates/${file}"`)
        .join(", ");
};

const [outDir, foundryUri] = ((): [string, string] => {
    const configPath = path.resolve(process.cwd(), "foundryconfig.json");
    const config = fs.readJSONSync(configPath, { throws: false });
    const outDir =
        config instanceof Object
            ? path.join(config.dataPath, "Data", "systems", config.systemName ?? "pf2e")
            : path.join(__dirname, "dist/");
    const foundryUri = (config instanceof Object ? String(config.foundryUri) : "") ?? "http://localhost:30000";
    return [outDir, foundryUri];
})();

/** Create an empty static files when in dev mode to keep the Foundry server happy */
class EmptyStaticFilesPlugin {
    apply(compiler: webpack.Compiler): void {
        compiler.hooks.afterEmit.tap("EmptyStaticFilesPlugin", (): void => {
            if (!isProductionBuild) {
                fs.closeSync(fs.openSync(path.resolve(outDir, "vendor.bundle.js"), "w"));
            }
        });
    }
}

type Optimization = Configuration["optimization"];
const optimization: Optimization = isProductionBuild
    ? {
          minimize: true,
          minimizer: [
              new TerserPlugin({ terserOptions: { mangle: false, module: true, keep_classnames: true } }),
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
    },
    module: {
        rules: [
            !isProductionBuild
                ? {
                      test: /\.html$/,
                      loader: "raw-loader",
                  }
                : {
                      test: /\.html$/,
                      loader: "null-loader",
                  },
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: "ts-loader",
                        options: {
                            configFile: path.resolve(__dirname, "tsconfig.json"),
                            happyPackMode: true,
                            transpileOnly: true,
                            compilerOptions: {
                                noEmit: false,
                            },
                        },
                    },
                    "webpack-import-glob-loader",
                ],
            },
            {
                test: /template-preloader\.ts$/,
                use: [
                    {
                        loader: "string-replace-loader",
                        options: {
                            search: '"__ALL_TEMPLATES__"',
                            replace: allTemplates,
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
    devServer: {
        hot: true,
        devMiddleware: {
            writeToDisk: true,
        },
        proxy: {
            context: (pathname: string, _request: Request) => {
                return !pathname.match("^/ws");
            },
            target: foundryUri,
            ws: true,
        },
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({ typescript: { memoryLimit: 4096 } }),
        new webpack.WatchIgnorePlugin({ paths: ["node_modules/", "packs/", "static/packs/"] }),
        new webpack.DefinePlugin({
            BUILD_MODE: JSON.stringify(buildMode),
            ROLL_GRAMMAR: JSON.stringify(fs.readFileSync("roll-grammar.peggy", { encoding: "utf-8" })),
        }),
        new CopyPlugin({
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
        new EmptyStaticFilesPlugin(),
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
        extensions: [".ts", ".js"],
    },
    output: {
        clean: true,
        path: outDir,
        filename: "[name].bundle.js",
        publicPath: "/systems/pf2e",
    },
};

// eslint-disable-next-line import/no-default-export
export default config;
