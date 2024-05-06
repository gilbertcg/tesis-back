/* eslint-disable consistent-return */
const jwt = require('express-jwt');
const secret = require('../config').secret; // eslint-disable-line
const decode = require('jwt-decode');
const mongoose = require('mongoose');

const Clients = mongoose.model('Clients');

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
  next();
};

module.exports = {
  loggingIn,
  client,
};
