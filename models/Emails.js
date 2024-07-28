/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');

const EmailsSchema = new mongoose.Schema(
  {
    clientID: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    gmailID: {
      type: String,
    },
    body: {
      type: String,
    },
    subject: {
      type: String,
    },
    from: {
      type: String,
    },
    gmailCreationDate: {
      type: Date,
    },
  },
  { timestamps: true },
);

mongoose.model('Emails', EmailsSchema);
