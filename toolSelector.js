const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function selectTool(userQuery){

  const response =
    await groq.chat.completions.create({

      model: "llama-3.1-8b-instant",

      messages: [

        {
          role: "system",
         
content: `
You are a routing agent.

Available Tools:

1. MONGODB

Use when user wants:
- show listings
- stays in a city
- properties in a city
- all listings
- list available stays
- hotels in a city

2. RAG

Use when user wants:
- recommendations
- compare properties
- travel guidance
- women safety suggestions
- explain features
- answer questions about stays

3. SAFETY

Use when user wants:
- safest stay
- safest property
- safest women-only stay
- most secure stay
- highest safety rating
- safest stay in a city
- secure stay for solo women

4. BOOKING

Use when user says:

- book a stay
- reserve a property
- make a booking
- I want to book
- book Sapphire Nest Retreat
- reserve Lotus Comfort Villa

5. MY_BOOKINGS

Use when user says:

- show my bookings
- my bookings
- booking history
- booked stays
- what have I booked

Return ONLY one of:

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
    .trim();

}

module.exports = selectTool;