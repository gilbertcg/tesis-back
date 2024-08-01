const { ChatOpenAI } = require('@langchain/openai');
// const { initializeAgentExecutorWithOptions, AgentExecutor, createOpenAIFunctionsAgent } = require('langchain/agents');
// const { DynamicTool } = require('@langchain/core/tools');
const { ChatPromptTemplate, PromptTemplate } = require('@langchain/core/prompts');
const { TokenTextSplitter } = require('langchain/text_splitter');
const { PineconeStore } = require('@langchain/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { pinecone } = require('../config/pinecone-client');
const { RunnableSequence } = require('@langchain/core/runnables');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { loadSummarizationChain } = require('langchain/chains');

const {
  CONDENSE_TEMPLATE_TEST,
  QA_TEMPLATE_TEST,
  summaryTemplate,
  summaryRefineTemplate,
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

async function customTools() {}

module.exports = {
  makeChain,
  questionProcess,
  resumenChain,
  customTools,
};
