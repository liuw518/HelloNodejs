if (global._) {
  throw new Error('global中已经存在名为_的属性，无法将lodash注册到global._中');
} else {
  global._ = require('lodash');
}
var http = require('http');
var spdy = require('spdy');
var fs = require('fs');
var express = require('express');
var path = require('path');
// var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var config = require('config');
var auth = require('auth');
var routersLoader = require('routers-loader');
var logFactory = require('log-factory');
var logger = logFactory.getLogger();

var app = express();

process.on('uncaughtException', function(err) {
  logger.error(err);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logFactory.log4js.connectLogger(logger, {
  level: 'auto'
}));
app.use(bodyParser.text());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(path.dirname(__dirname), 'public')));

//access control
// app.use('/', auth.router);

//dynamic load routers
routersLoader('./app/routes', app, auth.check);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  // var err = new Error('Not Found');
  // err.status = 404;
  res.status(404);
  res.send('找不到指定页面');
  // next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  logger.error(err);
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

var port = normalizePort(process.env.PORT || config.port);

function normalizePort(val) {
  var port = parseInt(val, 10);
  if (isNaN(port)) {
    // named pipe
    return val;
  }
  if (port >= 0) {
    // port number
    return port;
  }
  return false;
}
app.set('port', port);

var server = null;
if (config.SSL) {
  var options = {
    cert: fs.readFileSync(config.SSL.cert),
    key: fs.readFileSync(config.SSL.key)
  };
  server = spdy.createServer(options, app);
} else {
  server = http.createServer(app);
}
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ?
    'Pipe ' + port :
    'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string' ?
    'pipe ' + addr :
    'port ' + addr.port;
  if (config.SSL) {
    logger.info('HTTPS listening on ' + bind);
  } else {
    logger.info('HTTP listening on ' + bind);
  }
}