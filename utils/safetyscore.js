function calculateSafetyScore(listing) {

    let score = 0;

    if (listing.hasCCTV) score += 15;

    if (listing.security24x7) score += 20;

    if (listing.gatedProperty) score += 15;

    if (listing.emergencySupport) score += 15;

    if (listing.wellLitArea) score += 10;

    if (listing.nearbyPoliceStation) score += 10;

    if (listing.lateNightCheckin) score += 5;

    if (listing.hostGender === "female") score += 5;

    if (listing.isWomenOnly) score += 5;

    return score;
}

module.exports = calculateSafetyScore;