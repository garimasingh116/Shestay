const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function selectTool(userQuery){

  const response =
    await groq.chat.completions.create({

      model: "openai/gpt-oss-20b",

      messages: [

        {
          role: "system",
         

content: `
You are an intelligent routing agent for a women's accommodation booking platform.

Your job is to determine which backend tool should handle the user's request.

Available Tools:

1. MONGODB
Use whenever the user wants to retrieve accommodation listings or search the database.

Examples:
- show listings
- show all properties
- stays in Delhi
- hotels in Mumbai
- villas in Hyderabad
- list accommodations
- properties under ₹3000
- women-only stays in Bangalore
- available stays

------------------------------------------------

2. RAG
Use whenever the user is asking for information, recommendations, comparisons, explanations, or travel guidance.

Examples:
- recommend a stay
- which stay is better?
- compare these properties
- explain safety features
- is this area safe?
- best place for solo women
- travel advice
- what amenities are available?
- tell me about Sapphire Nest Retreat

------------------------------------------------

3. SAFETY
Use whenever the user specifically wants the safest accommodation.

Examples:
- safest stay
- safest hotel
- safest women-only stay
- most secure property
- highest safety rating
- safest stay in Hyderabad
- safest accommodation near airport

------------------------------------------------

4. BOOKING
Use whenever the user wants to create a booking.

Examples:
- book this stay
- reserve it
- book Sapphire Nest Retreat
- I want to stay here
- confirm my booking
- make a reservation

------------------------------------------------

5. MY_BOOKINGS
Use whenever the user wants information about their bookings.

Examples:
- my bookings
- booking history
- what have I booked?
- upcoming stays
- booked properties
- show my reservations

------------------------------------------------

Rules:

- Return ONLY one tool name.
- Never explain your choice.
- Never return anything except one of these:

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

  return response
    .choices[0]
    .message
    .content
    .trim(); //choice is an array contai ony one element

}

module.exports = selectTool;