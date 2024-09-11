const { ChatOpenAI } = require('@langchain/openai');
const { AgentExecutor, createToolCallingAgent } = require('langchain/agents');
const { LangchainToolSet, OpenAIToolSet } = require('composio-core');
const { ChatPromptTemplate } = require('@langchain/core/prompts');

async function agentTest(inputs) {
  const toolset = new LangchainToolSet({ apiKey: process.env.COMPOSIO_API_KEY });
  // const entity = await toolset.client.getEntity(inputs.entityName);
  const llm = new ChatOpenAI({
    temperature: 0,
    modelName: 'gpt-4o',
  });

  // const apps = inputs.apps;
  const composio_tools = await toolset.getActions({
    actions: [
      'GMAIL_SEND_EMAIL',
      'GMAIL_CREATE_EMAIL_DRAFT',
      'GMAIL_LIST_LABELS',
      'GMAIL_REPLY_TO_THREAD',
      'GMAIL_FETCH_EMAILS',
      'GMAIL_LIST_THREADS',
      'GMAIL_GET_ATTACHMENT',
      'GMAIL_ADD_LABEL_TO_EMAIL',
      'GMAIL_NEW_GMAIL_MESSAGE',
      'GMAIL_FETCH_MESSAGE_BY_THREAD_ID',
    ],
  });

  const agent = await createToolCallingAgent({
    llm,
    verbose: false,
    tools: composio_tools,
    prompt: ChatPromptTemplate.fromMessages([
      [
        'system',
        `Eres un asistente experimentado que sabe mucho sobre las siguientes aplicaciones.: GMAIL.
Podrás realizar cualquier tarea solicitada por el usuario a través de todas las herramientas a las que tienes acceso. Su objetivo es completar la tarea del usuario utilizando las herramientas a las que tiene acceso.
          `,
      ],
      ['placeholder', '{chat_history}'],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]),
  });
  const executor = new AgentExecutor({ agent: agent, tools: composio_tools, verbose: false });
  const result = await executor.invoke({
    input: `Users wants to do ${inputs.TASK}`,
    chat_history: JSON.stringify(inputs.chatHistory),
  });
  return result.output;
}

async function setupUserConnectionIfNotExists(entityId) {
  const toolset = new OpenAIToolSet({
    apiKey: process.env.COMPOSIO_API_KEY,
  });
  const entity = await toolset.client.getEntity(entityId);
  const connection = await entity.getConnection('gmail');

  if (!connection) {
    const connection = await entity.initiateConnection('gmail');
    return { connection: connection.waitUntilActive(60), url: connection.redirectUrl };
  }

  return connection;
}

module.exports = {
  agentTest,
  setupUserConnectionIfNotExists,
};
