require("dotenv").config();

const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function resolveBooking(history, query){

    const response =
    await groq.chat.completions.create({

        model: "openai/gpt-oss-20b",

        messages:[

            {
                role:"system",
                content:`
You help resolve booking references.

Use the conversation history to determine which property the user wants.

Examples:

User:
Book the first one

Return:
Spphire Nest Retreat

User:
Book that stay

Return:
Lotus Comfort Villa

Return ONLY the property title.

If no property can be identified,
return:
UNKNOWN
`
            },

            {
                role:"user",
                content:
`
History:

${history
.map(m=>`${m.role}: ${m.content}`)
.join("\n")}

Current Query:

${query}
`
            }

        ]

    });

    return response
        .choices[0]
        .message
        .content
        .trim();

}

module.exports = resolveBooking;