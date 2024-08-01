const mongoose = require('mongoose');
const errorFormat = require('../functions/errorCode');
const googleSpeechController = require('../functions/whisper');
const Templates = mongoose.model('Templates');
const Files = mongoose.model('Files');

const chatGPT = require('../functions/chatgpt');

function saveChoises(client, original, daraParsed) {
  if (client._id) {
    for (const choise of daraParsed.choices) {
      const template = new Templates({
        original: original,
        procesed: choise.message.content,
        clientID: client._id,
      });
      template.save();
    }
  }
}

const processText = async (req, res) => {
  try {
    const prompt = await generatePrompt(req.body.text, req.client, req.body.sentiment);
    const response = await chatGPT.chatGPT(prompt, 4);
    if (!response) return res.status(400).json(errorFormat.set(400, 'Error in system'));
    const dataParsed = JSON.parse(response.body);
    saveChoises(req.client, req.body.text, dataParsed);
    return res.status(200).json({ choises: dataParsed.choices });
  } catch (error) {
    console.log(error);
    return res.status(400).json(errorFormat.set(400, 'Error in system', error));
  }
};

const translateText = async (req, res) => {
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
    const response = await chatGPT.chatGPT(prompt, 1);
    if (!response) {
      return res.status(400).json(errorFormat.set(400, 'Error in gpt'));
    }
    const dataParsed = JSON.parse(response.body);
    saveChoises(req.client, req.body.text, dataParsed);
    return res.status(200).json({ translation: dataParsed.choices[0].message.content });
  } catch (error) {
    console.log(error);
    return res.status(400).json(errorFormat.set(400, 'Error in system', error));
  }
};

async function generatePrompt(text, client, sentiment) {
  const file = await Files.findOne({ clientID: client._id }).sort({ createdAt: -1 }).limit(1);
  let mensaje = `Quiero que actues como un profesional en la comunicacion por
  correos electronicos,
  
  A continuacion te voy a dar el siguiente texto: 
  
  texto: ${text}
  
  Ahora quiero que analices el mensaje escrito por el usuario y
  lo modifiques por un mensaje ${sentiment} y amigable.
  
  No quiero que agregues marcadores o placeholders al mensaje modificado,
  como por ejemplo [tu nombre], [Información de contacto adicional, si es necesario],
  [Nombre del destinatario], o cualquier campo que tenga que se llenado por 
  el usuario.
  
  Tampoco quiero que te refieras al destinatario como usuario o destinatario, 
  evita usar oraciones donde tengas que agregar eso.
  
  No alargues los parrafos nuevos a mas de 100 palabras por parrafo. 
  
  Si el texto que te pase es corto, no generes un texto que sea el triple de largo.
  
  `;

  if (file) {
    mensaje =
      mensaje +
      `Aqui te explico como suelen iniciar los correos de la empresa: " ${file.startEmails} "
      Quiero que incies el correo de esa forma.
    `;
    mensaje =
      mensaje +
      `Aqui te explico como suelen finalizar los correos de la empresa: " ${file.endEmails} "
    Quiero que incies el correo de esa forma.`;
    mensaje =
      mensaje +
      `Si es necesiario completar con el nombre de la empresa, usa este nombre de empresa: ${file.nameEnterprise}`;
  }

  mensaje =
    mensaje +
    'De resultado quiero que devuelvas un texto plano del correo electronico que voy a enviar, evita escribir textos como previos al mensaje de correo, como "Claro, aquí tienes el mensaje modificado, o Claro, aquí tienes el mensaje".';
  return mensaje;
}

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

const processAudio = async (req, res) => {
  try {
    const transcription = await googleSpeechController.transcribeAudio(req.file);
    if (!transcription.text) return res.status(400).json(errorFormat.set(400, 'Error in transcription'));
    const prompt = await generatePrompt(transcription.text, req.client, req.body.sentiment);
    const response = await chatGPT.chatGPT(prompt, 4);
    if (!response) return res.status(400).json(errorFormat.set(400, 'Error in system'));
    const dataParsed = JSON.parse(response.body);
    saveChoises(req.client, req.body.text, dataParsed);
    return res.status(200).json({ choises: dataParsed.choices });
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).send('Error processing the audio file');
  }
};

module.exports = {
  processText,
  getTemplates,
  translateText,
  processAudio,
};
