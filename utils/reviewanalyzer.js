const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

async function analyzeReview(reviewText) {

    const completion = await groq.chat.completions.create({

        model: "llama-3.3-70b-versatile",

        messages: [
            {
                role: "system",
                content: `
You are a hotel safety review analyzer.

Analyze the review and return ONLY valid JSON.

{
  "feltSafe": true,
  "safeForSoloWomen": true,
  "lateNightExperience": "Safe late-night check-in with security staff.",
  "hostBehavior": "excellent",
  "securityExperience": "CCTV and guards were present.",
  "wouldRecommendToWomen": true,
  "safetyTags": [
    "CCTV",
    "24x7 Security",
    "Female Staff"
  ],
  "reviewSafetyScore": 94,
  "confidence": 0.97,
  "aiSummary": "Very safe property for solo women with excellent security."
}

Do not explain anything.
Return JSON only.
`
            },
            {
                role: "user",
                content: reviewText
            }
        ],

        response_format: {
            type: "json_object"
        }

    });

    return JSON.parse(
        completion.choices[0].message.content
    );
}

module.exports = analyzeReview;