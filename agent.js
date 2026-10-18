const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const ragStream = require("./queryStream");
const bookingTool = require("./tools/bookingTool");
const searchListings = require("./tools/listingTool");
const safetyTool = require("./tools/safetyTool");
const myBookingsTool = require("./tools/myBookingsTool");
const resolveBooking = require("./contextResolver");
const selectTool = require("./toolSelector");

const MODEL = "openai/gpt-oss-20b";
const MAX_PLANNER_STEPS = 4;

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------

function extractCity(query) {
  const match = query.match(
    /\b(mumbai|delhi|pune|hyderabad)\b/i
  );

  return match ? match[0] : null;
}

function extractBudget(query) {
  const match = query.match(
    /(?:under|below|less than|budget of|within)\s*₹?\s*([\d,]+)/i
  );

  return match
    ? Number(match[1].replace(/,/g, ""))
    : null;
}
function stringifyResult(result) {
  return typeof result === "string"
    ? result
    : JSON.stringify(result);
}

// -----------------------------------------------------
// EXECUTE ONE EXISTING TOOL
// -----------------------------------------------------

async function executeTool(name, args, context) {
  const { query, userId, history, results } = context;

  switch (name) {
    case "MONGODB": {
  const city = args?.city || extractCity(query);
  const budget =
    args?.budget ??
    args?.maxPrice ??
    extractBudget(query);

  console.log("MONGODB INPUT:", { city, budget });

  return await searchListings(city, budget);
}
    case "SAFETY": {
  const city = args?.city || extractCity(query);
  const budget = args?.budget ?? extractBudget(query);

  if (!city) {
    return "Please specify a city for the safety search.";
  }

  return await safetyTool(city, budget);
}

    case "BOOKING": {
      // Do not initiate a booking based only on an
      // automatically selected property.
      const property = await resolveBooking(history, query);

      if (!property) {
        return "Please specify the property you want to book.";
      }

      // Your existing bookingTool returns a booking action,
      // not a completed database booking.
      return await bookingTool(property);
    }

    case "MY_BOOKINGS": {
      return await myBookingsTool(userId);
    }

    case "RAG": {
      // Collect RAG output without streaming intermediate
      // text to the user before the final answer.
      return await ragStream(query, history, () => {});
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// -----------------------------------------------------
// LLM PLANNER
// -----------------------------------------------------




async function planNextStep(query, results) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
You are the SheStay planning agent.

Available tools:
- MONGODB: Search listings.
- SAFETY: Find the safest listing in a city.
- RAG: Retrieve relevant document chunks.
- MY_BOOKINGS: Retrieve the user's bookings.
- BOOKING: Resolve a requested booking action.

Return ONLY JSON:
{
  "tools": [
    {
      "name": "MONGODB",
      "arguments": {"city": "Mumbai", "budget": 5000}
    }
  ],
  "done": false
}

When finished, return:
{"tools":[],"done":true}

Rules:
- Use previous results.
- Select only tools needed to answer the query.
- MONGODB arguments: city, budget.
- SAFETY arguments: city, budget.
- Never pass listingId or id to SAFETY.
- SAFETY accepts a city and optional budget.
- Do not repeat a tool with the same arguments.
- Return done=true when results are sufficient.
- Never invent results.
- Never claim a booking is confirmed.
- Output valid JSON only.
`
      },
      {
        role: "user",
        content: JSON.stringify({
          query,
          previousResults: results
        })
      }
    ]
  });

  const content = response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Planner returned empty content");
  }

  const plan = JSON.parse(content);

  const allowedTools = [
    "MONGODB",
    "SAFETY",
    "RAG",
    "MY_BOOKINGS",
    "BOOKING"
  ];

  if (
    !Array.isArray(plan.tools) ||
    typeof plan.done !== "boolean" ||
    plan.tools.some(
      tool =>
        !allowedTools.includes(tool.name) ||
        typeof tool.arguments !== "object" ||
        tool.arguments === null ||
        Array.isArray(tool.arguments)
    )
  ) {
    throw new Error("Invalid planner response");
  }

  console.log("PLANNER RESULT:", JSON.stringify(plan, null, 2));

  return plan;
}


// -----------------------------------------------------
// MULTI-TOOL PLANNER LOOP
// -----------------------------------------------------

async function generateFinalAnswer(query, toolResults, onToken) {
  const stream = await groq.chat.completions.create({
    model: MODEL,
    stream: true,
    messages: [
      {
        role: "system",
        content: `
You are SheStay AI, an accommodation assistant.

Answer the user's question naturally using the tool results.
Do not output raw JSON.
Present properties using readable names, locations, prices,
and safety ratings when available.
Respect the requested budget and do not recommend
properties that exceed it.
If no matching listings were found, say so clearly.
Never invent property details.
`
      },
      {
        role: "user",
        content: JSON.stringify({
          query,
          toolResults
        })
      }
    ]
  });

  let answer = "";

  for await (const chunk of stream) {
    const token = chunk.choices?.[0]?.delta?.content || "";

    if (token) {
      answer += token;
      if (onToken) onToken(token);
    }
  }

  return answer;
}



async function runPlanner(query, userId, history, onToken) {
  const results = [];
  const executed = new Set();

  for (let step = 0; step < MAX_PLANNER_STEPS; step++) {
    let plan;

    try {
      plan = await planNextStep(query, results);
    } catch (error) {
      console.error("Planner failed:", error.message);
      break;
    }

    console.log("PLANNER STEP:", step + 1, plan);

    if (plan.done || plan.tools.length === 0) {
      break;
    }

    let executedSomething = false;

    for (const selectedTool of plan.tools) {
      const { name, arguments: args = {} } = selectedTool;

      // Prevent executing the same tool with the same arguments.
      const key = `${name}:${JSON.stringify(args)}`;

      if (executed.has(key)) {
        console.log("Skipping duplicate tool:", key);
        continue;
      }

      executed.add(key);
      executedSomething = true;

      try {
        const result = await executeTool(name, args, {
          query,
          userId,
          history,
          results,
        });

        results.push({
          tool: name,
          arguments: args,
          result,
        });

        console.log(`${name} completed successfully.`);
      } catch (error) {
        console.error(`${name} failed:`, error.message);

        results.push({
          tool: name,
          arguments: args,
          error: error.message,
        });
      }
    }

    if (!executedSomething) {
      console.log("No new tools to execute. Ending planner.");
      break;
    }
  }

  // Generate the final response from collected results.
  const finalResponse = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    stream: true,
    messages: [
      {
        role: "system",
        content: `
You are SheStay's final response assistant.

Answer the user's original query using the tool results.
Combine results from multiple tools when appropriate.
Be clear and concise.
If a tool failed or data is missing, explain that honestly.
Never invent listings, safety scores, prices, or bookings.
Never claim a booking is confirmed unless it actually is.
Do not output raw JSON to the user.
Respect the user's budget and other filters.
Clearly distinguish database safety ratings from AI-derived safety scores.
Recommend a property as the safest only when the available evidence supports that conclusion.
Explicitly mention when CCTV, 24x7 security, or emergency-support details are unavailable.
`
      },
      {
        role: "user",
        content: JSON.stringify({
          query,
          toolResults: results,
        }),
      },
    ],
  });

  let fullAnswer = "";

  for await (const chunk of finalResponse) {
    const token = chunk.choices?.[0]?.delta?.content || "";

    if (token) {
      fullAnswer += token;

      if (onToken) {
        onToken(token);
      }
    }
  }

  return fullAnswer;
}

// -----------------------------------------------------
// MAIN AGENT
// -----------------------------------------------------

async function askAgentStream(
  query,
  userId,
  history = [],
  onToken
) {
  const route = await selectTool(query);

  console.log("INITIAL ROUTE:", route);

  // Complex query: run the multi-tool planner.
  if (route === "PLANNER") {
    return await runPlanner(
      query,
      userId,
      history,
      onToken
    );
  }

  // Simple query: execute the selected tool directly.
  if (route === "RAG") {
    return await ragStream(query, history, onToken);
  }

  let result;

  switch (route) {
    case "MONGODB": {
      const city = extractCity(query);

      result = city
        ? await searchListings(city)
        : "Please specify a city to search for stays.";

      break;
    }

    case "SAFETY": {
      const city = extractCity(query);
      const budget = extractBudget(query);

      result = city
        ? await safetyTool(city, budget)
        : "Please specify a city for the safety search.";

      break;
    }

    case "BOOKING": {
      const property = await resolveBooking(history, query);

      result = property
        ? await bookingTool(property)
        : "Please specify the property you want to book.";

      break;
    }

    case "MY_BOOKINGS": {
      result = await myBookingsTool(userId);
      break;
    }

    default:
      return await ragStream(query, history, onToken);
  }

  return await generateFinalAnswer(
  query,
  [{ tool: route, result }],
  onToken
);

  if (onToken) {
    onToken(output);
  }

  return output;
}

module.exports = {
  askAgentStream,
};
