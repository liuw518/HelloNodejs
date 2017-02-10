var express = require('express');
var router = express.Router();
var logger = require('logfactory').getLogger();
var Promise = require("bluebird");
var dbutil = require('dbHelper');

/* GET home page. */
router.get('/', function (req, res, next) {
  Promise.using(dbutil.getConnection(), function (conn) {
    return conn.beginTransactionAsync()
      .then(function () {
        return conn.queryAsync('insert into node_user set id = 999')
      })
      .then(function (results) {
        logger.info('第一次查询结束');
        return {a: 1, b: 2};
      })
      .then(function (results) {
        logger.info('第二次请求前接到的参数：' + JSON.stringify(results));
        return conn.queryAsync('delete FROM node_user where id = 999');
      })
      .then(function (results) {
        // throw new Error();
        logger.info('第二次查询结束');
        return null;
      })
      .catch(function (err) {
        // logger.error(err);
        throw err;
      })
      .finally(function () {
        logger.info('业务逻辑执行完毕');
      });
  });
  res.send('liu.w');
});

router.get('/:id', function (req, res, next) {
  res.send('liu.w' + req.params['id']);
});

module.exports = router;