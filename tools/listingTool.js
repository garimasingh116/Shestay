
const Listing = require("../models/listing");

async function searchListings(city, budget = null) {
  const filter = {
    location: { $regex: city, $options: "i" }
  };

  if (budget != null) {
    filter.price = { $lte: budget };
  }

  console.log("LISTING FILTER:", filter);

  const listings = await Listing.find(filter).lean();

  if (!listings.length) {
    return `No listings found in ${city}${
      budget != null ? ` under ₹${budget}` : ""
    }`;
  }

  return listings.map(listing => ({
    id: listing._id.toString(),
    title: listing.title,
    location: listing.location,
    price: listing.price,
    safetyRating: listing.safetyRating
  }));
}

module.exports = searchListings;