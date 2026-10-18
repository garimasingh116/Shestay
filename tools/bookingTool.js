
const Listing = require("../models/listing");

async function bookingTool({ listingId }) {
  if (!listingId) {
    return {
      success: false,
      message: "A listing ID is required."
    };
  }

  const listing = await Listing.findById(listingId).lean();

  if (!listing) {
    return {
      success: false,
      message: "Property not found."
    };
  }

  return {
    success: true,
    action: "BOOK",
    listing: {
      id: listing._id.toString(),
      title: listing.title,
      price: listing.price
    }
  };
}

module.exports = bookingTool;
