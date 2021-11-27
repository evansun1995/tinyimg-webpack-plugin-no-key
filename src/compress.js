const { IMG_REGEXP, TINYIMG_URL, CACHE_DIR } = require('../utils/constant')
const Fs = require('fs')
const Https = require('https')
const Path = require('path')
const Url = require('url')
const Chalk = require('chalk') // 终端字符串样式库
const Figures = require('figures') // Unicode字体图标库
const { RawSource } = require('webpack-sources') // 处理webpack文件对象
const { RandomNumInt, ByteSize, RoundNum } = require('../utils/index')
const md5 = require('md5')

// 伪造请求头，生成随机ip，避免请求数量限制6
function randomHeader() {
  // 随机生成4位的ip
  const ip = new Array(4)
    .fill(0)
    .map(() => parseInt(Math.random() * 255))
    .join('.')
  const index = RandomNumInt(0, 1)
  return {
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Postman-Token': Date.now(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36',
      'X-Forwarded-For': ip,
      'X-Real-Ip': ip
    },
    hostname: TINYIMG_URL[index],
    method: 'POST',
    path: '/web/shrink',
    rejectUnauthorized: false
  }
}

// 上传图片方法
function uploadImg(file) {
  // 生成http请求配置
  const opts = randomHeader()
  return new Promise((resolve, reject) => {
    // 发起http请求
    // 发起请求，生成http.ClientRequest的可写流示例，用于处理请求事件、写入文件（传输）
    // http.ClientRequest继承自可写流
    const req = Https.request(opts, (res) =>
      // 这个相应回调函数中**必须**有res.read() 或者 data事件处理函数 或者 req.resume()事件
      // 以此将响应对象的数据进行消费
      // 否则在数据被消费完之前，不会触发 'end' 事件
      // 此外，在读取数据之前，它会放在缓冲区内占用内存，这可能最终会导致进程内存不足的错误
      res.on('data', (data) => {
        // 返回一个可读流data
        //.toString()转为字符串，默认utf8编码
        const obj = JSON.parse(data.toString())
        obj.error ? reject(obj.message) : resolve(obj)
      })
    )
    // 发送一个请求主体的数据块，也可以多次调用传输（切片上传）
    req.write(file, 'binary')
    // 处理error事件，reject处理
    req.on('error', (e) => reject(e))
    // 表明已没有数据要被写入可写流，结束这个流
    req.end()
  })
}

// 下载压缩后的图片
function downloadImg(url) {
  const opts = new Url.URL(url)
  return new Promise((resolve, reject) => {
    const req = Https.request(opts, (res) => {
      let file = ''
      // 设置编码格式为binary(二进制流)
      res.setEncoding('binary')
      // 接口返回可能是多个文件片段
      // 会多次触发data事件
      // 使用变量将数据流片段拼接起来
      res.on('data', (chunk) => (file += chunk))
      res.on('end', () => resolve(file))
    })
    req.on('error', (e) => reject(e))
    req.end()
  })
}

/**
 * 将图片缓存到本地
 */
function cacheImgLocal(name, data) {
  return new Promise((resolve, reject) => {
    const cachePath = Path.join(CACHE_DIR, name)
    // 同步写入文件到设置的地址中
    Fs.writeFile(cachePath, data, 'binary', function (err) {
      if (err) {
        reject(err)
      } else {
        resolve(cachePath)
      }
    })
  })
}

async function useCache() {}

// 压缩图片代码
async function compressImg(assets, path) {
  try {
    console.log('path--------', path)
    // assets用于表示webpack编译的资源文件的
    // 在assets对象中，key是文件的名加后缀，value是一个对象，里面包含source和size等属性（可枚举和不可枚举属性）
    // 图片经过对应的loader（file-loader）处理后，在assets对象中会生成'[path][name].[ext]'这样格式的key，也可以配置使用hash加密
    const file = assets[path].source()
    let ext = Path.extname(path)
    // 文件名为md5加密文件后的32位字符 拼上文件后缀
    let md5Name = md5(file) + ext
    let cachePath = Path.join(CACHE_DIR, md5Name)
    // 如果存在缓存文件，直接使用
    if (Fs.existsSync(cachePath)) {
      return new Promise((resolve, reject) => {
        // readFile不指定类型，返回buffer类型
        Fs.readFile(cachePath, function (err, data) {
          if (err) {
            const msg = `${Figures.cross} Compressed [${Chalk.yellowBright(path)}] failed: ${Chalk.redBright(err)}`
            resolve(msg)
          } else {
            assets[path] = new RawSource(data)
            // assets[path] = new RawSource(Buffer.alloc(data.length, data, 'binary'))
            const msg = `${Figures.tick} Compressed [${Chalk.yellowBright(path)}] completed: use cache [${Chalk.yellowBright(cachePath)}]`
            resolve(msg)
          }
        })
      })
    }
    // 上传图片，获取接口响应对象obj
    const obj = await uploadImg(file)
    // 下载图片，获取下载的图片文件流
    const data = await downloadImg(obj.output.url)
    // RawSource，处理webpack文件对象的插件
    // 官方解释是：A Source can be asked for source code, size, source map and hash.
    // 应该是生成一个对象，里面包含文件源码、大小、资源映射和哈希值
    assets[path] = new RawSource(Buffer.alloc(data.length, data, 'binary'))
    // 测试一下返回结果
    // Fs.writeFileSync('upload-res.txt', JSON.stringify(obj), 'utf8')
    // 原始文件大小
    const oldSize = Chalk.redBright(ByteSize(obj.input.size))
    // 压缩后文件大小
    const newSize = Chalk.greenBright(ByteSize(obj.output.size))
    // 压缩率
    const ratio = Chalk.blueBright(RoundNum(1 - obj.output.ratio, 2, true))
    // 要确保缓存的文件夹存在，否则会报错
    !Fs.existsSync(CACHE_DIR) && Fs.mkdirSync(CACHE_DIR)
    // 缓存到本地
    await cacheImgLocal(md5Name, data)
    // 控制台输出结果
    const msg = `${Figures.tick} Compressed [${Chalk.yellowBright(
      path
    )}] completed: Old Size ${oldSize}, New Size ${newSize}, Optimization Ratio ${ratio}`
    return Promise.resolve(msg)
  } catch (err) {
    const msg = `${Figures.cross} Compressed [${Chalk.yellowBright(path)}] failed: ${Chalk.redBright(err)}`
    return Promise.resolve(msg)
  }
}

/**
 * 图片压缩入口
 * @param  {[type]} compilation     [webpack 构建对象]
 * @return {Promise}                [返回Promise，参数为输出日志的数组]
 */
module.exports = async (compilation) => {
  // 从所有的资源文件中过滤出需要压缩的图片文件
  const imgs = Object.keys(compilation.assets).filter((v) => IMG_REGEXP.test(v))
  if (!imgs.length) return Promise.resolve()
  const promises = imgs.map((v) => compressImg(compilation.assets, v))
  let logs = await Promise.all(promises)
  return logs
}
