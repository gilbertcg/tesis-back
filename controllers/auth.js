const passport = require('passport');
const mongoose = require('mongoose');

const Clients = mongoose.model('Clients');
const errorFormat = require('../functions/errorCode');
const gmail = require('../functions/gmail');

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
    user.imapPassword = req.body.imap;
    user.setPassword(req.body.password);
    user.save((error, data) => {
      if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
      return res.json(data.toAuthJSON());
    });
  });
};

const update = (req, res) => {
  Clients.findOne({ _id: req.payload.id }).exec((error, user) => {
    if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
    if (typeof req.body.name !== 'undefined') {
      user.name = req.body.name;
    }
    if (typeof req.body.autoResponses !== 'undefined') {
      user.sendAutoResponses = req.body.autoResponses;
    }
    if (typeof req.body.emails !== 'undefined') {
      user.emails = req.body.emails;
    }
    if (typeof req.body.imap !== 'undefined') {
      user.imapPassword = req.body.imap;
    }
    user.save((error, data) => {
      if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
      return res.json(data.toAuthJSON());
    });
  });
};

const forgotPassword = async (req, res) => {
  const adminEmail = await Clients.findOne({ email: 'gilbertcg99@gmail.com' });
  console.log(adminEmail);
  // if (!adminEmail || !adminEmail.imapPassword) {
  //   return res.status(400).json(errorFormat.set(400, 'Error in system admin', {}));
  // }
  Clients.findOne({ email: req.body.email }).exec((error, client) => {
    if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
    if (!client) return res.json({});
    client.resetPassword = Math.random().toString(36).substring(7);
    console.log(client.resetPassword);
    gmail.sendEmail(
      client.email,
      'Codigo de contrasena',
      `Su codigo es ${client.resetPassword}`,
      adminEmail.email,
      adminEmail.imapPassword,
    );
    client.save(error => {
      if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
      return res.json({});
    });
  });
};

const resetPassword = (req, res) => {
  Clients.findOne({ resetPassword: req.body.code, email: req.body.email }).exec((error, client) => {
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

module.exports = {
  login,
  getClient,
  register,
  update,
  forgotPassword,
  resetPassword,
};
