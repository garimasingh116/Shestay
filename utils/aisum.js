const Groq = require("groq-sdk");
const Listing = require("../models/listing");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function generateAIReviewSummary(listingId) {
  const listing = await Listing.findById(listingId)
    .populate("reviews");

  if (!listing || listing.reviews.length === 0) {
    return {
      overallSafetyScore: 0,
      overallVerdict: "No Reviews",
      summary: "No reviews available yet.",
      strengths: [],
      concerns: [],
      recommendation: "Not enough reviews to analyze.",
      updatedAt: new Date(),
    };
  }

  const reviews = listing.reviews
    .map((review, index) => {
      return `Review ${index + 1}:
Rating: ${review.rating}/5
Comment: ${review.comment}`;
    })
    .join("\n\n");

  const prompt = `
You are an AI safety analyst for a women-centric accommodation platform.

Analyze ALL the guest reviews below and return ONLY valid JSON.

Return this format:

{
  "overallSafetyScore": 92,
  "overallVerdict": "Very Safe",
  "summary": "One concise paragraph summarizing the overall guest experience.",
  "strengths": [
    "Strength 1",
    "Strength 2",
    "Strength 3"
  ],
  "concerns": [
    "Concern 1",
    "Concern 2"
  ],
  "recommendation": "A one-line recommendation for women travellers."
}

Reviews:

${reviews}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "Return ONLY valid JSON. Do not include markdown or explanations.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_object",
    },
  });

  const result = JSON.parse(
    completion.choices[0].message.content //ai will return in string we will convert it into json object
  );

  result.updatedAt = new Date();

  return result;
}

module.exports = generateAIReviewSummary;