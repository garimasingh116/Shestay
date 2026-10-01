const Groq = require("groq-sdk");
const Listing = require("../models/listing");
const ListingReviewSummary = require("./ListingReviewSummary");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function generateAIReviewSummary(listingId) {

  const listing = await Listing.findById(listingId)
    .populate("reviews");

  // No reviews
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


  // Convert all reviews into text
  const reviews = listing.reviews
    .map((review, index) => {

      return `Review ${index + 1}:
Rating: ${review.rating}/5
Comment: ${review.comment}
Felt Safe: ${review.feltSafe}
Safe For Solo Women: ${review.safeForSoloWomen}
Late Night Experience: ${review.lateNightExperience}
Host Behavior: ${review.hostBehavior}
Security Experience: ${review.securityExperience}
Would Recommend To Women: ${review.wouldRecommendToWomen}
Safety Tags: ${review.safetyTags?.join(", ")}
Review Safety Score: ${review.reviewSafetyScore}
AI Summary: ${review.aiSummary}`;

    })
    .join("\n\n");


  const prompt = `
You are an AI safety analyst for a women-centric accommodation platform.

Analyze ALL the guest reviews below.

Return ONLY valid JSON.

Rules:

- overallSafetyScore must be a number from 0 to 100.
- overallVerdict must be a short description such as:
  "Very Safe", "Safe", "Moderately Safe", or "Needs Caution".
- summary must be one concise paragraph.
- strengths must be an array of strings.
- concerns must be an array of strings.
- recommendation must be a string.
- Do not invent information that is not present in the reviews.

Return:

{
  "overallSafetyScore": 92,
  "overallVerdict": "Very Safe",
  "summary": "One concise paragraph summarizing the overall guest experience.",
  "strengths": [
    "Strong security",
    "Positive host behavior"
  ],
  "concerns": [
    "Limited late-night feedback"
  ],
  "recommendation": "A one-line recommendation for women travellers."
}

Reviews:

${reviews}
`;


  // Call Groq
  const completion = await groq.chat.completions.create({

    model: "openai/gpt-oss-20b",

    messages: [

      {
        role: "system",
        content: "Return ONLY valid JSON.",
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


  // AI returns JSON as STRING
  const result = JSON.parse(
    completion.choices[0].message.content
  );


  // ZOD VALIDATION
  const validation = ListingReviewSummary.safeParse(result);


  // Validation failed
  if (!validation.success) {

    console.log("Zod validation failed:");

    console.log(validation.error.issues);

    throw new Error("Invalid AI review summary");
  }


  // Validation successful
  return {
    ...validation.data,
    updatedAt: new Date(),
  };
}

module.exports = generateAIReviewSummary;