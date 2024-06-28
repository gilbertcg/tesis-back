const speech = require('@google-cloud/speech');
const fs = require('fs');
process.env.GOOGLE_APPLICATION_CREDENTIALS = './google-keys.json';

const config = {
  encoding: 'LINEAR16', // Cambia esto según el tipo de archivo si no es LINEAR16
  languageCode: 'es', // 'es-ES' para español especificando España
  enableAutomaticPunctuation: true,
  model: 'default', // Puedes especificar otro modelo si es necesario
};

async function transcribeAudioByFile(audiofile) {
  try {
    const speechClient = new speech.SpeechClient();
    const file = fs.readFileSync(audiofile);
    const audioByte = file.toString('base64');
    const audio = {
      content: audioByte,
    };

    return new Promise((resolve, reject) => {
      speechClient
        .recognize({ audio, config })
        .then(data => {
          resolve(data);
        })
        .catch(err => {
          reject(err);
        });
    });
  } catch (error) {
    console.log(error);
  }
}

async function transcribeAudioByBuffer(buffer) {
  try {
    const speechClient = new speech.SpeechClient();
    const audioByte = buffer.toString('base64');
    const audio = {
      content: audioByte,
    };
    return new Promise((resolve, reject) => {
      speechClient
        .recognize({ audio, config })
        .then(data => {
          resolve(data);
        })
        .catch(err => {
          reject(err);
        });
    });
  } catch (error) {
    console.log(error);
  }
}

module.exports = {
  transcribeAudioByFile,
  transcribeAudioByBuffer,
};
