const express = require("express");
const cron = require("node-cron");

const { TZ, ADMIN_JID, ALERT_GROUP_JID } = require("./config");
const { parseMessage } = require("./parseMessage");
const { enqueue } = require("./queue");
const { EXPECTED, summaryText, handleDirectMessage } = require("./logic");

const app = express();
app.use(express.json());

// Health
app.get("/", (req, res) => res.send("ok"));
app.get("/wa-webhook", (req, res) => res.send("webhook ok (GET)"));

// Webhook endpoint (Wasender -> Railway)
app.post("/wa-webhook", async (req, res) => {
  try {
    const payload = req.body;
    const m = parseMessage(payload);

    console.log("EVENT:", payload && payload.event);

    if (!m.ok) return res.sendStatus(200);

    // Ignore group messages for check-ins/help (we only act on DMs),
    // but we still want logs sometimes for debugging.
    const isGroup = m.remoteJid && String(m.remoteJid).endsWith("@g.us");

    // If you want to see group JIDs in logs:
    if (isGroup) {
      console.log("GROUP MSG remoteJid:", m.remoteJid);
      return res.sendStatus(200);
    }

    // Must have senderJid for DMs
    if (!m.senderJid) return res.sendStatus(200);

    // Optional debug
    if (EXPECTED[m.senderJid]) console.log("TEXT RAW:", JSON.stringify(m.text));

    await handleDirectMessage({ senderJid: m.senderJid, text: m.text });
    return res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e);
    return res.sendStatus(200);
  }
});

// Manual test: send summary to admin right now
app.get("/send-summary/:period", async (req, res) => {
  try {
    if (!ADMIN_JID) return res.status(400).send("Set ADMIN_JID");
    const period = req.params.period === "PM" ? "PM" : "AM";
    const text = summaryText(period);
    const r = await enqueue(ADMIN_JID, text);
    res.send(`Sent:\n${text}\n\nAPI:\n${r}`);
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// Test posting to group
app.get("/test-group", async (req, res) => {
  try {
    if (!ALERT_GROUP_JID) return res.status(400).send("Set ALERT_GROUP_JID");
    await enqueue(ALERT_GROUP_JID, "Bot test message to group ✅");
    res.send("sent");
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// Cron summaries: 07:05 and 19:05 SA time
async function sendAdminSummary(period) {
  if (!ADMIN_JID) return;
  await enqueue(ADMIN_JID, summaryText(period));
}

cron.schedule("5 7 * * *", () => sendAdminSummary("AM"), { timezone: TZ });
cron.schedule("5 19 * * *", () => sendAdminSummary("PM"), { timezone: TZ });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Listening on", port));
