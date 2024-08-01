const openai = require('openai');
const fs = require('fs');
const util = require('util');
const { promisify } = util;
const writeFileAsync = promisify(fs.writeFile);

async function transcribeAudio(file) {
  try {
    const filenameParts = file.originalname.split('.');
    const fileExtension = filenameParts[filenameParts.length - 1];
    const tempFileName = `audio-${Date.now()}.${fileExtension}`;
    console.log(tempFileName);
    await writeFileAsync(tempFileName, file.buffer);
    const openaiClient = new openai.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcription = await openaiClient.audio.transcriptions.create({
      file: fs.createReadStream(tempFileName),
      model: 'whisper-1',
    });
    return transcription;
  } catch (error) {
    console.log(error);
  }
}

module.exports = {
  transcribeAudio,
};
