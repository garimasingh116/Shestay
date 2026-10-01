const { z } = require("zod");

const ReviewAnalysis = z.object({

  feltSafe: z.boolean(),

  safeForSoloWomen: z.boolean(),

  lateNightExperience: z.string(),

  hostBehavior: z.enum([
    "excellent",
    "good",
    "average",
    "poor"
  ]),

  securityExperience: z.string(),

  wouldRecommendToWomen: z.boolean(),

  safetyTags: z.array(z.string()),

  reviewSafetyScore: z.number()
    .min(0)
    .max(100),

  confidence: z.number()
    .min(0)
    .max(1),

  aiSummary: z.string()

});

module.exports = ReviewAnalysis;