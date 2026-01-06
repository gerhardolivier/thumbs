const express = require("express");
const cron = require("node-cron");
const { TZ, ADMIN_JID } = require("./config");
const { startSock } = require("./socket"); // Import the starter
const { enqueue } = require("./queue");
const { summaryText } = require("./logic");

const app = express();

// Health check for Railway
app.get("/", (req, res) => res.send("Bot is running directly on Railway!"));

// Start the WhatsApp Connection
startSock();

// Cron Summaries (Same as before)
async function sendAdminSummary(period) {
  if (!ADMIN_JID) return;
  await enqueue(ADMIN_JID, summaryText(period));
}

cron.schedule("5 7 * * *", () => sendAdminSummary("AM"), { timezone: TZ });
cron.schedule("5 19 * * *", () => sendAdminSummary("PM"), { timezone: TZ });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server listening on", port));
