var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var logger = require('logfactory').getLogger();
var Promise = require("bluebird");
var dbutil = require('tx-manager');

/* GET home page. */
router.get('/', function (req, res, next) {


Promise.using(dbutil.getConnection(), function(conn) {
    return conn.beginTransactionAsync()
      .then(function(){
        return conn.queryAsync('insert into node_user set id = 999')
      })
      .then(function (results) {
        logger.log('第一次查询结束');
        return {a:1,b:2};
      })
      .then(function (results) {
        logger.info('第二次请求前接到的参数：'+results);
        return conn.queryAsync('delete FROM node_user where id = 999');
      })
      .then(function (results) {
        // throw new Error();
        logger.log('第二次查询结束');
        return null;
      })
      .catch(function(err){
        // logger.error(err);
        throw err;
      })
      .finally(function () {
        console.log('业务逻辑执行完毕');
      });
});



  // var pool = mysql.createPool({
  //   host: 'localhost',
  //   user: 'root',
  //   password: '',
  //   database: 'test'
  // });

  // var selectCb = function (err, results, fields) {
  //   // throw err;
  //   var sss = '';
  //   if (results) {
  //     for (var i = 0; i < results.length; i++) {
  //       sss += results[i].id;
  //       sss += results[i].name;
  //       sss += results[i].age;
  //       logger.log("%d\t%s\t%s", results[i].id, results[i].name, results[i].age);
  //     }
  //   }

  //   res.send(sss);
  // };


  // pool.getConnection(function (err, connection) {
  //   // connected! (unless `err` is set)
  //   var newConn = Promise.promisifyAll(connection);
  //   var sss = '';
  //   newConn.queryAsync('SELECT * FROM node_user')
  //     .then(function (results, fields) {
  //       if (results) {
  //         for (var i = 0; i < results.length; i++) {
  //           sss += results[i].id;
  //           logger.log("%d\t%s\t%s", results[i].id, results[i].name, results[i].age);
  //         }
  //       }
  //       console.log('asdfasdfasdf');
  //       return newConn.queryAsync('SELECT * FROM node_user');
  //     })
  //     .then(function (results, fields) {
  //       if (results) {
  //         for (var i = 0; i < results.length; i++) {
  //           sss += results[i].name;
  //           logger.log("%d\t%s\t%s", results[i].id, results[i].name, results[i].age);
  //         }
  //       }
  //       console.log('asdfasdfasdf');
  //       // return newConn.queryAsync('SELECT * FROM node_user');
  //     })
  //     .finally(function () {
  //       res.send(sss);
  //       connection.release();
  //     });

  //   // connection.query(
  //   //   'SELECT * FROM node_user',
  //   //   selectCb
  //   // );

  // });



  res.send('liu.w');
});

router.get('/:id', function (req, res, next) {
  res.send('liu.w' + req.params['id']);
});

module.exports = router;