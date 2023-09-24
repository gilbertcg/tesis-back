const passport = require('passport');
const mongoose = require('mongoose');

const errorFormat = require('../../functions/errorCode');
const emails = require('../../functions/emails');

const Clients = mongoose.model('Clients');

const login = async (req, res) => {
  if (!req.body.email) return res.status(422).json(errorFormat.set(422, 'Fill you email'));
  if (!req.body.password) return res.status(422).json(errorFormat.set(422, 'Fill you password'));

  passport.authenticate('user', { session: false }, (err, client) => {
    if (err) return res.status(401).json(errorFormat.set(401, 'Invalid data', err));
    if (!client) return res.status(401).json(errorFormat.set(401, 'Invalid data'));
    return res.json(client.toAuthJSON());
  })(req, res);
};

const getClient = async (req, res) => {
  return res.json(req.client);
};

const register = (req, res) => {
  Clients.findOne({ email: req.body.email }).exec((error, exist) => {
    if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
    if (exist) return res.status(404).json(errorFormat.set(401, 'El correo esta en uso', error));
    const user = new Clients();
    user.email = req.body.email;
    user.name = req.body.name;
    user.phone = req.body.phone;
    user.username = req.body.username;
    user.setPassword(req.body.password);
    user.verification = Math.random().toString(36).substring(7) + req.body.email;
    user.save((error, data) => {
      if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
      const url = `${process.env.URL_WEB}/verification/${emails.encrypt(user.verification)}`;
      console.log(url);
      emails.SendEmail('verification', data.email, {
        url: url,
      });
      return res.json(data.toAuthJSON());
    });
  });
};

const verification = (req, res) => {
  Clients.findOne({ verification: emails.decrypt(req.params.id) }).exec((error, user) => {
    if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
    if (!user) return res.status(400).json(errorFormat.set(401, 'Invalid code'));
    user.verified = true;
    user.verification = null;
    user.save((error, data) => {
      if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
      return res.json(data.toAuthJSON());
    });
  });
};

const resendVerification = (req, res) => {
  Clients.findOne({ _id: req.payload.id }).exec((error, user) => {
    if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
    if (!user) return res.status(400).json(errorFormat.set(401, 'Invalid email'));
    user.verification = Math.random().toString(36).substring(7) + user.email;
    user.save((error, data) => {
      if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
      const url = `${process.env.URL_WEB}/verification/${emails.encrypt(user.verification)}`;
      console.log(url);
      emails.SendEmail('verification', data.email, {
        url: url,
      });
      return res.json({});
    });
  });
};

const forgotPassword = (req, res) => {
  Clients.findOne({ email: req.body.email }).exec((error, client) => {
    if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
    if (!client) return res.json({});
    client.resetPassword = Math.random().toString(36).substring(7) + req.body.email;
    client.save((error, data) => {
      if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
      const url = `${process.env.URL_WEB}/reset-password/${emails.encrypt(client.resetPassword)}`;
      console.log(url);
      emails.SendEmail('reset-password', data.email, {
        url: url,
      });
      return res.json({});
    });
  });
};

const resetPassword = (req, res) => {
  Clients.findOne({ resetPassword: emails.decrypt(req.body.key) }).exec((error, client) => {
    if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
    if (!client) return res.status(400).json(errorFormat.set(401, 'Invalid code'));
    client.setPassword(req.body.password);
    client.resetPassword = null;
    client.save(error => {
      if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
      return res.json({});
    });
  });
};

const update = (req, res) => {
  Clients.findOne({ _id: req.payload.id }).exec((error, user) => {
    if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
    if (typeof req.body.name !== 'undefined') {
      user.name = req.body.name;
    }
    if (typeof req.body.phone !== 'undefined') {
      user.phone = req.body.phone;
    }
    if (typeof req.body.username !== 'undefined') {
      user.username = req.body.username;
    }
    if (typeof req.body.pic !== 'undefined') {
      user.pic = req.body.pic;
    }

    user.save((error, data) => {
      if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
      return res.json(data.toAuthJSON());
    });
  });
};

module.exports = {
  login,
  getClient,
  update,
  register,
  verification,
  resendVerification,
  resetPassword,
  forgotPassword,
};
