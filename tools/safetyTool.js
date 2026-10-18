
const Listing = require("../models/listing");
const calculateAISafetyScore = require("../utils/aisum.js");

async function safetyTool(city, budget = null) {

    const filter = {
        location: {
            $regex: city,
            $options: "i"
        }
    };

    if (budget) {
        filter.price = {
            $lte: budget
        };
    }

    const listings = await Listing.find(filter);

    if (!listings.length) {
        return budget
            ? `No listings found in ${city} under ₹${budget}`
            : `No listings found in ${city}`;
    }

    let safestListing = null;
    let highestScore = -1;
    let safestAIResult = null;

    for (const listing of listings) {

        const aiResult =
            await calculateAISafetyScore(listing);

        // Extract the actual number
        const score =
            Number(aiResult.overallSafetyScore);

        console.log(
            listing.title,
            "AI Safety Score:",
            score
        );

        // Ignore properties with no reviews
        if (
            aiResult.overallVerdict === "No Reviews"
        ) {
            continue;
        }

        if (
            !Number.isNaN(score) &&
            score > highestScore
        ) {

            highestScore = score;

            safestListing = listing;

            safestAIResult = aiResult;
        }
    }

    // No valid score found
    if (
        safestListing === null ||
        highestScore === -1
    ) {
        return "Listings were found, but no AI safety scores are available.";
    }

    let recommendation = "";

    if (highestScore >= 90) {

        recommendation =
            "🌟 AI Recommendation: Excellent choice for solo women travelers.";

    } else if (highestScore >= 75) {

        recommendation =
            "✅ AI Recommendation: Very safe with strong security measures.";

    } else if (highestScore >= 60) {

        recommendation =
            "👍 AI Recommendation: Generally safe. Exercise normal precautions.";

    } else if (highestScore >= 45) {

        recommendation =
            "⚠️ AI Recommendation: Some important safety features are missing.";

    } else {

        recommendation =
            "❌ AI Recommendation: Not recommended for solo women travelers.";
    }

return {
  success: true,
  safestListing: {
    id: safestListing._id.toString(),
    title: safestListing.title,
    location: safestListing.location,
    price: safestListing.price,
    safetyRating: safestListing.safetyRating,
    aiSafetyScore: highestScore,
    verdict: safestAIResult.overallVerdict,
    features: {
      hasCCTV: safestListing.hasCCTV,
      security24x7: safestListing.security24x7,
      hasSecureLock: safestListing.hasSecureLock,
      gatedProperty: safestListing.gatedProperty,
      emergencySupport: safestListing.emergencySupport,
      wellLitArea: safestListing.wellLitArea,
      lateNightCheckin: safestListing.lateNightCheckin,
      isWomenOnly: safestListing.isWomenOnly,
      femaleStaffAvailable:
        safestListing.femaleStaffAvailable
    },
    recommendation
  }
};

}
module.exports = safetyTool;