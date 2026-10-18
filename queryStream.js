
require("dotenv").config();

const {
  HuggingFaceTransformersEmbeddings,
} = require("@langchain/community/embeddings/huggingface_transformers");

const { Pinecone } = require("@pinecone-database/pinecone");

// Initialize clients once.
const embeddings = new HuggingFaceTransformersEmbeddings({
  model: "Xenova/all-MiniLM-L6-v2",
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const pineconeIndex = pinecone
  .Index(process.env.PINECONE_INDEX_NAME)
  .namespace("default");

async function retrieveDocuments(question) {
  try {
    const query = question.toLowerCase().trim();

    // 1. Convert query into an embedding.
    const queryVector = await embeddings.embedQuery(query);

    // 2. Retrieve relevant chunks from Pinecone.
    const searchResults = await pineconeIndex.query({
      topK: 8,
      vector: queryVector,
      includeMetadata: true,
    });

    // 3. Return documents, not a generated answer.
    const documents = (searchResults.matches || [])
      .filter(match => match.metadata?.text)
      .map(match => ({
        text: match.metadata.text,
        score: match.score,
        source: match.metadata.source || null,
      }));

    console.log("Retrieved documents:", documents.length);

    return {
      success: true,
      count: documents.length,
      documents,
    };
  } catch (error) {
    console.error("RAG retrieval failed:", error.message);

    return {
      success: false,
      count: 0,
      documents: [],
      error: "Document retrieval failed.",
    };
  }
}

module.exports = retrieveDocuments;