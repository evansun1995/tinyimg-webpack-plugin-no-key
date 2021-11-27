const path = require('path')
const myplugin = require('./myplugin')

const config = {
    entry: path.join(__dirname, 'src','index.js'),
    entry:{
        index: './src/index.js',
        a1: './src/a.js',
        a2: './src/2/a.js',
      },
    /* output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist')
    }, */
    module: {
        rules: [
        ]
    },
    plugins: [
        new myplugin()
    ],
    mode: "development"
}

module.exports = config