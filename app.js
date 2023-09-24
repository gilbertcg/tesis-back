const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const serviceAccount = require('./config/serviceAccountKey.json');


const isProduction = process.env.NODE_ENV === 'production';

const app = express();
let server = null;
if (isProduction && certs.ket !== '' && certs.cert !== '') {
  server = https.createServer(certs, app);
} else {
  server = http.createServer(app);
}

// Middlewares
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(logger('dev'));

// Database
if (isProduction) {
  mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useCreateIndex: true,
    })
    .catch(err => console.error(err));
} else {
  mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useCreateIndex: true,
    })
    .then(() => console.log('db is connected'))
    .catch(err => console.error(err));
  // mongoose.set('debug', true);
}
mongoose.Promise = global.Promise;

require('./models/Clients');
require('./config/passport');

mongoose.connection.once('open', () => {
  app.emit('ready');
});


// Routes
app.use(require('./routes'));

// / catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (!isProduction) {
  app.use((err, req, res) => {
    // console.log(err.stack);

    res.status(err.status || 500);

    res.json({
      errors: {
        message: err.message,
        error: err,
      },
    });
  });
} else {
  // production error handler
  // no stacktraces leaked to user
  app.use((err, req, res) => {
    res.status(err.status || 500);
    res.json({
      errors: {
        message: err.message,
        error: {},
      },
    });
  });
}

// starting the server

app.on('ready', () => {
  server.listen(process.env.PORT || 3000, () => {
    console.log(`Listening on port ${server.address().port}`);
  });
});

