require("dotenv").config();

const {
  HuggingFaceTransformersEmbeddings
} = require(
  "@langchain/community/embeddings/huggingface_transformers"
);

const {
  Pinecone
} = require("@pinecone-database/pinecone");

const Groq =
require("groq-sdk");

const groq =
  new Groq({
    apiKey:
      process.env.GROQ_API_KEY,
  });

const History = [];

async function transformQuery(question){

  History.push({
    role: 'user',
    content: question
  });

  const response =
    await groq.chat.completions.create({

      messages: [

        {
          role: "system",
          content: `
Rewrite the user's latest question
into a standalone question.
Only return the rewritten question.
          `,
        },

        ...History

      ],

      model: "llama-3.1-8b-instant",

    });

  History.pop();

  return response
    .choices[0]
    .message
    .content;
}

async function askAI(question){

  try{

    // REWRITE QUERY

    const queries =
      await transformQuery(question);

    // EMBEDDINGS

    const embeddings =
      new HuggingFaceTransformersEmbeddings({
        model:
          "Xenova/all-MiniLM-L6-v2",
      });

    // QUERY VECTOR

    const queryVector =
      await embeddings.embedQuery(
        queries
      );

    // PINECONE

    const pinecone =
      new Pinecone({
        apiKey:
          process.env.PINECONE_API_KEY,
      });

    const pineconeIndex =
      pinecone
        .Index(
          process.env.PINECONE_INDEX_NAME
        )
        .namespace("default");

    // SEARCH

    const searchResults =
      await pineconeIndex.query({

        topK: 5,

        vector: queryVector,

        includeMetadata: true,

      });

    // CONTEXT

    const context =
      searchResults.matches
        .map(match =>
          match.metadata.text
        )
        .join("\n\n---\n\n");

    // SAVE USER QUERY

    History.push({
      role: 'user',
      content: queries
    });

    // FINAL ANSWER

    const response =
      await groq.chat.completions.create({

        messages: [

          {
            role: "system",
            content: `
You are SheStay AI.

Answer ONLY from context.

Context:
${context}
            `,
          },

          ...History

        ],

        model: "llama-3.1-8b-instant",

      });

    const finalAnswer =
      response
        .choices[0]
        .message
        .content;

    // SAVE HISTORY

    History.push({
      role: 'assistant',
      content: finalAnswer
    });

    return finalAnswer;

  }
  catch(err){

    console.log(err);

    return "Something went wrong.";

  }

}

module.exports = { askAI };