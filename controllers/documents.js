const mongoose = require('mongoose');
const pdf = require('pdf-parse');

const errorFormat = require('../functions/errorCode');
const langchain = require('../functions/langchain');
const { saveTextPinecone } = require('../config/pinecone-client');
const Files = mongoose.model('Files');

const getFiles = async (req, res) => {
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
  const agg = Files.aggregate(conf);
  agg.options = { collation: { locale: 'es', strength: 3 } };
  agg.exec(async (error, data) => {
    const total = await Files.countDocuments({});
    if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
    Files.countDocuments(filter, (_err, count) => res.json({ data, count, total }));
  });
};

const setPdf = async (req, res) => {
  const pdfPrcessed = await pdf(req.file.buffer);
  const metadata = { source: 'blob', blobType: req.file.mimetype };
  await saveTextPinecone(process.env.PINECONE_INDEX_NAME, req.client.id, pdfPrcessed.text, {
    ...metadata,
    pdf_numpages: pdfPrcessed.numpages,
  });
  const context = await pdfQuestions(req.client.id);
  const file = new Files({
    name: req.body.fileName,
    clientID: req.client._id,
    nameEnterprise: context.nameEnterprise,
    endEmails: context.endEmails,
    startEmails: context.startEmails,
  });
  await file.save();
  return res.status(200).json({ ok: true, file });
};

const pdfQuestions = async namespace => {
  const questions = [
    { question: 'Cual es el nombre de la empresa?', result: 'Nombre de la empresa: ' },
    {
      question: 'Cual es la manera promedio de empezar los corrreos de la empresa?',
      result: 'Manera de empezar los correos de la empresa: ',
    },
    {
      question: 'Cual es la manera promedio de terminar los corrreos de la empresa?',
      result: 'Manera de terminar los correos de la empresa: ',
    },
  ];
  const request = [];
  for (const question of questions) {
    request.push(langchain.questionProcess(question.question, namespace, process.env.PINECONE_INDEX_NAME));
  }
  const responses = await Promise.all(request);
  const file = {
    nameEnterprise: responses[0],
    startEmails: responses[1],
    endEmails: responses[2],
  };
  return file;
};

module.exports = {
  setPdf,
  getFiles,
};
