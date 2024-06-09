/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');

const EnterpriseSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      index: true,
    },
    name: {
      type: String,
    },
  },
  { timestamps: true },
);

mongoose.model('Enterprise', EnterpriseSchema);
