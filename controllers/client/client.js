const request = require('request');
const passport = require('passport');
const mongoose = require('mongoose');
const uuidd = require('uuid');
const pdf = require('pdf-parse');
const { Document } = require('langchain/document');
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { PineconeStore } = require('langchain/vectorstores/pinecone');
const { ChatPromptTemplate } = require('langchain/prompts');
const { RunnableSequence } = require('langchain/schema/runnable');
const { StringOutputParser } = require('langchain/schema/output_parser');
const { pinecone } = require('../../config/pinecone-client');
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;
const PINECONE_NAME_SPACE = process.env.PINECONE_NAME_SPACE;
const errorFormat = require('../../functions/errorCode');

// Configura tu API key de OpenAI
const apiKey = process.env.CHATGPT_KEY;

const Clients = mongoose.model('Clients');
const Templates = mongoose.model('Templates');
const Files = mongoose.model('Files');

const login = async (req, res) => {
  if (!req.body.email) return res.status(422).json(errorFormat.set(422, 'Fill you email'));
  if (!req.body.password) return res.status(422).json(errorFormat.set(422, 'Fill you password'));
  passport.authenticate('user', { session: false }, (err, client) => {
    if (err) return res.status(401).json(errorFormat.set(401, 'Invalid data', err));
    if (!client) return res.status(401).json(errorFormat.set(401, 'Invalid data'));
    return res.json(client.toAuthJSON());
  })(req, res);
};

const getClient = async (req, res) => {
  return res.json(req.client);
};

const register = (req, res) => {
  Clients.findOne({ email: req.body.email }).exec((error, exist) => {
    if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
    if (exist) return res.status(404).json(errorFormat.set(401, 'El correo esta en uso', error));
    const user = new Clients();
    user.email = req.body.email;
    user.setPassword(req.body.password);
    user.save((error, data) => {
      if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
      return res.json(data.toAuthJSON());
    });
  });
};

const processText = async (req, res) => {
  try {
    const index = pinecone.Index(PINECONE_INDEX_NAME);
    const vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings({}), {
      pineconeIndex: index,
      textKey: 'text',
      namespace: PINECONE_NAME_SPACE,
    });

    let resolveWithDocuments;
    const documentPromise = new Promise(resolve => {
      resolveWithDocuments = resolve;
    });
    const retriever = vectorStore.asRetriever({
      callbacks: [
        {
          handleRetrieverEnd(documents) {
            resolveWithDocuments(documents);
          },
        },
      ],
    });
    const chain = makeChain(retriever);
    const sourceDocuments = await documentPromise;
    const response = await chain.invoke({
      text: req.body.text,
      sentiment: req.body.sentiment || 'formal',
    });
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
    console.log(sourceDocuments);

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
    const response = await chatGPT(prompt, 1);
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
  const pineconeDocument = await PineconeStore.fromDocuments(docs, embeddings, {
    pineconeIndex: index,
    namespace: PINECONE_NAME_SPACE,
    textKey: 'text',
  });
  console.log(pineconeDocument);
  await file.save();
  return res.status(200).json({ ok: true });
};

const getFilesPinecone = async (req, res) => {
  const index = pinecone.Index(PINECONE_INDEX_NAME);
  const document = await index.query({
    topK: 1,
    id: '10b0a2e4-1420-4bdc-86b5-68f203adf518',
  });
  console.log(document);
  return res.status(200).json({ ok: true });
};

const chatGPT = (prompt, numberOfChoises) =>
  new Promise(resolve => {
    try {
      request.post(
        {
          url: 'https://api.openai.com/v1/chat/completions',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            n: numberOfChoises,
          }),
        },
        async (err, resp, body) => {
          if (err) {
            console.log('Error openAit ', err);
            return resolve(null);
          }

          return resolve({ body });
        },
      );
    } catch (error) {
      console.log(error);
      return resolve(null);
    }
  });

const combineDocumentsFn = (docs, separator = '\n\n') => {
  const serializedDocs = docs.map(doc => doc.pageContent);
  return serializedDocs.join(separator);
};

const CONDENSE_TEMPLATE = `
Dado el siguiente texto de correcto electronico, reformule el texto para que sea un texto independiente.
texto de correo electronico: {text}
texto independiente:
`;
const QA_TEMPLATE = `Quiero que actues como un profesional en la comunicacion por
correos electronicos,

A continuacion te voy a dar el siguiente texto: 

texto: {text}

El codigo anterior es un mensaje de correo electronico.

Ahora quiero que analices el mensaje escrito por el usuario y
lo modifiques por un mensaje {sentiment} y amigable.

el siguiente contexto pertenece al manual de comunicacion de la empresa, uselo solo si es necesario

<context>
  {context}
</context>

No quiero que agregues marcadores o placeholders al mensaje modificado,
como por ejemplo [tu nombre], [Información de contacto adicional, si es necesario],
[Nombre del destinatario], o cualquier campo que tenga que se llenado por 
el usuario.

Tampoco quiero que te refieras al destinatario como usuario o destinatario, 
evita usar oraciones donde tengas que agregar eso.

No alargues los parrafos nuevos a mas de 100 palabras por parrafo. 

Si el texto que te pase es corto, no generes un texto que sea el triple de largo.

De resultado quiero que devuelvas un texto plano del correo electronico que voy a enviar.
`;

const makeChain = retriever => {
  const condenseQuestionPrompt = ChatPromptTemplate.fromTemplate(CONDENSE_TEMPLATE);
  const answerPrompt = ChatPromptTemplate.fromTemplate(QA_TEMPLATE);
  const model = new ChatOpenAI({
    temperature: 0,
    modelName: 'gpt-3.5-turbo',
  });
  const standaloneQuestionChain = RunnableSequence.from([condenseQuestionPrompt, model, new StringOutputParser()]);
  const retrievalChain = retriever.pipe(combineDocumentsFn);
  const answerChain = RunnableSequence.from([
    {
      context: RunnableSequence.from([input => input.text, retrievalChain]),
      text: input => input.text,
      sentiment: input => input.sentiment,
    },
    answerPrompt,
    model,
    new StringOutputParser(),
  ]);
  const conversationalRetrievalQAChain = RunnableSequence.from([
    {
      text: standaloneQuestionChain,
      chat_history: input => input.chat_history,
    },
    answerChain,
  ]);
  return conversationalRetrievalQAChain;
};

module.exports = {
  processText,
  login,
  getClient,
  register,
  getTemplates,
  translateText,
  setPdf,
  getFiles,
  getFilesPinecone,
};
