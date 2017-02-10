var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();

/**
 * 登录页面路由
 */
router.get('/', require('./routes/index'));

/**
 * 登录页面路由
 */
router.get('/login', function(req, res, next){
  res.redirect('/');
});

/**
 * 用户登录动作
 */
router.post('/login', function(req, res, next){
  console.debug("开始登录...");
  var username = req.body.username;
  var pass = req.body.password;
  //添加验证逻辑

  var token = jwt.sign({name: username}, 'PrivateKey',{expiresIn:500,issuer:'Neusoft',subject:'test'});
  res.cookie('_t',token);
  res.redirect('/users');
});


/**
 * 用户请求鉴权逻辑
 */
function authCheck(req, res, next) {
    //从请求中取出jwt判断是否有权访问
    var token = req.cookies._t;
    if(token){
      var decoded = jwt.verify(token, 'PrivateKey', function(err, decoded){
        if(err){
          res.redirect('/');
        }
        return next();
      });
    } else {
      res.redirect('/');
    }
}

/**
 * 用户登出逻辑
 */
router.post('/logout', function (req, res) {
    res.clearCookie('_t');
    res.redirect('/');
});

module.exports = {
    router: router,
    check: authCheck
};