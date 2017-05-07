var Promise = require('bluebird');
var dbutil = require('db-helper');
var http = require('http');
var config = require('config');
var logger = require('log-factory').getLogger();
// var utils = require('./utils');

var utils = {
  STATUS_SUCCESS: 1,
  STATUS_ERROR: 0,

  /**
   * 记录报文日志
   * transNo 交易流水号，必填
   * type 报文类型（SR、CS、CR、SS），必填
   * msg  报文，必填
   * status 状态，0失败，1成功，必填
   * timestamp 时间戳，可选项
   */
  recordMsg: function(transNo, type, msg, status, timestamp) {
    if (!timestamp) {
      timestamp = new Date();
    }
    Promise.using(dbutil.getConnection(), function(conn) {
      return conn.queryAsync('insert into trade_log(type, msg, time, status, trans_no) values(?,?,?,?,?)', [
        type, msg, timestamp, status, transNo
      ]);
    });
  },

  /**
   * 向客户端返回报文
   * res  Response对象
   * transNo  交易流水号
   * returnObj 返回报文对象
   * status 状态，0失败，1成功，必填
   */
  returnMessage: function(res, transNo, returnObj, status) {
    utils.recordMsg(transNo, 'SS', JSON.stringify(returnObj), status);
    res.send(returnObj);
  },

  idempotent: function(result, transNo, req, res, input, returnObj, ctx) {
    //判断是否之前的请求已经返回了结果
    var status = result[0].status;
    if (status == utils.STATUS_SUCCESS) {
      //如果已经返回结果，将之前的结果取出直接返回即可
      res.type('.json');
      res.send(result[0].msg);
      return 'Terminal';
    } else {
      //如果返回的结果状态是失败的，则不管什么原因重新执行业务逻辑
      return utils.mainflow(transNo, req, res, input, returnObj, ctx);
    }
  },

  /**
   * 主业务流程
   * transNo  交易流水号
   * req Request对象
   * res Response对象
   * input  输入报文对象
   * returnObj  输出报文对象
   * ctx  报文交易上下文，其中包含对于输入输出报文的转换方法
   */
  mainflow: function(transNo, req, res, input, returnObj, ctx) {
    // 入口报文落地
    utils.recordMsg(transNo, 'SR', req.body, utils.STATUS_SUCCESS);

    //入口报文转换
    var output = {};
    try {
      ctx.convertInput(input, output);
    } catch (ex) {
      ctx.buildError(returnObj, 1, '输入报文转换过程中出现错误');
      // returnObj.result_code = 1;
      // returnObj.result_message = '输入报文转换过程中出现错误';
      utils.returnMessage(res, transNo, returnObj, utils.STATUS_ERROR);
      return 'Terminal';
    }

    //请求报文落地
    var outputStr = JSON.stringify(output);
    utils.recordMsg(transNo, 'CS', outputStr, utils.STATUS_SUCCESS);

    // 发送请求报文
    var request = http.request(config.interface_options.jyssf, function(response) {
      response.setEncoding('utf8');
      response.on('data', function(chunk) {
        // 响应报文落地
        var returnObj = {};
        var returnStatus = utils.STATUS_SUCCESS;
        var chunkObj = JSON.parse(chunk);
        if (response.statusCode != 200) {
          // 微服务端有异常发生
          utils.recordMsg(transNo, 'CR', chunk, utils.STATUS_ERROR);
          // var code = chunkObj.status;
          var message = chunkObj.error;
          // var detail = chunkObj.message;
          ctx.buildError(returnObj, 1, message);
          // returnObj.result_code = 1;
          // returnObj.result_message = message;
          returnStatus = utils.STATUS_ERROR;
        } else if (chunkObj.retData.flag == '00') {
          // 微服务端正常处理返回
          utils.recordMsg(transNo, 'CR', chunk, utils.STATUS_SUCCESS);

          // 响应报文转换
          try {
            ctx.convertOutput(chunkObj, returnObj);
          } catch (ex) {
            ctx.buildError(returnObj, 1, '输出报文转换过程中出现错误');
            // returnObj.result_code = 1;
            // returnObj.result_message = '输出报文转换过程中出现错误';
            returnStatus = utils.STATUS_ERROR;
          }
        } else {
          // 微服务端返回业务错误信息
          utils.recordMsg(transNo, 'CR', chunk, utils.STATUS_ERROR);
          ctx.buildError(returnObj, 1, chunkObj.retData.desc);
          // returnObj.result_code = 1;
          // returnObj.result_message = chunkObj.retData.desc;
          returnStatus = utils.STATUS_ERROR;
        }
        utils.returnMessage(res, transNo, returnObj, returnStatus);
      });
    });

    request.on('error', function(e) {
      //远程请求连接出现错误
      utils.recordMsg(transNo, 'CR', e, utils.STATUS_ERROR);
      ctx.buildError(returnObj, 1, e.message);
      // returnObj.result_code = 1;
      // returnObj.result_message = e.message;
      utils.returnMessage(res, transNo, returnObj, utils.STATUS_ERROR);
    });

    //发送请求报文
    request.write(outputStr);
    request.end();
    return 'Terminal';
  },

  /**
   * 对外接口，通过此方法接收返回报文
   */
  doPost: function(req, res, next, ctx) {
    var input = null;
    var returnObj = {};

    //对传入报文进行格式检查
    try {
      input = JSON.parse(req.body);
    } catch (ex) {
      utils.recordMsg('', 'SR', req.body, utils.STATUS_ERROR);
      ctx.buildError(returnObj, 1, '报文格式错误');
      // returnObj.result_code = 1;
      // returnObj.result_message = '报文格式错误';
      utils.returnMessage(res, '', returnObj, utils.STATUS_ERROR);
      return;
    }

    //检查是否存在交易流水号
    var transNo = input.transNo;
    if (!transNo) {
      utils.recordMsg('', 'SR', req.body, utils.STATUS_ERROR);
      ctx.buildError(returnObj, 1, '缺少交易流水号transNo');
      // returnObj.result_code = 1;
      // returnObj.result_message = '缺少交易流水号transNo';
      utils.returnMessage(res, '', returnObj, utils.STATUS_ERROR);
      return;
    }

    //幂等性校验
    Promise.using(dbutil.getConnection(), function(conn) {
      // 查询相同交易号，类型为Server Receive的，是否有记录
      var recentReceiveTime = null;
      return conn.queryAsync('select * from trade_log where trans_no = ? and type = ? and status = ? order by time desc', [
        transNo, 'SR', utils.STATUS_SUCCESS //, new Date(new Date().getTime() - 5 * 60 * 1000)
      ]).then(function(result) {
        if (result && result.length > 0) {
          //如果最近一次执行的记录显示接收报文正常，需要进一步根据请求发起时间判断后续的执行逻辑
          recentReceiveTime = result[0].time;
          return recentReceiveTime;
        } else {
          //如果没有查到，说明没有正常执行过，正常执行业务逻辑即可
          return 'Normal';
        }
      }).then(function(result) {
        if (result === 'Normal') {
          return utils.mainflow(transNo, req, res, input, returnObj, ctx);
        } else {
          //之前发送过该流水号的报文，需要判断之前是否已经返回了信息，并且返回的状态是成功的
          return conn.queryAsync('select * from trade_log where trans_no = ? and type = ? order by time desc', [
            transNo, 'SS'
          ]);
        }
      }).then(function(result) {
        if (result !== 'Terminal') {
          if (result && result.length > 0) {
            return utils.idempotent(result, transNo, req, res, input, returnObj, ctx);
          } else {
            //如果没有查到返回信息的记录，需要判断接收报文的时间
            if (recentReceiveTime.getTime() + 5 * 60 * 1000 < new Date().getTime()) {
              //如果接收报文的时间超过5分钟，则重新执行业务逻辑
              return utils.mainflow(transNo, req, res, input, returnObj, ctx);
            } else {
              var isOK = false;
              //如果没有超过5分钟，则等待返回结果，返回
              var delay = Promise.delay(5000).then(function() {
                return conn.queryAsync('select * from trade_log where trans_no = ? and type = ? order by time desc', [
                  transNo, 'SS'
                ]);
              }); //每次延迟5秒,重复10次
              for (var i = 0; i < 3; i++) {
                delay = delay.delay(5000).then(function(result) {
                  if (result && result.length > 0) {
                    if (utils.idempotent(result, transNo, req, res, input, returnObj) == 'Terminal') {
                      isOK = true;
                      throw new Error();
                    }
                  } else {
                    return conn.queryAsync('select * from trade_log where trans_no = ? and type = ? order by time desc', [
                      transNo, 'SS'
                    ]);
                  }
                });
              }
              delay.catch(function() {}).finally(function() {
                if (!isOK) {
                  ctx.buildError(returnObj, 1, '请求超时');
                  // returnObj.result_code = 1;
                  // returnObj.result_message = '请求超时';
                  utils.returnMessage(res, transNo, returnObj, utils.STATUS_ERROR);
                }
              });
            }
          }
        }
      });
    }).catch(function(e) {
      logger.error(e);
      ctx.buildError(returnObj, 1, '服务异常');
      // returnObj.result_code = 1;
      // returnObj.result_message = '服务异常';
      utils.returnMessage(res, transNo, returnObj, utils.STATUS_ERROR);
    });
  }
};

module.exports = utils;