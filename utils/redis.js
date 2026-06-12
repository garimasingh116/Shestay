require ("dotenv").config();
const { createClient } = require("redis");

let redisClient = null;

if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.on("error", (err) => {
    console.log("Redis Error:", err);
  });

  redisClient.connect()
    .then(() => console.log("Redis Connected"))
    .catch((err) => console.error("Redis Connection Failed:", err));
}

module.exports = redisClient;