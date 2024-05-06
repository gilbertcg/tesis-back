const request = require('request');
const passport = require('passport');
const mongoose = require('mongoose');

const errorFormat = require('../../functions/errorCode');

// Configura tu API key de OpenAI
const apiKey = process.env.CHATGPT_KEY;

const Clients = mongoose.model('Clients');
const Templates = mongoose.model('Templates');

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
  if (req.body.text.lenght > 3000) {
    return res.status(400).json(errorFormat.set(400, 'text to long', ''));
  }
  try {
    const prompt = `
    Ahora quiero que actues como un profesional en la comunicacion por correos electronicos,
   
    A continuacion te voy a dar el siguiente texto: 
    
    ${req.body.text}

    El codigo anterior es un mensaje de correo electronico.

    Ahora quiero que analices el mensaje escrito por el usuario y lo modifiques por un mensaje mas profesional y amigable.

    No quiero que agregues marcadores o placeholders al mensaje modificado, como por ejemplo [tu nombre], [Información de contacto adicional, si es necesario], [Nombre del destinatario], o cualquier campo que tenga que se llenado por el usuario.
    
    Tampoco quiero que te refieras al destinatario como usuario o destinatario, evita usar oraciones donde tengas que agregar eso.

    No alargues los parrafos nuevos a mas de 100 palabras por parrafo. 

    Si el texto que te pase es corto, no generes un texto que sea el triple de largo.

    De resultado quiero que devuelvas un texto plano del correo electronico que voy a enviar. 
    
    `;
    const response = await chatGPT(prompt);
    if (!response) {
      return res.status(400).json(errorFormat.set(400, 'Error in system'));
    }
    if (req.body.email) {
      const template = new Templates({
        original: req.body.text,
        procesed: response,
        email: req.body.email,
      });
      template.save();
    }

    return res.status(200).json({ text: response });
  } catch (error) {
    return res.status(400).json(errorFormat.set(400, 'Error in system', error));
  }
};

const chatGPT = prompt =>
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

module.exports = {
  processText,
  login,
  getClient,
  register,
};
