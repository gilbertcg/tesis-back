const composio = require('../functions/composio');

const chatbot = async (req, res) => {
  try {
    const connection = await composio.setupUserConnectionIfNotExists(req.client.email);
    if (connection.url) {
      return res.status(200).json({ reply: 'Primero necesita autenticar', url: connection.url });
    }
    const response = await composio.agentTest({
      apps: ['gmail'],
      entityName: req.client.email,
      TASK: req.body.question,
      chatHistory: req.body.chatHistory,
    });
    return res.status(200).json({ reply: response });
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).send('Error processing the audio file');
  }
};

module.exports = {
  chatbot,
};
