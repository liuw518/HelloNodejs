var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var _ = require('lodash');

var logFactory = require('logfactory');
var logger = logFactory.getLogger();

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logFactory.log4js.connectLogger(logger, {level: 'auto'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var router_root_path = './routes';

//dynamic load routers
var file_separator = '/';
var index_file = 'index.js';
(function (path) {
  var stat = fs.lstatSync(path);
  if (stat.isFile()) {
    if (_.endsWith(path, index_file)) {
      app.use(path.substr(router_root_path.length, path.length - router_root_path.length - index_file.length), require(path));
    } else {
      app.use(path.substr(router_root_path.length, path.length - router_root_path.length - 3), require(path));
    }
  } else if (stat.isDirectory()) {
    var files = fs.readdirSync(path);
    var self = arguments.callee;
    _.forEach(files, function(file){
      self(path + file_separator + file);
    });
  } else {
    var err = new Error(path + '不是文件或者目录！');
    throw err;
  }
})(router_root_path);

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