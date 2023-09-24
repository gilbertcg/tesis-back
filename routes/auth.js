/* eslint-disable consistent-return */
const jwt = require('express-jwt');
const secret = require('../config').secret; // eslint-disable-line
const decode = require('jwt-decode');
const mongoose = require('mongoose');

const Clients = mongoose.model('Clients');
const Admin = mongoose.model('Admin');
const Categorias = mongoose.model('Categorys');
const Logs = mongoose.model('Log');

function getTokenFromHeader(req) {
  if (
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Token') ||
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer')
  ) {
    return req.headers.authorization.split(' ')[1];
  }

  return null;
}

const loggingIn = {
  required: jwt({
    secret,
    userProperty: 'payload',
    credentialsRequired: false,
    getToken: getTokenFromHeader,
  }),
  optional: jwt({
    secret,
    userProperty: 'payload',
    credentialsRequired: false,
    getToken: getTokenFromHeader,
  }),
};

const client = async (req, res, next) => {
  const cliente = decode(getTokenFromHeader(req));
  const authClient = await Clients.findOne({ _id: cliente.id });
  authClient.lastConnection = new Date();
  await authClient.save();
  req.client = authClient.toAuthJSON();
  req.client.categorias = await Categorias.aggregate([
    { $match: { value: 0 } },
    {
      $lookup: {
        from: 'categorys',
        localField: 'category',
        foreignField: 'category',
        as: 'sub',
      },
    },
  ]);
  next();
};

const admin = async (req, res, next) => {
  const admins = decode(getTokenFromHeader(req));
  if (!admins) {
    return res.status(401).json({
      code: 401,
      message: 'unauthorized',
      redirect: '/login',
    });
  }
  req.admin = await Admin.findOne(
    { _id: admins.id },
    {
      _id: true,
      email: true,
      pic: true,
      super: true,
    },
  );
  if (!req.admin) {
    return res.status(401).json({
      code: 401,
      message: 'unauthorized',
      redirect: '/login',
    });
  }
  next();
};

const log = type => {
  return (req, res, next) => {
    const client = decode(getTokenFromHeader(req));
    if (client) {
      const log = new Logs();
      log.user_id = client.id;
      log.type = type;
      log.description = '';

      const optionsQuery = ['limit', 'page', 'sort', 'sortKey', 'lat', 'lng', 'distance', 'query', 'promo'];

      for (const iterator of optionsQuery) {
        if (req.query[iterator]) {
          log.description += `<b>${iterator}:</b> ${req.query[iterator]} <br>`;
        }
      }
      const optionsParams = ['id', 'page', 'section', 'list', 'item'];
      for (const iterator of optionsParams) {
        if (req.params[iterator]) {
          log.description += `<b>${iterator}:</b> ${req.params[iterator]} <br>`;
        }
      }
      if (process.env.NODE_ENV === 'production') {
        log.save();
      }
    }
    next();
  };
};

module.exports = {
  loggingIn,
  client,
  log,
  admin,
};
