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
  try {
    const prompt = `Hola, a continuacion te voy a dar el siguiente texto: 
    
    ${req.body.text}

    El texto anterior es mensaje de correo electronico que se quiere enviar, pero quiero que lo veas y le des un aspecto mas profesional y amigable a ese texto, 

    tambien quiero que le des una estructura html amigable con css inline, ya que es un correo electronico en caso de ser necesario,

    De resultado quiero que solamente me respondas el texto plano del correo electronico que voy a enviar, no quiero que digas mas nada.
    
    `;
    const response = await chatGPT(prompt);
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
