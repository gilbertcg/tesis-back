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
    type: {
      type: String,
    },
    url: {
      type: String,
    },
    processed: {
      type: Boolean,
    },
    sentiment: {
      type: Number,
    },
    priority: {
      type: Number,
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
