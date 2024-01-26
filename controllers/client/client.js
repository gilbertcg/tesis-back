const request = require('request');

const errorFormat = require('../../functions/errorCode');

// Configura tu API key de OpenAI
const apiKey = process.env.CHATGPT_KEY;

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
  processText,
};
