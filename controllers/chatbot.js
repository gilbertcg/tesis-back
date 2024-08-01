const langchain = require('../functions/langchain');

const chatbot = async (req, res) => {
  try {
    const response = await langchain.questionProcess(
      req.body.question,
      req.client._id,
      process.env.PINECONE_INDEX_NAME_EMAILS,
    );
    return res.json({ reply: response });
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).send('Error processing the audio file');
  }
};

module.exports = {
  chatbot,
};
