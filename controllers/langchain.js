const { ChatPromptTemplate, PromptTemplate } = require('langchain/prompts');
const { RunnableSequence } = require('langchain/schema/runnable');
const { StringOutputParser } = require('langchain/schema/output_parser');
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { Document } = require('langchain/document');
const { RecursiveCharacterTextSplitter, TokenTextSplitter } = require('langchain/text_splitter');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { PineconeStore } = require('langchain/vectorstores/pinecone');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');
const { GoogleCalendarCreateTool } = require('@langchain/community/tools/google_calendar');
const { loadSummarizationChain } = require('langchain/chains');
const { pinecone } = require('../config/pinecone-client');
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;
const request = require('request');

const CONDENSE_TEMPLATE_TEST = `Dada la siguiente pregunta de seguimiento, reformule la pregunta de seguimiento para que sea una pregunta independiente

Pregunta de seguimiento: {question}
pregunta independiente:`;

const QA_TEMPLATE_TEST = `Eres un investigador experto. Utilice las siguientes piezas de contexto para responder la pregunta al final.
Si no sabe la respuesta, simplemente diga que no la sabe. NO intente inventar una respuesta. 

<context>
  {context}
</context>


Pregunta: {question}
Respuesta útil: `;

const summaryTemplate = `
Eres un experto en resumir conversaciones de correo electronico.
Su objetivo es crear un resumen de una conversacion.
A continuación encontrará la conversacion:
--------
{text}
--------


El resultado total será un resumen de la conversacion.

RESUMEN:
`;

const summaryRefineTemplate = `
Eres un experto en resumir conversaciones de correo electronico.
Su objetivo es crear un resumen de una conversacion
Hemos proporcionado un resumen existente hasta cierto punto: {existing_answer}

A continuación  encontrará la conversacion:
--------
{text}
--------

Dado el nuevo contexto, perfeccione el resumen .
Si el contexto no es útil, devuelva el resumen.
El resultado total será un resumen de la conversacion.

RESUMEN:
`;

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
  const model = new ChatOpenAI({
    temperature: 0,
    modelName: 'gpt-3.5-turbo',
  });
  try {
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

const calendarChain = async message => {
  try {
    const model = new ChatOpenAI({
      temperature: 0,
      modelName: 'gpt-3.5-turbo',
    });
    const googleCalendarParams = {
      credentials: {
        clientEmail: process.env.GOOGLE_CALENDAR_CLIENT_EMAIL,
        privateKey: process.env.GOOGLE_CALENDAR_PRIVATE_KEY,
        calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
      },
      scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
      model,
    };
    const tools = [new GoogleCalendarCreateTool(googleCalendarParams)];
    const calendarAgent = await initializeAgentExecutorWithOptions(tools, model, {
      agentType: 'zero-shot-react-description',
      verbose: false,
    });
    const meetingInput = await calendarAgent.invoke({
      input: 'Create a meeting with Paola Carvallo at 4pm tomorrow, if you cannot create the meet return N/A',
    });
    console.log(meetingInput);
    if (meetingInput && meetingInput.output) {
      if (meetingInput.output === 'N/A') {
        return 'N/A';
      }
      const originalMessage = meetingInput.output;
      const meetingDescription = 'Reunion programada';
      const createMeetingInput = `Crear una reunión para: ${meetingDescription}. Enlace al mensaje original: ${originalMessage}`;
      const createMeetingResult = await calendarAgent.invoke({ input: createMeetingInput });
      if (createMeetingResult && createMeetingResult.output) {
        return createMeetingResult.output;
      } else {
        return message;
      }
    } else {
      return message;
    }
  } catch (error) {
    console.error('Error calendar conversation:', error);
    throw error;
  }
};

const questionProcess = async (question, namespace) => {
  try {
    const index = pinecone.Index(PINECONE_INDEX_NAME);
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

const savePDF = async (namespace, pdfPrcessed, metadata) => {
  const documentLangChain = new Document({
    pageContent: pdfPrcessed.text,
    metadata: {
      ...metadata,
      pdf_numpages: pdfPrcessed.numpages,
    },
  });

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const docs = await textSplitter.splitDocuments([documentLangChain]);
  const embeddings = new OpenAIEmbeddings();
  const index = pinecone.Index(PINECONE_INDEX_NAME);
  await PineconeStore.fromDocuments(docs, embeddings, {
    pineconeIndex: index,
    namespace: namespace,
    textKey: 'text',
  });

  const questions = [
    { question: 'Cual es el nombre de la empresa?', result: 'Nombre de la empresa: ' },
    { question: 'Cual es la ubicacion de la empresa?', result: 'Ubicacion de la empresa: ' },
    {
      question: 'Cual es la manera promedio de empezar los corrreos de la empresa?',
      result: 'Manera de empezar los correos de la empresa: ',
    },
    {
      question: 'Cual es la manera promedio de terminar los corrreos de la empresa?',
      result: 'Manera de terminar los correos de la empresa: ',
    },
    {
      question: 'Cual es la pagina web de la empresa?',
      result: 'Pagina web de la empresa: ',
    },
  ];

  const request = [];
  for (const question of questions) {
    request.push(questionProcess(question.question, namespace));
  }
  const responses = await Promise.all(request);
  let context = '';
  for (let index = 0; index < questions.length; index++) {
    context = context + questions[index].result + responses[index] + ', ';
  }
  return context;
};

const chatGPT = (prompt, numberOfChoises) =>
  new Promise(resolve => {
    try {
      request.post(
        {
          url: 'https://api.openai.com/v1/chat/completions',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.CHATGPT_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            n: numberOfChoises,
          }),
        },
        async (err, resp, body) => {
          if (err) {
            console.log('Error openAit ', err);
            return resolve(null);
          }

          return resolve({ body });
        },
      );
    } catch (error) {
      console.log(error);
      return resolve(null);
    }
  });

module.exports = {
  makeChain,
  chatGPT,
  questionProcess,
  savePDF,
  resumenChain,
  calendarChain,
};
