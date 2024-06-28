const speech = require('@google-cloud/speech');
const fs = require('fs');
process.env.GOOGLE_APPLICATION_CREDENTIALS = './google-keys.json';

const config = {
  encoding: 'MP3',
  languageCode: 'es',
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
