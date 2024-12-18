const path = require('path');

module.exports = {
    mode: "production",
    entry: './src/main.ts',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    transpileOnly: false
                }
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
    optimization: {
        minimize: true
    }
}
