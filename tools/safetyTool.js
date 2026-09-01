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
        filter.price = { $lte: budget };
    }

   const listings = await Listing.find(filter);

if (!listings.length) {
    return budget
        ? `No listings found in ${city} under ₹${budget}`
        : `No listings found in ${city}`;
}
let safestListing = null;
let highestScore = -1;

for (const listing of listings) {

    const score = calculateAISafetyScore(listing);

    console.log(
        listing.title,
        "AI Safety Score:",
        score
    );

    if (score > highestScore) {
        highestScore = score;
        safestListing = listing;
    }
}
if (!safestListing) {
    return "Listings were found, but no AI safety scores are available.";
}
    let recommendation = "";

    if (highestScore >= 90)
        recommendation =
            "🌟 AI Recommendation: Excellent choice for solo women travelers.";

    else if (highestScore >= 75)
        recommendation =
            "✅ AI Recommendation: Very safe with strong security measures.";

    else if (highestScore >= 60)
        recommendation =
            "👍 AI Recommendation: Generally safe. Exercise normal precautions.";

    else if (highestScore >= 45)
        recommendation =
            "⚠️ AI Recommendation: Some important safety features are missing.";

    else
        recommendation =
            "❌ AI Recommendation: Not recommended for solo women travelers.";

    return `
🏆 Safest Stay Found

🏡 ${safestListing.title}

📍 ${safestListing.location}

💰 ₹${safestListing.price}

🤖 AI Safety Score: ${highestScore}/100

⭐ User Safety Rating: ${safestListing.safetyRating || "N/A"}/5

🔒 CCTV: ${safestListing.hasCCTV ? "✅" : "❌"}

🛡️ 24×7 Security: ${safestListing.security24x7 ? "✅" : "❌"}

🔐 Secure Lock: ${safestListing.hasSecureLock ? "✅" : "❌"}

🏘️ Gated Property: ${safestListing.gatedProperty ? "✅" : "❌"}

🚨 Emergency Support: ${safestListing.emergencySupport ? "✅" : "❌"}

💡 Well-lit Area: ${safestListing.wellLitArea ? "✅" : "❌"}

🚖 Night Cab Available: ${safestListing.cabAvailabilityNight ? "✅" : "❌"}

🌙 Late-night Check-in: ${safestListing.lateNightCheckin ? "✅" : "❌"}

👩 Women Only: ${safestListing.isWomenOnly ? "✅" : "❌"}

👩 Female Staff: ${safestListing.femaleStaffAvailable ? "✅" : "❌"}

👮 Nearby Police Station: ${safestListing.nearbyPoliceStation ? "✅" : "❌"}

${recommendation}
`;
}

module.exports = safetyTool;