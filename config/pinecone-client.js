const { Pinecone } = require('@pinecone-database/pinecone');
const { Document } = require('@langchain/core/documents');
const { PineconeStore } = require('@langchain/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

function initPinecone() {
  try {
    const pinecone = new Pinecone({
      // environment: process.env.PINECONE_ENVIRONMENT ?? '',
      apiKey: process.env.PINECONE_API_KEY ?? '',
    });

    return pinecone;
  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to initialize Pinecone Client');
  }
}

async function saveTextPinecone(index_name, namespace, text, metadata) {
  try {
    const documentLangChain = new Document({
      pageContent: text,
      metadata: metadata,
    });
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const docs = await textSplitter.splitDocuments([documentLangChain]);
    const embeddings = new OpenAIEmbeddings();
    const index = pinecone.Index(index_name);
    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: index,
      namespace: namespace,
      textKey: 'text',
    });
  } catch (error) {
    console.log(error);
  }
}

const pinecone = initPinecone();
module.exports = {
  pinecone,
  saveTextPinecone,
};
