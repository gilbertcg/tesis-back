const openai = require('openai');
const fs = require('fs');

async function transcribeAudioByFile(audiofile) {
  try {
    console.log(process.env.OPENAI_API_KEY);
    const openaiClient = new openai.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcription = await openaiClient.audio.transcriptions.create({
      file: fs.createReadStream(audiofile),
      model: 'whisper-1',
    });
    return transcription;
  } catch (error) {
    console.log(error);
  }
}

module.exports = {
  transcribeAudioByFile,
};
