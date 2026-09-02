
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function selectTool(userQuery) {

  const query = userQuery.toLowerCase().trim();

  // =====================================================
  // 1. MY BOOKINGS
  // =====================================================

  if (
    query.includes("my booking") ||
    query.includes("my bookings") ||
    query.includes("booking history") ||
    query.includes("my reservations") ||
    query.includes("upcoming booking") ||
    query.includes("upcoming bookings") ||
    query.includes("what have i booked") ||
    query.includes("what did i book") ||
    query.includes("booked properties")
  ) {
    return "MY_BOOKINGS";
  }


  // =====================================================
  // 2. BOOKING
  // =====================================================

  if (
    query.includes("book this") ||
    query.includes("book it") ||
    query.includes("book a") ||
    query.includes("book the") ||
    query.includes("reserve it") ||
    query.includes("reserve this") ||
    query.includes("make a reservation") ||
    query.includes("confirm my booking") ||
    query.includes("i want to stay here") ||
    query.includes("i want to book") ||
    query.includes("i want to reserve")
  ) {
    return "BOOKING";
  }


  // =====================================================
  // 3. SAFETY
  // =====================================================

  if (
    query.includes("safest") ||
    query.includes("most safe") ||
    query.includes("most secure") ||
    query.includes("highest safety") ||
    query.includes("highest safety rating") ||
    query.includes("best safety rating") ||
    query.includes("securest") ||
    query.includes("safety rating") ||
    query.includes("safe accommodation") ||
    query.includes("safe stay") ||
    query.includes("secure accommodation") ||
    query.includes("secure stay")
  ) {
    return "SAFETY";
  }


  // =====================================================
  // 4. MONGODB
  // =====================================================

  if (
    query.includes("show") ||
    query.includes("list") ||
    query.includes("find") ||
    query.includes("stay") ||
    query.includes("stays") ||
    query.includes("property") ||
    query.includes("properties") ||
    query.includes("accommodation") ||
    query.includes("accommodations") ||
    query.includes("hotel") ||
    query.includes("hotels") ||
    query.includes("villa") ||
    query.includes("villas") ||
    query.includes("listing") ||
    query.includes("listings") ||
    query.includes("how many") ||
    query.includes("count") ||
    query.includes("available stays") ||
    query.includes("available properties")
  ) {
    return "MONGODB";
  }


  // =====================================================
  // 5. LLM FALLBACK
  // =====================================================

  const response =
    await groq.chat.completions.create({

      model: "openai/gpt-oss-20b",

      messages: [

        {
          role: "system",

          content: `
You are an intelligent routing agent for a
accommodation booking platform.

Choose exactly ONE backend tool.

AVAILABLE TOOLS:

1. MONGODB

Use when the user wants to retrieve, search, list,
filter, count, or find accommodation listings.

Examples:
- show stays in Mumbai
- show properties in Delhi
- find villas in Hyderabad
- list accommodations
- how many stays are in Hyderabad?
- count hotels in Mumbai
- properties under 3000
- women-only stays
- stays with CCTV


2. RAG

Use when the user wants:
- recommendations
- explanations
- comparisons
- travel advice
- general information
- information about a particular property

Examples:
- recommend a stay
- which stay is better?
- compare these properties
- explain the safety features
- what amenities are available?
- tell me about Sapphire Nest Retreat
- give me travel advice


3. SAFETY

Use ONLY when the user specifically wants
accommodation selected or ranked based on safety.

Examples:
- safest stay
- safest hotel
- safest villa
- safest stay in Hyderabad
- most secure property
- highest safety rating
- safest accommodation near airport


4. BOOKING

Use when the user wants to create a booking.

Examples:
- book this stay
- reserve it
- book Sapphire Nest Retreat
- I want to stay here
- confirm my booking
- make a reservation


5. MY_BOOKINGS

Use when the user wants information about
their existing bookings.

Examples:
- my bookings
- booking history
- what have I booked?
- upcoming stays
- booked properties
- show my reservations


IMPORTANT RULES:

- Return ONLY one tool name.
- Never explain your choice.
- Never return anything else.

Valid outputs:

MONGODB
RAG
SAFETY
BOOKING
MY_BOOKINGS
`
        },

        {
          role: "user",
          content: userQuery
        }

      ]

    });


  const tool =
    response.choices[0].message.content.trim();

  console.log("LLM ROUTER RESULT:", tool);

  // =====================================================
  // 6. SAFETY CHECK
  // =====================================================

  const validTools = [
    "MONGODB",
    "RAG",
    "SAFETY",
    "BOOKING",
    "MY_BOOKINGS"
  ];

  if (validTools.includes(tool)) {
    return tool;
  }

  // If LLM returns something unexpected
  return "RAG";
}


module.exports = selectTool;

