const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = (env, argv) => {
  const isProd = argv.mode === "production";
  return {
    entry: {
      ComplianceHub: "./src/ComplianceHub/ComplianceHub.tsx",
    },
    output: {
      filename: isProd ? "[name]/[name].[contenthash:8].js" : "[name]/[name].js",
      path: path.resolve(__dirname, "dist"),
      publicPath: "/dist/",
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
      alias: {
        "@": path.resolve(__dirname, "src"),
        "azure-devops-extension-sdk": path.resolve(
          __dirname,
          "node_modules/azure-devops-extension-sdk"
        ),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [isProd ? MiniCssExtractPlugin.loader : "style-loader", "css-loader"],
        },
      ],
    },
    optimization: isProd
      ? {
          usedExports: true,
          minimize: true,
          minimizer: ["...", new CssMinimizerPlugin()],
          splitChunks: {
            chunks: "all",
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: "vendor",
                chunks: "all",
                priority: 10,
              },
            },
          },
        }
      : undefined,
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "src/ComplianceHub/ComplianceHub.html",
            to: "ComplianceHub/ComplianceHub.html",
          },
          { from: "static", to: "static" },
        ],
      }),
      ...(isProd ? [new MiniCssExtractPlugin({ filename: "[name]/[name].[contenthash:8].css" })] : []),
    ],
    devtool: isProd ? false : "source-map",
  };
};
