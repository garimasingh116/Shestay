const Booking =
require("../models/booking");

async function myBookingsTool(userId){

  const bookings =
    await Booking.find({
      user: userId
    })
    .populate("listing");

  if(!bookings.length){

    return `
No bookings found.
`;
  }

  let result =
    "📖 Your Bookings\n\n";

  bookings.forEach((booking)=>{

    result +=
`
🏡 ${booking.listing.title}

💰 ₹${booking.amount}

✅ ${booking.status}

------------------

`;

  });

  return result;

}

module.exports =
myBookingsTool;