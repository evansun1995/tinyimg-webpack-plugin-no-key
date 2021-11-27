const Fs = require('fs')
const Https = require('https')
const Path = require('path')
const Url = require('url')
const Chalk = require('chalk') // 终端字符串样式库
const Figures = require('figures') // Unicode字体图标库
const Ora = require('ora') // 终端loading库

// 依次使用tinyjpg和tinypng两个域名
const TINYIMG_URL = ['tinyjpg.com', 'tinypng.com']

// 创建范围内随机整数
function RandomNumInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}
//将比特值转换成最小单位数
function ByteSize(byte = 0) {
	if (byte === 0) return "0 B";
	const unit = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  // loga(b) = loga/logb，即以unit为底，byte为幂，求指数：log uint(byte)
  // Math.floor向下取整
	const i = Math.floor(Math.log(byte) / Math.log(unit));
  // 返回最大单位值
	return RoundNum(Number(byte / Math.pow(unit, i))) + " " + sizes[i];
}
//解决toFixed精度问题的四舍五入，支持转成百分比字符串
function RoundNum(num = 0, dec = 2, per = false) {
  // a**b表示a的b次方
	return per
		? Math.round(num * 10 ** dec * 100) / 10 ** dec + "%"
		: Math.round(num * 10 ** dec) / 10 ** dec;
}

// 伪造请求头，生成随机ip，避免请求数量限制
function RandomHeader() {
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
      'X-Forwarded-For': ip
    },
    hostname: TINYIMG_URL[index],
    method: 'POST',
    path: '/web/shrink',
    rejectUnauthorized: false
  }
}

function UploadImg(file) {
  // 生成http请求配置
  const opts = RandomHeader()
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

function DownloadImg(url) {
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

// 压缩图片代码
async function CompressImg(path) {
  try {
    // 以二进制流方式 同步 读取图片文件
    const file = Fs.readFileSync(path, 'binary')
    // 上传图片，获取响应对象obj
    const obj = await UploadImg(file)
    console.log(obj)
    // 下载图片，获取下载的图片文件流
    const data = await DownloadImg(obj.output.url)
    Fs.writeFileSync('upload-res.txt', JSON.stringify(obj), 'utf8')
    // 原始文件大小
    const oldSize = Chalk.redBright(ByteSize(obj.input.size))
    // 压缩后文件大小
    const newSize = Chalk.greenBright(ByteSize(obj.output.size))
    // 压缩率
    const ratio = Chalk.blueBright(RoundNum(1 - obj.output.ratio, 2, true))
    // 生成新的文件路径
    let dirPath='img'
    // 要确保文件夹存在，否则会报错
    !Fs.existsSync(dirPath)&&Fs.mkdirSync(dirPath)
    const dpath = Path.join(dirPath, Path.basename(path))
    // 控制台输出结果
    const msg = `${Figures.tick} Compressed [${Chalk.yellowBright(
      path
    )}] completed: Old Size ${oldSize}, New Size ${newSize}, Optimization Ratio ${ratio}`
    Fs.writeFileSync(dpath, data, 'binary')
    return Promise.resolve(msg)
  } catch (err) {
    const msg = `${Figures.cross} Compressed [${Chalk.yellowBright(path)}] failed: ${Chalk.redBright(err)}`
    return Promise.resolve(msg)
  }
}

;(async () => {
  // 开启控制台loading
  const spinner = Ora('Image is compressing......').start()
  const res = await CompressImg('src/pig.png')
  spinner.stop()
  console.log(res)
})()
