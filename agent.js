

const ragStream = require("./queryStream");

const bookingTool = require("./tools/bookingTool");
const searchListings = require("./tools/listingTool");
const safetyTool = require("./tools/safetyTool");
const myBookingsTool = require("./tools/myBookingsTool");

const resolveBooking = require("./contextResolver");
const selectTool = require("./toolSelector");



// -----------------------------------------------------
// STREAMING AGENT
// -----------------------------------------------------



   async function askAgentStream(
    query,
    userId,
    history,
    onToken
){


    const tool =
    await selectTool(query);

    console.log("SELECTED TOOL:", tool);

    // ---------------- MONGODB ----------------

    if(tool === "MONGODB"){

        console.log("USING MONGODB TOOL");

        const cityMatch =
        query.match(/mumbai|delhi|pune|hyderabad/i);

        const city =
        cityMatch ? cityMatch[0] : "";

        const answer =
        await searchListings(city);

        if(onToken){

            onToken(answer);

        }

        return answer;

    }

    // ---------------- SAFETY ----------------

    if (tool === "SAFETY") {

    console.log("USING SAFETY TOOL");

    const cityMatch =
        query.match(/mumbai|delhi|pune|hyderabad/i); //i for case sensitive
        //citymatch return an array of matches, if no match return null

    const city =
        cityMatch ? cityMatch[0] : "";

    const budgetMatch =
        query.match(/\d+/); //\d+ matches one or more digits

    const budget =
        budgetMatch
            ? Number(budgetMatch[0])
            : null;

    const answer =
    await safetyTool(city, budget);
    if (onToken) {
        console.log("CALLING onToken()");
        onToken(answer);
    }

    console.log("RETURNING FROM SAFETY");

    return answer;
}

    // ---------------- BOOKING ----------------

    if(tool === "BOOKING"){

        console.log("USING BOOKING TOOL");

        const property =
        await resolveBooking(
            history,
            query
        );
        console.log("Resolved Property:");
console.log(property);

        const answer =
        await bookingTool(property);

        if(onToken){

            if(typeof answer === "string"){

                onToken(answer);

            }else{

                onToken(JSON.stringify(answer));

            }

        }

        return answer;

    }

    // ---------------- MY BOOKINGS ----------------

    if(tool === "MY_BOOKINGS"){

        console.log("USING MY BOOKINGS TOOL");

        const answer =
        await myBookingsTool(userId);

        if(onToken){

            onToken(answer);

        }

        return answer;

    }

    // ---------------- RAG STREAM ----------------

    return await ragStream(

        query,

        history,

        onToken

    );

}



module.exports = {

    

    askAgentStream

};