// 依次使用tinyjpg和tinypng两个域名
const IMG_REGEXP = /\.(jpe?g|png)$/

const PLUGIN_NAME = 'tinyimg-webpack-plugin'

const CACHE_DIR = 'TINY_IMG_CACHE'

const TINYIMG_URL = ['tinyjpg.com', 'tinypng.com']

module.exports = {
  IMG_REGEXP,
  PLUGIN_NAME,
  CACHE_DIR,
  TINYIMG_URL
}
