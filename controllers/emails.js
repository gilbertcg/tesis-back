const mongoose = require('mongoose');
const moment = require('moment');

const errorFormat = require('../functions/errorCode');
const langchain = require('../functions/langchain');
const gmail = require('../functions/gmail');
const matchFormat = require('../functions/matchFormat');
const Emails = mongoose.model('Emails');
const Clients = mongoose.model('Clients');

const updateEmails = async (req, res) => {
  try {
    if (!req.client.imapPassword) {
      return res.status(401).send('Error obteniendo emails');
    }
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
    await gmail.saveEmails(emails, req.client._id);
    processEmails(req.client);
    return res.status(200).json({});
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).send('Error processing the audio file');
  }
};

async function processEmails(client) {
  Emails.find({ processed: false }).exec(async (error, emails) => {
    if (emails.length) {
      for (const email of emails) {
        const sentiment = await langchain.sentimentChain(email.body);
        const priorityEmail = `
        from: ${email.from}
        ---------------------
        subject: ${email.subject}
        ---------------------
        body: ${email.body}
        `;
        const priority = await langchain.priorityChain(priorityEmail, client.emails || []);
        email.sentiment = extraerNumero(sentiment);
        email.priority = extraerNumero(priority);
        email.processed = true;
        email.save();
        if (email.priority < 3 && client.sendAutoResponses) {
          autoResponseEmail(priorityEmail, client);
        }
      }
    }
  });
}

async function autoResponseEmail(text, client) {
  const instruction = await langchain.autoResponseChain(text);
  await langchain.emailAgentExecutor(instruction, client);
}

function extraerNumero(texto) {
  let resultado = texto.match(/\d+/);
  if (resultado) {
    return parseInt(resultado[0], 10);
  }
  return null;
}

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
    if (typeof req.query.query !== 'undefined') {
      filter = await matchFormat.set(req.query.query, [
        { value: 'subject', typeOr: matchFormat.TypesOr.regexp },
        { value: 'from', typeOr: matchFormat.TypesOr.regexp },
      ]);
    }
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

function updateAllClientsEmails() {
  const startDate = moment().format('MMM DD, YYYY');
  const endDate = moment().add(1, 'days').format('MMM DD, YYYY');
  const searchFilters = [
    ['SINCE', startDate],
    ['BEFORE', endDate],
  ];

  Clients.find({}).exec(async (error, clients) => {
    for (const client of clients) {
      if (client.imapPassword) {
        const emails = await gmail.getEmails(client.email, client.imapPassword, searchFilters);
        await gmail.saveEmails(emails, client._id);
        processEmails(client);
      }
    }
  });
}

module.exports = {
  resumeConversation,
  getEmails,
  updateEmails,
  updateAllClientsEmails,
};
