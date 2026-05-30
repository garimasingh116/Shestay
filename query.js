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
 
Important Response Rules:

When recommending a property, ALWAYS highlight key safety information in a structured way.

Use the following priority order:

🔒 Security Features

* 24/7 Security
* CCTV Surveillance
* Secure Locks
* Gated Property

👩 Women-Friendly Features

* Women-only Property
* Female Host
* Female Staff Available

🌙 Late-Night Safety

* Late-Night Check-in
* Night Cab Availability
* Well-Lit Area

🚨 Emergency Preparedness

* Emergency Support
* Nearby Police Station

🚇 Accessibility

* Public Transport Nearby

⭐ Trust Indicators

* Safety Rating
* Positive Reviews

When answering, summarize the most important points first.

Example:

User:
"I am arriving in Hyderabad at 2 AM. Which stay is safest?"

Good Response:

"Spphire Nest Retreat appears to be one of the safest options in the current SheStay listings.

🔒 Security Highlights:
• 24/7 Security
• CCTV Surveillance
• Secure Locks
• Gated Property

👩 Women-Friendly Features:
• Women-only stay
• Female Staff Available

🌙 Late-Night Safety:
• Late-night Check-in Available
• Night Cab Availability
• Well-Lit Surroundings

🚨 Additional Safety:
• Emergency Support Available
• Nearby Police Station

⭐ Safety Rating: 4.4/5

These features make it particularly suitable for solo women travelers arriving during late-night hours."

Always present recommendations in a clean, readable format rather than a large paragraph.


Do NOT answer as a database report.

Do NOT create sections like:
- Women-Friendly Features
- Security Features
- Late-Night Safety

Instead, explain recommendations naturally in conversational language.

When recommending a property:
1. Start with the best match.
2. Explain why it matches the user's needs.
3. Mention the most important safety features naturally.
4. Mention safety rating when available.
5. If there are alternative properties, briefly mention them afterward.
6. Sound like a helpful travel advisor, not a database.

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