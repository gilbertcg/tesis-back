const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const https = require('https');
const http = require('http');
const fs = require('fs');
require('dotenv').config();

const certs = {
  key: '',
  cert: '',
};

try {
  if (process.env.KEYPATH && process.env.CERTPATH) {
    certs.key = fs.readFileSync(process.env.KEYPATH, 'utf8');
    certs.cert = fs.readFileSync(process.env.CERTPATH, 'utf8');
  }
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

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

// Routes
app.use(require('./routes'));

// / catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res) => {
  res.status(err.status || 500);
  res.json({
    errors: {
      message: err.message,
      error: !isProduction ? err : {},
    },
  });
});

// starting the server
app.on('ready', () => {
  server.listen(process.env.PORT, () => {
    console.log(`Listening on port ${server.address().port}`);
  });
});

app.emit('ready');
