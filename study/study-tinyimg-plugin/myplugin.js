const fs = require('fs')

class HelloWord {
    apply(compiler) {
      compiler.hooks.emit.tap('helloword', (stat) => {
        const cache = []
        let jsonData = JSON.stringify(stat, (key, value) => {
          if (cache.indexOf(value) !== -1) {
              return;
          }
          cache.push(value);
          return typeof value === "bigint" ? value.toString() : value
         })
        fs.writeFile('compilation.json', jsonData,(err) => {
          if (err) throw err;
          console.log('The file has been saved!');
        })           
        console.log('hello world')
    })
    }
}

module.exports = HelloWord