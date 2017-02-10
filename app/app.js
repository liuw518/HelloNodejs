var express = require('express');
var path = require('path');
// var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
var _ = require('lodash');

var routersLoader = require('routers-loader');
var logFactory = require('logfactory');
var logger = logFactory.getLogger();

var app = express();

process.on('uncaughtException', function (err) {
  logger.error(err);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logFactory.log4js.connectLogger(logger, {level: 'auto'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(path.dirname(__dirname), 'public')));


app.get('/', require('./routes/index'));
app.get('/login', function(req, res, next){
  res.redirect('/');
});

//下面这个是用户登录的逻辑
app.post('/login', function(req, res, next){
  console.debug("开始登录...");
  var username = req.body.username;
  var pass = req.body.password;
  //添加验证逻辑

  var token = jwt.sign({name: username}, 'PrivateKey',{expiresIn:500,issuer:'Neusoft',subject:'test'});
  res.cookie('_t',token);
  res.redirect('/users');
});


//此方法为用户请求验证的逻辑
function authInterceptor(req, res, next) {
    //从请求中取出jwt判断是否有权访问
    var token = req.cookies._t;
    if(token){
      var decoded = jwt.verify(token, 'PrivateKey', function(err, decoded){
        if(err){
          res.redirect('/');
          return;
        }
        return next();
      });
    } else {
      res.redirect('/');
    }
}

//dynamic load routers
routersLoader('./app/routes', app, authInterceptor);

//用户登出的逻辑
app.post('/logout', function (req, res) {
    res.clearCookie('_t');
    res.redirect('/');
    return;
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  // var err = new Error('Not Found');
  // err.status = 404;
  res.status(404);
  res.send('找不到指定页面');
  // next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  logger.error(err);
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;