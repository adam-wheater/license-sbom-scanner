const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = (env, argv) => ({
  entry: {
    ComplianceHub: "./src/ComplianceHub/ComplianceHub.tsx",
  },
  output: {
    filename: "[name]/[name].js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/dist/",
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
        use: ["style-loader", "css-loader"],
      },
    ],
  },
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
  ],
  devtool: argv.mode === "production" ? false : "source-map",
});
