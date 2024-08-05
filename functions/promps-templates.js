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

const sentimentTemplate = `
Eres un experto en evaluar conversaciones de correo electronico.
Su objetivo es obtener un analisis de sentimiento de esta conversacion

A continuación  encontrará la conversacion:
--------
{text}
--------

Dado el contexto, devuelva un valor del 1 al 5 donde 1 es el sentimiento mas negativo y 5 es el sentimiento mas positivo

SENTIMIENTO:
`;

const priorityTemplate = `
Eres un experto en evaluar conversaciones de correo electronico.
Su objetivo es obtener un analisis de prioridad de esta conversacion

A continuación  encontrará la conversacion:
--------
{text}
--------


Aqui te dejo una lista de las direcciones de email mas importantes, si la conversacion coincide con alguno de estas direcciones, considera darle mas prioridad
--------
{emails_list}
--------

Dado el contexto, devuelva un valor del 1 al 5 donde 1 es la prioridad  mas alta y 5 es la prioridad mas baja

PRIORIDAD:
`;

const autoResponseTemplate = `
Eres un experto en redactar conversaciones de correo electronico.
Su objetivo es generar una respuesta para esta conversacion y obtener la direccion de email a donde se va a enviar la respuesta

A continuación  encontrará la conversacion:
--------
{text}
--------

Una vez generada la respuesta, quiero que me generes una instruccion donde mandes a enviar un email a la direccion que obtuviste de la conversacion

INSTRUCCION:
`;
module.exports = {
  summaryRefineTemplate,
  summaryTemplate,
  QA_TEMPLATE_TEST,
  CONDENSE_TEMPLATE_TEST,
  sentimentTemplate,
  priorityTemplate,
  autoResponseTemplate,
};
