const speech = require('@google-cloud/speech');
const fs = require('fs');
process.env.GOOGLE_APPLICATION_CREDENTIALS = './google-keys.json';
async function transcribeAudio(audiofile) {
  try {
    const speechClient = new speech.SpeechClient();
    const file = fs.readFileSync(audiofile);
    const audioByte = file.toString('base64');
    const audio = {
      content: audioByte,
    };
    const config = {
      encoding: 'LINEAR16',
      // sampleRateHertz: 44100,
      languageCode: 'es-ES',
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
  transcribeAudio,
};
