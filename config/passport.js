const passport = require('passport');
const mongoose = require('mongoose');
const LocalStrategy = require('passport-local').Strategy;

const Clients = mongoose.model('Clients');

passport.use(
  'user',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    (email, password, done) => {
      Clients.findOne({ email }).exec((err, user) => {
        if (err) {
          done(null, false, err);
        }
        if (!user || !user.validPassword(password)) {
          return done(null, false, { errors: { 'email or password': 'is invalid' } });
        }
        return done(null, user);
      });
    },
  ),
);
