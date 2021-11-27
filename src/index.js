const { PLUGIN_NAME } = require('../utils/constant')
const Ora = require('ora') // 终端loading库
const { validate } = require('schema-utils') // schema验证方法
const Schema = require('./schema')
const Compress = require('./compress')

module.exports = class TinyImgWebpackPlugin {
  // 在构造函数中获取用户给该插件传入的配置
  constructor(opts = {}) {
    /*
     *opts配置：
     * enabled：Boolean，是否开启图片压缩
     * logged：Boolean，是否输出日志
     */
    this.opts = opts
  }
  // Webpack 会调用 TinyimgWebpackPlugin 实例的 apply 方法，给插件实例传入 compiler 对象
  apply(compiler) {
    // 在emit阶段插入钩子函数，用于特定时机处理额外的逻辑；
    // emit是个asyncHook，异步钩子
    // 支持tap、tapPromise、tapAsync
    // tapPromise必须return一个Promise对象
    // tapAsync会有个callback参数，需要手动执行
    const { enabled = true, logged = true } = this.opts
    // 使用schema校验参数
    validate(Schema, this.opts, { name: PLUGIN_NAME })
    // compilation对象是webpack plugin构建的核心
    enabled &&
      compiler.hooks.emit.tapPromise(PLUGIN_NAME, (compilation) => {
        const spinner = Ora('Image is compressing......').start()
        return Compress(compilation).then((logs = []) => {
          spinner.stop()
          logged && logs.forEach((v) => console.log(v))
        })
      })
  }
}
