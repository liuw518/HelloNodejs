var express = require('express');
var router = express.Router();
var fs = require('fs');

/* 核保接口 */
router.post('/', function(req, res, next) {
  // 幂等性校验
  // 入口报文落地
  // 入口报文转换
  // 请求报文落地
  // 响应报文落地
  // 响应报文转换
  // 返回报文落地
  console.log(req.body);
  var fileStr = fs.readFileSync('public/data/4sffhbw.json', 'utf8');
  res.send(fileStr);
});

module.exports = router;