/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');

const TemplatesSchema = new mongoose.Schema(
  {
    clientID: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    original: {
      type: String,
    },
    procesed: {
      type: String,
    },
  },
  { timestamps: true },
);

mongoose.model('Templates', TemplatesSchema);
