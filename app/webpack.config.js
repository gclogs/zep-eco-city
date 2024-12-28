const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    mode: "production",
    entry: './main.ts',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: false
                    }
                },
                exclude: /node_modules/
            }
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            'zep-script': path.resolve(__dirname, 'node_modules/zep-script')
        }
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new webpack.DefinePlugin({
            'ScriptApp': 'App',
            'ScriptMap': 'Map',
            'ScriptPlayer': 'Player',
        })
    ],
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true,
                    },
                    format: {
                        comments: false,
                    },
                    mangle: true,
                },
            }),
        ],
    }
}
