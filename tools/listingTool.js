const Listing =
require("../models/listing");

async function searchListings(city){

  const listings =
    await Listing.find({
      location:{
        $regex:city, //pattern matching
        $options:"i" //lowercase and uppercase
      }
    });

  if(!listings.length){

    return `No listings found in ${city}`;

  }

  return listings.map(listing => (

    `🏡 ${listing.title}
📍 ${listing.location}
⭐ Safety Rating: ${listing.safetyRating}`

  )).join("\n\n");

}

module.exports =
searchListings;