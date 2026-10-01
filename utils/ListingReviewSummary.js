const { z } = require("zod");

const ListingReviewSummary = z.object({
  overallSafetyScore: z
    .number()
    .min(0)
    .max(100),

  overallVerdict: z.string(),

  summary: z
    .string()
    .min(1),

  strengths: z
    .array(z.string()),

  concerns: z
    .array(z.string()),

  recommendation: z
    .string()
    .min(1),
});

module.exports = ListingReviewSummary;