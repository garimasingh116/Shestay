
const ragTool =
require("./query");
const bookingTool =
require("./tools/bookingTool");

const searchListings =
require("./tools/listingTool");

const safetyTool =
require("./tools/safetyTool");

const selectTool =
require("./toolSelector");
const myBookingsTool =
require("./tools/myBookingsTool");
async function sheStayAgent(
  query,
  userId
){

  const tool =
    await selectTool(query,);

  console.log(
    "SELECTED TOOL:",
    tool
  );

  if(tool === "MONGODB"){

    const cityMatch =
      query.match(
        /mumbai|delhi|pune|hyderabad/i
      );

    const city =
      cityMatch
      ? cityMatch[0]
      : "";

    console.log(
      "USING MONGODB TOOL"
    );

    return await searchListings(city);

  }

  if(tool === "SAFETY"){

  console.log("USING SAFETY TOOL");

  const cityMatch =
    query.match(
      /mumbai|delhi|pune|hyderabad/i
    );

  const city =
    cityMatch
      ? cityMatch[0]
      : "";

  const budgetMatch =
    query.match(/\d+/);

  const budget =
    budgetMatch
      ? Number(budgetMatch[0])
      : null;

  return await safetyTool(
    city,
    budget
  );

}
if(tool === "BOOKING"){

  console.log(
    "USING BOOKING TOOL"
  );

  return await bookingTool(
    query
  );

}

if(tool === "MY_BOOKINGS"){

  console.log(
    "USING MY BOOKINGS TOOL"
  );

  return await myBookingsTool(
    userId
  );

}
  return await ragTool(query);

}

module.exports =
sheStayAgent;