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
module.exports = {
  summaryRefineTemplate,
  summaryTemplate,
  QA_TEMPLATE_TEST,
  CONDENSE_TEMPLATE_TEST,
};
