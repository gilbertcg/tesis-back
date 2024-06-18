const { ChatPromptTemplate } = require('langchain/prompts');
const { RunnableSequence } = require('langchain/schema/runnable');
const { StringOutputParser } = require('langchain/schema/output_parser');
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { Document } = require('langchain/document');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { PineconeStore } = require('langchain/vectorstores/pinecone');
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
    {
      question: 'Cual es el acento del idioma de escritura segun el pais de la empresa?',
      result: 'Acento de idioma: ',
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
};
