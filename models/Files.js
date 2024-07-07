/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');

const FilesSchema = new mongoose.Schema(
  {
    clientID: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    name: {
      type: String,
    },
    endEmails: {
      type: String,
    },
    startEmails: {
      type: String,
    },
    nameEnterprise: {
      type: String,
    },
  },
  { timestamps: true },
);

mongoose.model('Files', FilesSchema);
