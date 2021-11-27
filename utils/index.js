// 创建范围内随机整数
function RandomNumInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
//将比特值转换成最小单位数
function ByteSize(byte = 0) {
  if (byte === 0) return '0 B';
  const unit = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  // loga(b) = loga/logb，即以unit为底，byte为幂，求指数：log uint(byte)
  // Math.floor向下取整
  const i = Math.floor(Math.log(byte) / Math.log(unit));
  // 返回最大单位值
  return RoundNum(Number(byte / Math.pow(unit, i))) + ' ' + sizes[i];
}
//解决toFixed精度问题的四舍五入，支持转成百分比字符串
function RoundNum(num = 0, dec = 2, per = false) {
  // a**b表示a的b次方
  return per ? Math.round(num * 10 ** dec * 100) / 10 ** dec + '%' : Math.round(num * 10 ** dec) / 10 ** dec;
}

module.exports = {
  RandomNumInt,
  ByteSize,
  RoundNum,
};
