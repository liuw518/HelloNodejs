var express = require('express');
var jwt = require('jsonwebtoken');
var config = require('config');
var router = express.Router();

/**
 * 登录页面路由
 */
router.get('/', require('./routes/index'));

/**
 * 登录页面路由
 */
router.get('/login', function(req, res, next){
  res.redirect(config.auth.loginFailure);
});

/**
 * 用户登录动作
 */
router.post('/login', function(req, res, next){
  console.debug("开始登录...");
  var account = req.body.username;
  var pwd = req.body.password;
  //添加验证逻辑

  var token = jwt.sign({name: account}, config.auth.jwt.PRIVATE_KEY,{expiresIn:config.auth.jwt.timeout,issuer:config.auth.jwt.issuer});
  res.cookie('_t',token);
  res.redirect(config.auth.loginSuccess);
});


/**
 * 用户请求鉴权逻辑
 */
function authCheck(req, res, next) {
    //从请求中取出jwt判断是否有权访问
    var token = req.cookies._t;
    if(token){
      var decoded = jwt.verify(token, config.auth.jwt.PRIVATE_KEY, function(err, decoded){
        if(err){
          res.redirect(config.auth.loginFailure);
        }
        return next();
      });
    } else {
      res.redirect(config.auth.loginFailure);
    }
}

/**
 * 用户登出逻辑
 */
router.post('/logout', function (req, res) {
    res.clearCookie('_t');
    res.redirect(config.auth.loginFailure);
});

module.exports = {
    router: router,
    check: authCheck
};