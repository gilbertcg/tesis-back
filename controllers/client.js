const mongoose = require('mongoose');
const pdf = require('pdf-parse');

const errorFormat = require('../functions/errorCode');
const langchainController = require('./langchain');

const Templates = mongoose.model('Templates');
const Files = mongoose.model('Files');

const processText = async (req, res) => {
  const empresa = {
    context:
      'Nombre de la empresa: Protos Tech, ubicacion de la empresa: Ciudad de panama, pagina web de la empresa: www.protostech.com',
  };
  try {
    const prompt = `Quiero que actues como un profesional en la comunicacion por
    correos electronicos,
    
    A continuacion te voy a dar el siguiente texto: 
    
    texto: ${req.body.text}
    
    El codigo anterior es un mensaje de correo electronico empresarial, cuyo contexto de la empresa es el siguiente.

    contexto empresa: ${empresa.context}

    usa este contexto de la empresa para completar campos que el texto original no tenga
    
    Ahora quiero que analices el mensaje escrito por el usuario y
    lo modifiques por un mensaje ${req.body.sentiment} y amigable.
    
    No quiero que agregues marcadores o placeholders al mensaje modificado,
    como por ejemplo [tu nombre], [Información de contacto adicional, si es necesario],
    [Nombre del destinatario], o cualquier campo que tenga que se llenado por 
    el usuario.
    
    Tampoco quiero que te refieras al destinatario como usuario o destinatario, 
    evita usar oraciones donde tengas que agregar eso.
    
    No alargues los parrafos nuevos a mas de 100 palabras por parrafo. 
    
    Si el texto que te pase es corto, no generes un texto que sea el triple de largo.
    
    De resultado quiero que devuelvas un texto plano del correo electronico que voy a enviar, evita escribir textos como previos al mensaje de correo, como "Claro, aquí tienes el mensaje modificado, o Claro, aquí tienes el mensaje".
    `;
    const response = await langchainController.chatGPT(prompt, 4);
    if (!response) {
      return res.status(400).json(errorFormat.set(400, 'Error in system'));
    }
    const daraParsed = JSON.parse(response.body);
    console.log(daraParsed);
    if (req.client._id) {
      for (const choise of daraParsed.choices) {
        const template = new Templates({
          original: req.body.text,
          procesed: choise.message.content,
          clientID: req.client._id,
        });
        template.save();
      }
    }
    return res.status(200).json({ choises: daraParsed.choices });
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
    return res.status(200).json({ translation: [0].message.content });
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
  await langchainController.savePDF(req.client._id, pdfPrcessed, metadata);
  const file = new Files({
    name: req.body.fileName,
    clientID: req.client._id,
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
