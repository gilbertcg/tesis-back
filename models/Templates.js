/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');

const TemplatesSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      lowercase: true,
      index: true,
      trim: true,
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
