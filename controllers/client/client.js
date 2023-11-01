const passport = require('passport');
const mongoose = require('mongoose');
const request = require('request');

const errorFormat = require('../../functions/errorCode');

const Clients = mongoose.model('Clients');

// Configura tu API key de OpenAI
const apiKey = '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';

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
    user.name = req.body.name;
    user.phone = req.body.phone;
    user.username = req.body.username;
    user.setPassword(req.body.password);
    user.verification = Math.random().toString(36).substring(7) + req.body.email;
    user.save((error, data) => {
      if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
      return res.json(data.toAuthJSON());
    });
  });
};

const update = (req, res) => {
  Clients.findOne({ _id: req.payload.id }).exec((error, user) => {
    if (error) return res.status(400).json(errorFormat.set(400, 'Error in system', error));
    if (typeof req.body.name !== 'undefined') {
      user.name = req.body.name;
    }
    if (typeof req.body.phone !== 'undefined') {
      user.phone = req.body.phone;
    }
    if (typeof req.body.username !== 'undefined') {
      user.username = req.body.username;
    }
    if (typeof req.body.pic !== 'undefined') {
      user.pic = req.body.pic;
    }

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
    Ahora quiero que actues como un profesional en la comunicacion por correos electronicos y Experto en HTML y CSS,
   
    A continuacion te voy a dar el siguiente codigo html: 
    
    ${req.body.text}

    El codigo anterior es un mensaje de correo electronico.

    Ahora quiero que analices el mensaje escrito por el usuario y lo modifiques por un mensaje mas profesional y amigable.
    
    Si existe pedazos de codigo de HTML que no contengan contenido relevante para el mensaje a enviar puedes ignorar eso.

    No quiero que agregues marcadores o placeholders al mensaje modificado, como por ejemplo [tu nombre], [Información de contacto adicional, si es necesario], [Nombre del destinatario], o cualquier campo que tenga que se llenado por el usuario.
    
    Tampoco quiero que te refieras al destinatario como usuario o destinatario, evita usar oraciones donde tengas que agregar eso.

    No alargues los parrafos nuevos a mas de 100 palabras por parrafo. 

    De resultado quiero que devuelvas el HTML como un texto plano del correo electronico que voy a enviar. 
    
    `;

    console.log(prompt, prompt.length);
    const response = await chatGPT(prompt);
    if (!response) {
      return res.status(400).json(errorFormat.set(400, 'Error in system'));
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
  login,
  getClient,
  update,
  register,
  processText,
};
