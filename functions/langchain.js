const { ChatOpenAI } = require('@langchain/openai');
const { createOpenAIFunctionsAgent, AgentExecutor } = require('langchain/agents');
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { ChatPromptTemplate, PromptTemplate } = require('@langchain/core/prompts');
const { TokenTextSplitter } = require('langchain/text_splitter');
const { PineconeStore } = require('@langchain/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { pinecone } = require('../config/pinecone-client');
const { RunnableSequence } = require('@langchain/core/runnables');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { loadSummarizationChain } = require('langchain/chains');
const { z } = require('zod');
const gmail = require('./gmail');

const {
  CONDENSE_TEMPLATE_TEST,
  QA_TEMPLATE_TEST,
  summaryTemplate,
  summaryRefineTemplate,
  sentimentTemplate,
  priorityTemplate,
  autoResponseTemplate,
} = require('./promps-templates');

const combineDocumentsFn = (docs, separator = '\n\n') => {
  const serializedDocs = docs.map(doc => doc.pageContent);
  return serializedDocs.join(separator);
};

const makeChain = retriever => {
  const condenseQuestionPrompt = ChatPromptTemplate.fromTemplate(CONDENSE_TEMPLATE_TEST);
  const answerPrompt = ChatPromptTemplate.fromTemplate(QA_TEMPLATE_TEST);
  const model = new ChatOpenAI({
    temperature: 0,
    modelName: 'gpt-3.5-turbo',
  });
  const standaloneQuestionChain = RunnableSequence.from([condenseQuestionPrompt, model, new StringOutputParser()]);
  const retrievalChain = retriever.pipe(combineDocumentsFn);
  const answerChain = RunnableSequence.from([
    {
      context: RunnableSequence.from([input => input.question, retrievalChain]),
      question: input => input.question,
    },
    answerPrompt,
    model,
    new StringOutputParser(),
  ]);
  const conversationalRetrievalQAChain = RunnableSequence.from([
    {
      question: standaloneQuestionChain,
    },
    answerChain,
  ]);
  return conversationalRetrievalQAChain;
};

const resumenChain = async conversation => {
  try {
    const model = new ChatOpenAI({
      temperature: 0,
      modelName: 'gpt-3.5-turbo',
    });
    const splitter = new TokenTextSplitter({
      chunkSize: 10000,
      chunkOverlap: 250,
    });
    const docsSummary = await splitter.splitDocuments([{ pageContent: conversation, metadata: { loc: null } }]);
    const SUMMARY_PROMPT = PromptTemplate.fromTemplate(summaryTemplate);
    const SUMMARY_REFINE_PROMPT = PromptTemplate.fromTemplate(summaryRefineTemplate);
    const summarizeChain = loadSummarizationChain(model, {
      type: 'refine',
      verbose: false,
      questionPrompt: SUMMARY_PROMPT,
      refinePrompt: SUMMARY_REFINE_PROMPT,
    });
    const inputs = {
      input_documents: docsSummary.map(doc => ({ pageContent: doc.pageContent })),
    };
    const summaries = await summarizeChain.call(inputs);
    return summaries.output_text;
  } catch (error) {
    console.error('Error summarizing conversation:', error);
    throw error;
  }
};

const sentimentChain = async conversation => {
  try {
    const model = new ChatOpenAI({
      temperature: 0,
      modelName: 'gpt-3.5-turbo',
    });
    const splitter = new TokenTextSplitter({
      chunkSize: 10000,
      chunkOverlap: 250,
    });
    const docsSummary = await splitter.splitDocuments([{ pageContent: conversation, metadata: { loc: null } }]);
    const SUMMARY_PROMPT = PromptTemplate.fromTemplate(sentimentTemplate);
    const summarizeChain = loadSummarizationChain(model, {
      type: 'refine',
      verbose: false,
      questionPrompt: SUMMARY_PROMPT,
    });
    const inputs = {
      input_documents: docsSummary.map(doc => ({ pageContent: doc.pageContent })),
    };
    const summaries = await summarizeChain.call(inputs);
    return summaries.output_text;
  } catch (error) {
    console.error('Error summarizing conversation:', error);
    throw error;
  }
};

const priorityChain = async (conversation, emails) => {
  try {
    const model = new ChatOpenAI({
      temperature: 0,
      modelName: 'gpt-3.5-turbo',
    });
    const splitter = new TokenTextSplitter({
      chunkSize: 10000,
      chunkOverlap: 250,
    });
    const docsSummary = await splitter.splitDocuments([{ pageContent: conversation, metadata: { loc: null } }]);
    const SUMMARY_PROMPT = PromptTemplate.fromTemplate(priorityTemplate);
    const summarizeChain = loadSummarizationChain(model, {
      type: 'refine',
      verbose: false,
      questionPrompt: SUMMARY_PROMPT,
    });
    const inputs = {
      input_documents: docsSummary.map(doc => ({ pageContent: doc.pageContent })),
      emails_list: emails.join(', '),
    };
    const summaries = await summarizeChain.call(inputs);
    return summaries.output_text;
  } catch (error) {
    console.error('Error summarizing conversation:', error);
    throw error;
  }
};

const autoResponseChain = async conversation => {
  try {
    const model = new ChatOpenAI({
      temperature: 0,
      modelName: 'gpt-3.5-turbo',
    });
    const splitter = new TokenTextSplitter({
      chunkSize: 10000,
      chunkOverlap: 250,
    });
    const docsSummary = await splitter.splitDocuments([{ pageContent: conversation, metadata: { loc: null } }]);
    const SUMMARY_PROMPT = PromptTemplate.fromTemplate(autoResponseTemplate);
    const summarizeChain = loadSummarizationChain(model, {
      type: 'refine',
      verbose: false,
      questionPrompt: SUMMARY_PROMPT,
    });
    const inputs = {
      input_documents: docsSummary.map(doc => ({ pageContent: doc.pageContent })),
    };
    const summaries = await summarizeChain.call(inputs);
    return summaries.output_text;
  } catch (error) {
    console.error('Error summarizing conversation:', error);
    throw error;
  }
};

const questionProcess = async (question, namespace, pinecone_index) => {
  try {
    const index = pinecone.Index(pinecone_index);
    const vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings({}), {
      pineconeIndex: index,
      textKey: 'text',
      namespace: namespace,
    });
    let resolveWithDocuments;
    new Promise(resolve => {
      resolveWithDocuments = resolve;
    });
    const retriever = vectorStore.asRetriever({
      callbacks: [
        {
          handleRetrieverEnd: function (documents) {
            resolveWithDocuments(documents);
          },
        },
      ],
    });
    const chain = makeChain(retriever);
    const sanitizedQuestion = question.trim().replaceAll('\n', ' ');
    const response = await chain.invoke({
      question: sanitizedQuestion,
    });
    return response;
  } catch (error) {
    console.log(error);
  }
};

async function customEmailAgent(client) {
  const llm = new ChatOpenAI({
    model: 'gpt-3.5-turbo',
    temperature: 0,
  });

  const tools = [
    new DynamicStructuredTool({
      name: 'email-sender',
      description: 'Envia correos electronicos dada una direccion de correo y mensaje de correo',
      schema: z.object({
        to: z.string().describe('La direccion de correo electronico a enviar'),
        body: z.string().describe('el contenido del correo electronico a enviar'),
        subject: z.string().describe('el subject del correo electronico a enviar'),
      }),
      func: async ({ to, body, subject }) => {
        const newEmail = await gmail.sendEmail(to, subject, body, client.email, client.imapPassword);
        return newEmail;
      },
    }),
  ];

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful assistant'],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

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

  return agentExecutor;
}

async function emailAgentExecutor(input, client) {
  const agentExecutor = await customEmailAgent(client);
  const result = await agentExecutor.invoke({
    input: input,
    verbose: false,
  });
  return result.output;
}

module.exports = {
  makeChain,
  sentimentChain,
  questionProcess,
  resumenChain,
  customEmailAgent,
  emailAgentExecutor,
  priorityChain,
  autoResponseChain,
};
