const express = require("express");

const app = express();
app.use(express.json());

const TZ = process.env.TIMEZONE || "Africa/Johannesburg";
const ADMIN_NUMBER = process.env.ADMIN_NUMBER; // e.g. 2782xxxxxxx
const API_KEY = process.env.WASENDER_API_KEY;

const cron = require("node-cron");

function summaryText(period) {
  const s = buildSummary(period);
  return `${period} check-in: ${s.presentCount}/${s.total}\nMissing: ${
    s.missingNames.length ? s.missingNames.join(", ") : "None"
  }`;
}

async function sendAdminSummary(period) {
  const ADMIN_JID = process.env.ADMIN_JID;
  if (!ADMIN_JID) return;
  await sendText(ADMIN_JID, summaryText(period));
}

cron.schedule("5 7 * * *", () => sendAdminSummary("AM"), { timezone: TZ });
cron.schedule("5 19 * * *", () => sendAdminSummary("PM"), { timezone: TZ });

// 1) Put your expected check-in numbers here (digits only, no +)
const EXPECTED = {
  "27824171483@s.whatsapp.net": "Gerhard (test)",
  "27832369302@s.whatsapp.net": "C",
  "27833583885@s.whatsapp.net": "AHO",
};

// In-memory checkins: { "YYYY-MM-DD_AM": Set(["2782..."]) }
const checkins = {};

function isThumbsUp(text) {
  if (!text) return false;

  // Remove whitespace + invisible variation selectors
  const t = String(text)
    .trim()
    .replace(/\uFE0F/g, "") // variation selector
    .replace(/\u200D/g, ""); // zero-width joiner

  // Match thumbs up + skin-tone variants
  return t.includes("👍");
}

function getPeriodByWindow() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );
  const minute = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      minute: "2-digit",
    }).format(new Date())
  );

  const hhmm = hour * 60 + minute;

  // AM window: 05:00–10:00 (adjust if you want)
  if (hhmm >= 5 * 60 && hhmm <= 10 * 60) return "AM";

  // PM window: 16:00–21:00
  if (hhmm >= 16 * 60 && hhmm <= 21 * 60) return "PM";

  return null; // outside check-in windows
}

function keyFor(period) {
  const { yyyyMmDd } = nowParts();
  return `${yyyyMmDd}_${period}`;
}

function markCheckin(senderPn, period) {
  const k = keyFor(period);
  if (!checkins[k]) checkins[k] = new Set();
  checkins[k].add(senderPn);
}

function buildSummary(period) {
  const k = keyFor(period);
  const present = checkins[k] || new Set();
  const all = Object.keys(EXPECTED);
  const missing = all.filter((n) => !present.has(n)).map((n) => EXPECTED[n]);

  return {
    period,
    presentCount: present.size,
    total: all.length,
    missingNames: missing,
  };
}

// ---- Wasender send message (endpoint may differ per account; adjust if needed)
async function sendText(toJid, text) {
  if (!API_KEY) throw new Error("Missing WASENDER_API_KEY");

  const url = "https://api.wasenderapi.com/api/send-message";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      to: toJid, // e.g. "27824171483@s.whatsapp.net"
      text: text,
    }),
  });

  const body = await res.text();
  if (!res.ok) throw new Error(body);
  return body;
}

// Health
app.get("/", (req, res) => res.send("ok"));
app.get("/wa-webhook", (req, res) => res.send("webhook ok (GET)"));

// Webhook
app.post("/wa-webhook", async (req, res) => {
  try {
    const payload = req.body;

    // Expected structure from your sample
    const msg = payload?.data?.messages;
    const senderJid = msg?.key?.senderPn; // "2782...@s.whatsapp.net"
    const text = (msg?.messageBody || "").trim();

    if (senderJid && EXPECTED[senderJid]) {
      console.log("TEXT RAW:", JSON.stringify(text));
    }

    if (!senderJid) return res.sendStatus(200);
    if (!EXPECTED[senderJid]) return res.sendStatus(200);

    if (isThumbsUp(text)) {
      const period = getPeriodByWindow();
      if (!period) return res.sendStatus(200); // ignore thumbs outside windows
      markCheckin(senderJid, period);
      console.log(`CHECKIN ${period}: ${EXPECTED[senderJid]} (${senderJid})`);
    }

    return res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e);
    return res.sendStatus(200);
  }
});

// Manual test: send summary to admin right now
app.get("/send-summary/:period", async (req, res) => {
  try {
    const ADMIN_JID = process.env.ADMIN_JID;
    if (!ADMIN_JID) return res.status(400).send("Set ADMIN_JID");

    const period = req.params.period === "PM" ? "PM" : "AM";
    const s = buildSummary(period);

    const text =
      `${s.period} check-in: ${s.presentCount}/${s.total}\n` +
      `Missing: ${s.missingNames.length ? s.missingNames.join(", ") : "None"}`;

    const r = await sendText(ADMIN_JID, text);
    res.send(`Sent:\n${text}\n\nAPI:\n${r}`);
  } catch (e) {
    res.status(500).send(String(e));
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Listening on", port));
