const { ChatPromptTemplate } = require('langchain/prompts');
const { RunnableSequence } = require('langchain/schema/runnable');
const { StringOutputParser } = require('langchain/schema/output_parser');
const { ChatOpenAI } = require('langchain/chat_models/openai');
const request = require('request');

const CONDENSE_TEMPLATE = `
Dado el siguiente texto de correcto electronico, reformule el texto para que sea un texto independiente.
texto de correo electronico: {text}
texto independiente:
`;
const QA_TEMPLATE = `Quiero que actues como un profesional en la comunicacion por
correos electronicos,

A continuacion te voy a dar el siguiente texto: 

texto: {text}

El codigo anterior es un mensaje de correo electronico.

Ahora quiero que analices el mensaje escrito por el usuario y
lo modifiques por un mensaje {sentiment} y amigable.

el siguiente contexto pertenece a una lista de correos electronicos creados previamente por miembros de la empresa, puedes usarlo para sacar informacion
de la empresa relevante para este correo electronico.

<context>
  {context}
</context>



No quiero que agregues marcadores o placeholders al mensaje modificado,
como por ejemplo [tu nombre], [Información de contacto adicional, si es necesario],
[Nombre del destinatario], o cualquier campo que tenga que se llenado por 
el usuario.

Tampoco quiero que te refieras al destinatario como usuario o destinatario, 
evita usar oraciones donde tengas que agregar eso.

No alargues los parrafos nuevos a mas de 100 palabras por parrafo. 

Si el texto que te pase es corto, no generes un texto que sea el triple de largo.

De resultado quiero que devuelvas un texto plano del correo electronico que voy a enviar, evita escribir textos como previos al mensaje de correo, como "Claro, aquí tienes el mensaje modificado, o Claro, aquí tienes el mensaje".
`;

const combineDocumentsFn = (docs, separator = '\n\n') => {
  const serializedDocs = docs.map(doc => doc.pageContent);
  return serializedDocs.join(separator);
};

const makeChain = retriever => {
  const condenseQuestionPrompt = ChatPromptTemplate.fromTemplate(CONDENSE_TEMPLATE);
  const answerPrompt = ChatPromptTemplate.fromTemplate(QA_TEMPLATE);
  const model = new ChatOpenAI({
    temperature: 0,
    modelName: 'gpt-3.5-turbo',
    n: 4,
  });
  const standaloneQuestionChain = RunnableSequence.from([condenseQuestionPrompt, model, new StringOutputParser()]);
  const retrievalChain = retriever.pipe(combineDocumentsFn);
  const answerChain = RunnableSequence.from([
    {
      context: RunnableSequence.from([input => input.text, retrievalChain]),
      text: input => input.text,
      sentiment: input => input.sentiment,
    },
    answerPrompt,
    model,
    new StringOutputParser(),
  ]);
  const conversationalRetrievalQAChain = RunnableSequence.from([
    {
      text: standaloneQuestionChain,
      chat_history: input => input.chat_history,
    },
    answerChain,
  ]);
  return conversationalRetrievalQAChain;
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
};
