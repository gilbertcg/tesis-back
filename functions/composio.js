const { ChatOpenAI } = require('@langchain/openai');
const { AgentExecutor, createOpenAIFunctionsAgent } = require('langchain/agents');
const { LangchainToolSet } = require('composio-core');
const { pull } = require('langchain/hub');

async function composioTest() {
  const composioToolset = new LangchainToolSet({
    apiKey: process.env.COMPOSIO_API_KEY,
  });
  const tools = await composioToolset.getActions({
    actions: ['googlecalendar_create_event', 'googlecalendar_list_events'],
  });

  const getCurrentDate = () => new Date().toISOString().split('T')[0];
  const getTimezone = () => new Date().toLocaleTimeString('en-us', { timeZoneName: 'short' }).split(' ')[2];

  const date = getCurrentDate();
  const timezone = getTimezone();

  const todo = `
1PM - 3PM -> Code solo
`;
  const llm = new ChatOpenAI({
    temperature: 0,
    modelName: 'gpt-3.5-turbo',
  });
  const prompt = await pull('hwchase17/openai-functions-agent');
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    prompt,
    verbose: false,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    verbose: false,
  });

  const result = await agentExecutor.invoke({
    input: `Book slots according to this todo list: ${todo}. 
            Label them with the work provided to be done in that time period. 
            Schedule it for today. Today's date is ${date} (it's in YYYY-MM-DD format) 
            and make the timezone be ${timezone}.`,
  });

  console.log(result.output);
}

module.exports = {
  composioTest,
};
