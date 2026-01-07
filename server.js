const express = require("express");
const cron = require("node-cron");
const { startSock } = require("./socket");
const { startCheckInRound } = require("./logic"); // Import the new logic function

const app = express();
const port = process.env.PORT || 8080;

// Health Check for Railway
app.get("/", (req, res) => {
  res.send("Bot is Running 🤖");
});

// Start WhatsApp Connection
startSock().catch((err) => console.error("Failed to start WhatsApp:", err));

// --- SCHEDULE ---
// 07:00 and 19:00 (7 PM)
cron.schedule(
  "0 7,19 * * *",
  () => {
    console.log("⏰ CRON TRIGGERED: Starting Check-In Round");
    startCheckInRound();
  },
  {
    timezone: "Africa/Johannesburg",
  }
);

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
