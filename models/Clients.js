/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const secret = require('../config').secret;

const ClientsSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      lowercase: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    verification: {
      type: String,
    },
    resetPassword: {
      type: String,
    },
    lastConnection: {
      type: Date,
    },
    pic: {
      type: String,
      trim: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    hash: String,
    salt: String,
  },
  { timestamps: true },
);

ClientsSchema.methods.validPassword = function (password) {
  const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
  return this.hash === hash;
};

ClientsSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

ClientsSchema.methods.generateJWT = function () {
  return jwt.sign(
    {
      email: this.email,
      id: this._id,
    },
    secret,
  );
};

ClientsSchema.methods.toAuthJSON = function () {
  return {
    _id: this._id,
    email: this.email,
    pic: this.pic,
    name: this.name,
    token: this.generateJWT(),
  };
};

mongoose.model('Clients', ClientsSchema);
