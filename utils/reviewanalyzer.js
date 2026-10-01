const Groq = require("groq-sdk");
const ReviewAnalysis = require("./ReviewAnalysis");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function analyzeReview(reviewText) {

  const completion = await groq.chat.completions.create({

    model: "openai/gpt-oss-20b",

    messages: [

      {
        role: "system",

        content: `
You are a hotel safety review analyzer.

Analyze the user's hotel review and return ONLY valid JSON.

IMPORTANT FIELD TYPES:

1. feltSafe
   - MUST be boolean
   - Example: true

2. safeForSoloWomen
   - MUST be boolean
   - Example: true

3. lateNightExperience
   - MUST be a STRING
   - Describe the late-night experience.
   - NEVER return true or false.
   - Example:
     "The guest felt safe arriving late at night because security staff were present."

4. hostBehavior
   - MUST be one of:
     "excellent"
     "good"
     "average"
     "poor"

5. securityExperience
   - MUST be a STRING
   - Describe the security experience.
   - NEVER return true or false.
   - Example:
     "CCTV cameras and security guards were present."

6. wouldRecommendToWomen
   - MUST be boolean

7. safetyTags
   - MUST be an array of strings

8. reviewSafetyScore
   - MUST be a number between 0 and 100

9. confidence
   - MUST be a number between 0 and 1

10. aiSummary
    - MUST be a string

Example output:

{
  "feltSafe": true,
  "safeForSoloWomen": true,
  "lateNightExperience": "The guest felt safe arriving late at night because security staff were present.",
  "hostBehavior": "excellent",
  "securityExperience": "CCTV cameras and security guards were present.",
  "wouldRecommendToWomen": true,
  "safetyTags": [
    "CCTV",
    "24x7 Security",
    "Female Staff"
  ],
  "reviewSafetyScore": 94,
  "confidence": 0.97,
  "aiSummary": "The property appears very safe for solo women with strong security."
}

Return JSON only.
        `,
      },

      {
        role: "user",
        content: reviewText,
      },
    ],

    response_format: {
      type: "json_object",
    },
  });


  // AI response is a JSON string
  const result = JSON.parse(
    completion.choices[0].message.content
  );


  // ZOD VALIDATION
  const validation = ReviewAnalysis.safeParse(result);


  // VALIDATION FAILED
  if (!validation.success) {

    console.log("Zod validation failed:");

    console.log(validation.error.issues);

    throw new Error("Invalid AI response");
  }


  // VALIDATION SUCCESS
  return validation.data;
}

module.exports = analyzeReview;