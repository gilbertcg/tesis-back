const speech = require('@google-cloud/speech');
process.env.GOOGLE_APPLICATION_CREDENTIALS = './google-keys.json';
async function transcribeAudio(buffer) {
  try {
    const speechClient = new speech.SpeechClient();
    const audioByte = buffer.toString('base64');
    const audio = {
      content: audioByte,
    };
    const config = {
      encoding: 'LINEAR16',
      // sampleRateHertz: 44100,
      languageCode: 'en-US',
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
