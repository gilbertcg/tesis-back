/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const secret = require('../config').secret; // eslint-disable-line

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
    username: {
      type: String,
      trim: true,
    },
    verification: {
      type: String,
    },
    phone: {
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
    carrito: [mongoose.Schema.Types.ObjectId],
    friends: [mongoose.Schema.Types.ObjectId],
    friendRequests: [mongoose.Schema.Types.ObjectId],
    favoritos: [mongoose.Schema.Types.ObjectId],
    // Esto es el password
    hash: String,
    salt: String,
    // ----------------
  },
  { timestamps: true },
);

ClientsSchema.methods.validPassword = function (password) {
  // eslint-disable-line
  const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
  return this.hash === hash;
};

ClientsSchema.methods.setPassword = function (password) {
  // eslint-disable-line
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

ClientsSchema.methods.generateJWT = function () {
  // eslint-disable-line
  return jwt.sign(
    {
      email: this.email,
      id: this._id,
    },
    secret,
  );
};

ClientsSchema.methods.toAuthJSON = function () {
  // eslint-disable-line
  return {
    _id: this._id,
    email: this.email,
    pic: this.pic,
    name: this.name,
    phone: this.phone,
    username: this.username,
    carrito: this.carrito,
    verified: this.verified,
    friendRequests: this.friendRequests,
    friends: this.friends,
    token: this.generateJWT(),
  };
};

mongoose.model('Clients', ClientsSchema);
