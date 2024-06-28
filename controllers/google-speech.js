const speech = require('@google-cloud/speech');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

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

const getAudioDuration = buffer => {
  return new Promise((resolve, reject) => {
    const tempFilePath = '/tmp/temp-audio-file';
    fs.promises
      .writeFile(tempFilePath, buffer)
      .then(() => {
        ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
          if (err) {
            reject(err);
          } else {
            resolve(metadata.format.duration);
          }
        });
      })
      .catch(err => reject(err));
  });
};

module.exports = {
  transcribeAudio,
  getAudioDuration,
};
