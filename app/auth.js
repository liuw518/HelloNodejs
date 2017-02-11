var express = require('express');
var jwt = require('jsonwebtoken');
var config = require('config');
var router = express.Router();
var logger = require('logfactory').getLogger();
var Promise = require("bluebird");
var dbutil = require('dbHelper');

/**
 * 登录页面路由
 */
router.get('/', require('./routes/index'));

/**
 * 登录页面路由
 */
router.get('/login', function (req, res, next) {
    res.redirect(config.auth.loginFailure);
});

/**
 * 用户登录动作
 */
router.post('/login', function (req, res, next) {
    console.debug("开始登录...");
    var account = req.body.username;
    var pwd = req.body.password;
    //TODO : 修改用户验证逻辑
    Promise.using(dbutil.getConnection(), function (conn) {
        return conn.queryAsync('select * from user where account = ? and password = ?', [account, pwd])
            .then(function (results, fields) {
                if (results && results.length > 0) {
                    var user = results[0];
                    var token = jwt.sign({
                        name: user.name,
                        id: user.id,
                        account: user.account
                    }, config.auth.jwt.PRIVATE_KEY, {
                        expiresIn: config.auth.jwt.timeout,
                        issuer: config.auth.jwt.issuer
                    });
                    res.cookie('_t', token);
                    res.redirect(config.auth.loginSuccess);
                } else {
                    res.redirect(config.auth.loginFailure);
                }
            });
    });
});


/**
 * 用户请求鉴权逻辑
 */
function authCheck(req, res, next) {
    //从请求中取出jwt判断是否有权访问
    var token = req.cookies._t;
    if (token) {
        jwt.verify(token, config.auth.jwt.PRIVATE_KEY, function (err, info) {
            if (err || !info) {
                res.redirect(config.auth.loginFailure);
            }
            if(info.exp - (Date.now()/1000) <= 300){
                //如果token将于5分钟内过期，将更新token
                var token = jwt.sign({
                        name: info.name,
                        id: info.id,
                        account: info.account
                    }, config.auth.jwt.PRIVATE_KEY, {
                        expiresIn: config.auth.jwt.timeout,
                        issuer: config.auth.jwt.issuer
                    });
                    res.cookie('_t', token);
            }
            req.currentUser = {
                name: info.name,
                id: info.id,
                account: info.account
            };
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