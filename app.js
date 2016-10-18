'use strict';

/**
 * Main application file, starts the webserver and everything.
 */

// Requires a file by providing its absolute path from the project directory
global.requireLocal = module => require(__dirname + '/' + module);

//Load Logging
require('newrelic');

const co = require('co');
const config = require('./config/config');
const sticky = require('sticky-cluster');

global.IS_TEST = process.env.FRONTEND_RUN_TESTS === 'true';

const path = require('path');
const fs = require('fs');
const cfs = require('co-fs-extra');
const bunyan = require('bunyan');
const morgan = require('morgan');
const express = require('express');
const exphbs = require('express-handlebars');
const bodyparser = require('body-parser');
const _ = require('lodash');
const socketio = require('socket.io');

const server = callback => co(function*() {


  global.ROOT = path.resolve(__dirname);

  const app = express();

  // Register the static path here, to avoid getting them logged
  app.use(express.static(path.join(__dirname, 'public')));


  if (!IS_TEST) {
    global.logger = bunyan.createLogger(
      {
        name: 'breakout-frontend',
        streams: [
          {
            level: 'info',
            stream: fs.createWriteStream(ROOT + '/logs/info.log', {flags: 'a'})
          },
          {
            level: 'error',
            stream: fs.createWriteStream(ROOT + '/logs/error.log', {flags: 'a'})
          }
        ],
        serializers: bunyan.stdSerializers,
        src: process.env.NODE_ENVIRONMENT !== 'prod'
      }
    );

    app.use(morgan('combined',
      {stream: fs.createWriteStream(ROOT + '/logs/access.log', {flags: 'a'})}
    ));
  } else {
    global.logger = {
      info: () => {
      },

      error: () => {
      },

      warn: () => {
      }
    };
  }

  const mongoose = requireLocal('controller/mongo.js');
  const passport = requireLocal('services/auth.js');
  const API = requireLocal('services/api-proxy');
  const websocket = requireLocal('services/websocket');

  // All dirs containing templates
  const partialsDirs = [
    'views/partials',
    'views/templates'
  ];

  // Read all files from the template directories and flatten them into one array
  const readDirs =
    _.flatten(yield _.reduce(partialsDirs, (init, c) => _.concat(init, cfs.readdir(c)), []));

  // If there are any duplicates in the list, they are different in length
  const uniqueFiles = _.uniq(_.filter(readDirs, v => _.filter(readDirs, v1 => v1 === v).length > 1));
  if (uniqueFiles.length) {
    throw new Error('There are duplicate templates: ' + _.join(uniqueFiles));
  }

  // Handlebars setup
  const hbs = exphbs.create({
      helpers: requireLocal('services/helpers'),
      partialsDir: partialsDirs
    }
  );

  global.HBS = hbs;

  app.engine('handlebars', hbs.engine);
  app.set('view engine', 'handlebars');

  if (process.env.NODE_ENVIRONMENT === 'prod' && !config.jwt_secret) {
    throw new Error('No secret specified, please set one via jwt_secret');
  }

  if (process.env.NODE_ENVIRONMENT === 'prod' && process.env.SHOW_ERROR !== 'true') {
    app.enable('view cache');
  }

  const session = require('express-session');
  const MongoStore = require('connect-mongo')(session);

  app.use(session({
    secret: config.jwt_secret,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({mongooseConnection: mongoose.connection})
  }));

  // Initialize Passport and restore authentication state, if any, from the
  // session.
  app.use(passport.initialize());
  app.use(passport.session());

  app.use(bodyparser.urlencoded({
    extended: true
  }));
  app.use(bodyparser.json());
  app.use(require('cookie-parser')());
  app.use(require('connect-flash')());

  //Set language header correctly including fallback option.
  app.use(requireLocal('services/i18n').init);

  app.use((req, res, next)=> co(function*() {
    if (req.isAuthenticated()
      && req.user.expires_at
      && new Date() > new Date(req.user.expires_at)
    ) {
      const refr = yield API.refresh(req.user);
      req.login(yield passport.createSession(req.user.email, refr), (error) => {
        if (error) throw error;
        next();
      });
    } else {
      next();
    }
  }).catch(ex => {
    logger.error(ex.stack);
    req.logout();
    req.flash('error', 'Something went wrong while refreshing your token. You were logged out.');
    res.redirect('/');
  }));

  // Sets routes
  if (process.env.FRONTEND_MAINTENANCE) {
    app.use((req, res, next) => {
      res.render(`dynamic/register/maintenance`,
        {
          layout: 'funnel',
          language: req.language
        });
    });
  }

  app.use('/', requireLocal('routes/main'));
  app.use('/', requireLocal('routes/dynamic'));
  app.use('/', requireLocal('routes/static'));
  app.use('/team', requireLocal('routes/team'));
  app.use('/post', requireLocal('routes/posting'));
  app.use('/messages', requireLocal('routes/messages'));
  app.use('/settings', requireLocal('routes/settings'));
  app.use('/api', requireLocal('routes/api'));
  app.use('/admin', requireLocal('routes/admin'));

  var server = require('http').createServer(app);

  /*
  var server = app.listen(config.port || 3000, () => {
    var host = server.address().address;
    var port = server.address().port;

    if (callback && typeof callback === 'function') {
      callback(server);
    }

    logger.info('Server listening on port ' + port);
    console.log('Listening at http://%s:%s', host, port);
  });*/

  //Initate Websocket

  const io = socketio(server);
  websocket.init(io);

  //

  app.use((req, res) => {
    res.status(404);
    res.render('error', {
      code: 404,
      message: req.url + ' could not be found on this server'
    });
  });

  // Displays any errors
  app.use((err, req, res, next) => {
    logger.error(err);

    res.status(err.status || 500);

    if (process.env.NODE_ENVIRONMENT === 'dev' || process.env.SHOW_ERROR === 'true') {
      res.render('error', {
        code: err.status,
        message: err.message,
        error: err
      });
    } else {
      res.render('error', {
        code: err.status,
        message: 'Internal Server error'
      });
    }
  });
  callback(server);
}).catch(ex => {
  console.error(ex.stack);
  throw ex;
});

if (!IS_TEST) {
  sticky(server, {
    port: 3000
  });
}

module.exports = server;

