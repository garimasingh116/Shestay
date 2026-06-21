const Listing = require("../models/listing");

async function safetyTool(city, budget = null){

  let filter = {

    location: {
      $regex: city,
      $options: "i"
    }

  };

  if(budget){

    filter.price = {
      $lte: budget
    };

  }

  const listings =
    await Listing.find(filter);

  if(!listings.length){

    return budget
      ? `No listings found in ${city} under ₹${budget}`
      : `No listings found in ${city}`;

  }

  let safestListing = null;

  let highestScore = -1;

  for(const listing of listings){

    let score = 0;

    // Main safety score
    score += (listing.safetyRating || 0) * 3;

    // Security Features
    if(listing.hasCCTV) score += 2;

    if(listing.security24x7) score += 2;

    if(listing.hasSecureLock) score += 1;

    if(listing.gatedProperty) score += 1;

    // Women-Friendly
    if(listing.isWomenOnly) score += 2;

    if(listing.femaleStaffAvailable) score += 1;

    if(listing.hostGender === "female") score += 1;

    // Emergency
    if(listing.emergencySupport) score += 2;

    if(listing.nearbyPoliceStation) score += 1;

    // Night Safety
    if(listing.lateNightCheckin) score += 1;

    if(listing.nightCabAvailability) score += 1;

    if(listing.wellLitArea) score += 1;

    if(score > highestScore){

      highestScore = score;

      safestListing = listing;

    }

  }

  return `
🏆 Safest Stay Found

🏡 ${safestListing.title}

📍 ${safestListing.location}

💰 ₹${safestListing.price}

⭐ Safety Rating: ${safestListing.safetyRating}

🔒 CCTV: ${safestListing.hasCCTV ? "Yes" : "No"}

🛡️ 24x7 Security: ${safestListing.security24x7 ? "Yes" : "No"}

🚨 Emergency Support: ${safestListing.emergencySupport ? "Yes" : "No"}

👩 Women Only: ${safestListing.isWomenOnly ? "Yes" : "No"}

🌙 Late Night Check-in:
${safestListing.lateNightCheckin ? "Yes" : "No"}

🏅 Safety Score:
${highestScore}
`;

}

module.exports = safetyTool;