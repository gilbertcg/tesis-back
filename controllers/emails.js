const mongoose = require('mongoose');
const moment = require('moment');

const errorFormat = require('../functions/errorCode');
const langchain = require('../functions/langchain');
const gmail = require('../functions/gmail');
const Emails = mongoose.model('Emails');

const updateEmails = async (req, res) => {
  try {
    let searchFilters;
    if (req.body.startDate && req.body.endDate) {
      const startDate = moment(req.body.startDate).format('MMM DD, YYYY');
      const endDate = moment(req.body.endDate).format('MMM DD, YYYY');
      searchFilters = [
        ['SINCE', startDate],
        ['BEFORE', endDate],
      ];
    } else {
      const startDate = moment().subtract(1, 'months').format('MMM DD, YYYY');
      const endDate = moment().add(1, 'days').format('MMM DD, YYYY');
      searchFilters = [
        ['SINCE', startDate],
        ['BEFORE', endDate],
      ];
    }
    const emails = await gmail.getEmails(req.client.email, req.client.imapPassword, searchFilters);
    if (!emails) {
      return res.status(401).send('Error obteniendo emails');
    }
    gmail.saveEmails(emails, req.client._id);
    return res.status(200).json({});
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).send('Error processing the audio file');
  }
};

const getEmails = async (req, res) => {
  try {
    let page = 1;
    let limit = 10;
    let filter = {
      clientID: new mongoose.Types.ObjectId(req.client._id),
    };

    const sort = {};
    if (typeof req.query.page !== 'undefined') page = Number(req.query.page);
    if (typeof req.query.limit !== 'undefined') limit = Number(req.query.limit);
    const conf = [{ $match: filter }];
    sort[req.query.sortKey] = req.query.sort === 'desc' ? -1 : 1;
    conf.push({ $sort: sort });
    conf.push({ $skip: limit * page - limit }, { $limit: limit });
    const agg = Emails.aggregate(conf);
    agg.options = { collation: { locale: 'es', strength: 3 } };
    agg.exec(async (error, data) => {
      const total = await Emails.countDocuments({});
      if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
      Emails.countDocuments(filter, (_err, count) => res.json({ data, count, total }));
    });
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).send('Error processing the audio file');
  }
};

const resumeConversation = async (req, res) => {
  const resumen = await langchain.resumenChain(req.body.text);
  return res.status(200).json({ ok: true, resumen });
};

module.exports = {
  resumeConversation,
  getEmails,
  updateEmails,
};
