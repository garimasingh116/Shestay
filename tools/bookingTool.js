const Listing = require("../models/listing");

async function bookingTool(userQuery){

  const cleanQuery =
    userQuery
      .replace(/book/gi, "")
      .replace(/reserve/gi, "")
      .trim();

  console.log("CLEAN QUERY:", cleanQuery);

  const listing =
    await Listing.findOne({
      title: {
        $regex: cleanQuery,
        $options: "i"
      }
    });

  console.log("MATCHED LISTING:", listing);

  if(!listing){

    return {
      success: false,
      message: "Property not found"
    };

  }

  return {

    success: true,

    action: "BOOK",

    listingId: listing._id.toString(),

    title: listing.title,

    price: listing.price

  };

}

module.exports = bookingTool;