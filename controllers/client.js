const mongoose = require('mongoose');
const uuidd = require('uuid');
const pdf = require('pdf-parse');
const { Document } = require('langchain/document');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { PineconeStore } = require('langchain/vectorstores/pinecone');

const { pinecone } = require('../config/pinecone-client');
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;
const errorFormat = require('../functions/errorCode');
const langchainController = require('./langchain');

const Templates = mongoose.model('Templates');
const Files = mongoose.model('Files');

const processText = async (req, res) => {
  try {
    const index = pinecone.Index(PINECONE_INDEX_NAME);
    const vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings({}), {
      pineconeIndex: index,
      textKey: 'text',
      namespace: req.client._id,
    });
    let resolveWithDocuments;
    new Promise(resolve => {
      resolveWithDocuments = resolve;
    });
    const retriever = vectorStore.asRetriever({
      callbacks: [
        {
          handleRetrieverEnd: function (documents) {
            resolveWithDocuments(documents);
          },
        },
      ],
    });
    const chain = langchainController.makeChain(retriever);
    const response = await chain.invoke({
      text: req.body.text,
      sentiment: req.body.sentiment || 'formal',
    });
    console.log(response);
    if (!response) {
      return res.status(400).json(errorFormat.set(400, 'Error in system'));
    }
    if (req.client._id) {
      const template = new Templates({
        original: req.body.text,
        procesed: response,
        clientID: req.client._id,
      });
      template.save();
    }
    return res.status(200).json({ choises: [{ message: { content: response } }] });
  } catch (error) {
    console.log(error);
    return res.status(400).json(errorFormat.set(400, 'Error in system', error));
  }
};

const translateText = async (req, res) => {
  if (req.body.text.lenght > 3000) {
    return res.status(400).json(errorFormat.set(400, 'text to long', ''));
  }
  try {
    const prompt = `
    Quiero que actues como un profesional en la traduccion de idiomas,
   
    A continuacion te voy a dar el siguiente texto: 
    
    ${req.body.text}

    El codigo anterior es un mensaje de correo electronico.

    Queiero que traduzcas ese texto a ${req.body.lang}.

    No agregues texto de mas ni inventes nada nuevo, solo centrate en la
    traduccion del idioma. 

    De resultado quiero que devuelvas un texto plano del correo electronico traducido
    que voy a enviar. 

    `;
    const response = await langchainController.chatGPT(prompt, 1);
    if (!response) {
      return res.status(400).json(errorFormat.set(400, 'Error in system'));
    }
    const daraParsed = JSON.parse(response.body);
    if (req.client._id) {
      const template = new Templates({
        original: req.body.text,
        procesed: daraParsed.choices[0].message.content,
        clientID: req.client._id,
      });
      template.save();
    }
    return res.status(200).json({ translation: daraParsed.choices[0].message.content });
  } catch (error) {
    return res.status(400).json(errorFormat.set(400, 'Error in system', error));
  }
};

const getTemplates = async (req, res) => {
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
  const agg = Templates.aggregate(conf);
  agg.options = { collation: { locale: 'es', strength: 3 } };
  agg.exec(async (error, data) => {
    const total = await Templates.countDocuments({});
    if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
    Templates.countDocuments(filter, (_err, count) => res.json({ data, count, total }));
  });
};

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
  const file = new Files({
    name: req.body.fileName,
    clientID: req.client._id,
    pineconeID: uuidd.v4(),
  });

  const documentLangChain = new Document({
    pageContent: pdfPrcessed.text,
    metadata: {
      ...metadata,
      fileID: file.pineconeID,
      pdf_numpages: pdfPrcessed.numpages,
    },
  });

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const docs = await textSplitter.splitDocuments([documentLangChain]);
  const embeddings = new OpenAIEmbeddings();
  const index = pinecone.Index(PINECONE_INDEX_NAME);
  await PineconeStore.fromDocuments(docs, embeddings, {
    pineconeIndex: index,
    namespace: req.client._id,
    textKey: 'text',
  });
  await file.save();
  return res.status(200).json({ ok: true });
};

module.exports = {
  processText,
  getTemplates,
  translateText,
  setPdf,
  getFiles,
};
