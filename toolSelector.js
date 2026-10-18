

const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function selectTool(userQuery) {
  const query = userQuery.toLowerCase().trim();

  // =====================================================
  // 1. COMPLEX QUERIES: USE THE MULTI-TOOL PLANNER
  // =====================================================

  const complexPatterns = [
    /\bcompare\b/,
    /\band then\b/,
    /\bafter that\b/,
    /\bboth\b/,
    /\bfind\b.*\band\b.*\b(safest|safety|secure|book|compare)\b/,
    /\b(show|find|list)\b.*\band\b.*\b(safest|safety|secure|rating)\b/,
    /\b(safest|safety|secure)\b.*\band\b.*\b(book|reserve|compare)\b/,
    /\b(book|reserve)\b.*\band\b.*\b(safest|safety|secure)\b/,
    /\bunder\b.*\band\b.*\b(safest|safety|secure)\b/,
  ];

  if (complexPatterns.some(pattern => pattern.test(query))) {
    console.log("RULE ROUTER: PLANNER");
    return "PLANNER";
  }

  // =====================================================
  // 2. MY BOOKINGS
  // =====================================================

  if (
    /\bmy bookings?\b/.test(query) ||
    /\bbooking history\b/.test(query) ||
    /\bmy reservations?\b/.test(query) ||
    /\bupcoming bookings?\b/.test(query) ||
    /\bwhat have i booked\b/.test(query) ||
    /\bwhat did i book\b/.test(query) ||
    /\bbooked properties\b/.test(query) ||
    /\bshow my bookings?\b/.test(query)
  ) {
    console.log("RULE ROUTER: MY_BOOKINGS");
    return "MY_BOOKINGS";
  }

  // =====================================================
  // 3. BOOKING
  // =====================================================

  if (
    /\bbook this\b/.test(query) ||
    /\bbook it\b/.test(query) ||
    /\bbook a\b/.test(query) ||
    /\bbook the\b/.test(query) ||
    /\breserve it\b/.test(query) ||
    /\breserve this\b/.test(query) ||
    /\bmake a reservation\b/.test(query) ||
    /\bconfirm my booking\b/.test(query) ||
    /\bi want to stay here\b/.test(query) ||
    /\bi want to book\b/.test(query) ||
    /\bi want to reserve\b/.test(query)
  ) {
    console.log("RULE ROUTER: BOOKING");
    return "BOOKING";
  }

  // =====================================================
  // 4. SAFETY
  // =====================================================

  if (
    /\bsafest\b/.test(query) ||
    /\bmost safe\b/.test(query) ||
    /\bmost secure\b/.test(query) ||
    /\bhighest safety\b/.test(query) ||
    /\bbest safety rating\b/.test(query) ||
    /\bsecurest\b/.test(query) ||
    /\bsafety rating\b/.test(query) ||
    /\bsafe accommodation\b/.test(query) ||
    /\bsafe stay\b/.test(query) ||
    /\bsecure accommodation\b/.test(query) ||
    /\bsecure stay\b/.test(query)
  ) {
    console.log("RULE ROUTER: SAFETY");
    return "SAFETY";
  }

  // =====================================================
  // 5. MONGODB
  // =====================================================

  if (
    /\bshow\b/.test(query) ||
    /\blist\b/.test(query) ||
    /\bfind\b/.test(query) ||
    /\bstays?\b/.test(query) ||
    /\bproperties\b/.test(query) ||
    /\bproperty\b/.test(query) ||
    /\baccommodations?\b/.test(query) ||
    /\bhotels?\b/.test(query) ||
    /\bvillas?\b/.test(query) ||
    /\blistings?\b/.test(query) ||
    /\bhow many\b/.test(query) ||
    /\bcount\b/.test(query) ||
    /\bavailable properties\b/.test(query)
  ) {
    console.log("RULE ROUTER: MONGODB");
    return "MONGODB";
  }

  // =====================================================
  // 6. LLM FALLBACK
  // =====================================================

  try {
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
You are the initial routing agent for SheStay.

Choose exactly ONE route.

Available routes:

MONGODB:
Search, list, filter, or count accommodation listings.

SAFETY:
Find or rank accommodations specifically by safety.

BOOKING:
The user wants to initiate a booking.

MY_BOOKINGS:
Retrieve the current user's existing bookings.

RAG:
General questions, explanations, travel advice,
amenities, and questions answerable using retrieved knowledge.

PLANNER:
The query requires multiple tools or multiple dependent steps.
Examples:
- Find stays and compare their safety.
- Find a property, then evaluate its safety.
- Compare accommodations using listing and safety data.
- Find the safest stay under a budget.
- Find options and then help initiate a booking.

Rules:
- Return only one route name.
- Do not explain your choice.
- If multiple tools are needed, return PLANNER.
- Do not return PLANNER for a simple query.
- Never assume a booking has been confirmed.

Valid outputs:
MONGODB
SAFETY
BOOKING
MY_BOOKINGS
RAG
PLANNER
`
        },
        {
          role: "user",
          content: userQuery
        }
      ]
    });

    const route = response.choices[0].message.content
      .trim()
      .replace(/^["'\s]+|["'\s]+$/g, "")
      .toUpperCase();

    const validRoutes = [
      "MONGODB",
      "SAFETY",
      "BOOKING",
      "MY_BOOKINGS",
      "RAG",
      "PLANNER"
    ];

    if (validRoutes.includes(route)) {
      console.log("LLM ROUTER RESULT:", route);
      return route;
    }

    console.warn("Unexpected router output:", route);
    return "RAG";

  } catch (error) {
    console.error("Tool selector error:", error.message);
    return "RAG";
  }
}

module.exports = selectTool;
