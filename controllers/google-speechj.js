// const speech = require('@google-cloud/speech');
const fs = require('fs');

// const client = new speech.SpeechClient({
//   keyFilename: 'path/to/your-google-cloud-credentials.json'
// });

const getTextAudio = path =>
  new Promise(resolve => {
    try {
      const filePath = path.join(__dirname, path);
      const audioBytes = fs.readFileSync(filePath).toString('base64');
      const audio = {
        content: audioBytes,
      };
      const config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'es-ES',
      };

      const request = {
        audio: audio,
        config: config,
      };
      // const [response] = await client.recognize(request);
      // const transcription = response.results
      //   .map(result => result.alternatives[0].transcript)
      //   .join('\n');
      console.log(request);
      return resolve({ text: 'Hola, como estas, nos vemos mas tarde?' });
    } catch (error) {
      console.log(error);
      return resolve(null);
    }
  });

module.exports = {
  getTextAudio,
};
