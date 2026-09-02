require("dotenv").config();

const {
  HuggingFaceTransformersEmbeddings,
} = require("@langchain/community/embeddings/huggingface_transformers");

const { Pinecone } = require("@pinecone-database/pinecone");

const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function chattingStream(question, history = [], onToken) {

  try {

    const queries = question.toLowerCase().trim();

  

    // EMBEDDINGS

    const embeddings =
      new HuggingFaceTransformersEmbeddings({

        model: "Xenova/all-MiniLM-L6-v2",

      });

    const queryVector =
      await embeddings.embedQuery(queries);

    // PINECONE

    const pinecone =
      new Pinecone({

        apiKey: process.env.PINECONE_API_KEY,

      });

    const pineconeIndex =
      pinecone
      .   Index(process.env.PINECONE_INDEX_NAME) //index is table
       .namespace("default"); //folder  inside the sam eindex

    const searchResults =
    await pineconeIndex.query({
        topK: 8,
        vector: queryVector,
        includeMetadata: true
    });

console.log(
    "Retrieved:",
    searchResults.matches.length,
    "chunks"
);

console.log("========== RETRIEVED CONTEXT ==========");

searchResults.matches.forEach((match, index) => {
    console.log(`\n--- CHUNK ${index + 1} ---`);
    console.log(match.metadata?.text);
});

console.log("========================================");

const context =
    searchResults.matches
        .map(match => match.metadata?.text)
        .filter(Boolean)
        .join("\n\n-----------------\n\n");
        
    const previousMessages =
      history
      .filter(m=>m.role!=="user" || m.content!==question)
      .map(m=>({

        role:m.role,

        content:m.content

      }));

    // STREAM

    const stream =
      await groq.chat.completions.create({

       model: "openai/gpt-oss-20b",

        stream:true,

        messages:[

          {

            role:"system",

            content:`

You are SheStay AI.

You help women travelers find safe accommodation.

Answer ONLY from the context.

If recommending a property:

- Explain naturally.
- Mention safety.
- Mention CCTV if available.
- Mention women-only.
- Mention emergency support.
- Mention safety rating.
- Do NOT sound like a database.

Context:

${context}

`

          },

          ...previousMessages, // no nested

          {

            role:"user",

            content:queries

          }

        ]

      });

    let fullAnswer="";

    for await(const chunk of stream){

      const token =
        chunk.choices?.[0]?.delta?.content || ""; //delta new piece of text

      if(!token){

        continue;

      }

      fullAnswer += token;

      //process.stdout.write(token); //for terminal

      if(onToken){

        onToken(token);

      }

    }

    console.log("\n");

    return fullAnswer;

  }

  catch(err){

    console.log(err);

    return "AI failed.";

  }

}

module.exports = chattingStream;