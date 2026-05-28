require("dotenv").config();

const {
  HuggingFaceTransformersEmbeddings
} = require("@langchain/community/embeddings/huggingface_transformers");

const {
  Pinecone
} = require("@pinecone-database/pinecone");

const Groq = require("groq-sdk");

// GROQ SETUP
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// CHAT HISTORY
const History = [];

// MAIN CHAT FUNCTION
async function chatting(question) {

  try {

    // CLEAN QUERY
    const queries = question.toLowerCase().trim();

    console.log("\nUser Query:");
    console.log(queries);

    // EMBEDDINGS
    const embeddings =
      new HuggingFaceTransformersEmbeddings({
        model: "Xenova/all-MiniLM-L6-v2",
      });

    // QUERY VECTOR
    const queryVector =
      await embeddings.embedQuery(queries);

    // PINECONE CONNECTION
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // PINECONE INDEX
    const pineconeIndex =
      pinecone
        .Index(process.env.PINECONE_INDEX_NAME)
        .namespace("default");

    // VECTOR SEARCH
    const searchResults =
      await pineconeIndex.query({
        topK: 8,
        vector: queryVector,
        includeMetadata: true,
      });

    console.log(
      "\nSearch Results Found:",
      searchResults.matches.length
    );

    // CREATE CONTEXT
    const context = searchResults.matches
      .map(match => match.metadata.text)
      .join("\n\n---\n\n");

    // SAVE USER MESSAGE
    History.push({
      role: 'user',
      content: queries
    });

    // FINAL ANSWER GENERATION
    const response =
      await groq.chat.completions.create({

        messages: [

          {
            role: "system",
            content: `
 
You are SheStay AI — a smart, friendly, and trustworthy assistant designed to help women discover safe, comfortable, and reliable stays across India.

Your role is to guide users in finding women-friendly accommodations based on the information available in the provided context.

The listings may include:
- women-only villas
- secure hostels
- luxury stays
- solo women travel accommodations
- gated properties
- late-night check-in support
- CCTV-enabled stays
- female staff availability
- emergency support services
- safety ratings
- city and location details
- nearby transport and police accessibility

Behavior Guidelines:
- Answer ONLY using the provided context.
- Never create or assume information that is not present.
- Keep responses natural, warm, professional, and easy to understand.
- Make users feel safe, supported, and welcomed.
- Highlight important safety features whenever relevant.
- If a user asks about a specific city or property, provide concise but informative details.
- If multiple properties match the request, compare them briefly in a clean and readable way.
- Prioritize information related to:
  - women’s safety
  - secure surroundings
  - female staff
  - gated security
  - CCTV surveillance
  - emergency assistance
  - late-night accessibility
- If the requested information is unavailable in the current context, politely explain that it is not available in the current SheStay listings.
- Avoid overly robotic answers.
- Keep answers informative but not too lengthy.
- Maintain a premium, caring, and trustworthy tone.

Context:
${context}
`,
          },

          {
            role: "user",
            content: queries
          }

        ],

        model: "llama-3.1-8b-instant",

      });

    // FINAL ANSWER
    const answer =
      response.choices[0].message.content;

    console.log("\nAI Response:\n");
    console.log(answer);

    return answer;

  } catch (err) {

    console.log(err);

    return "AI failed";

  }

}

module.exports = chatting;