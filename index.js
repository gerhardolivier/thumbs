const express = require("express");

const app = express();
app.use(express.json());

const TZ = process.env.TIMEZONE || "Africa/Johannesburg";
const ADMIN_NUMBER = process.env.ADMIN_NUMBER; // e.g. 2782xxxxxxx
const API_KEY = process.env.WASENDER_API_KEY;

// 1) Put your expected check-in numbers here (digits only, no +)
const EXPECTED = {
  27824171483: "You (test)", // replace with real roster
  // "2782....": "Sipho",
  // "2783....": "John",
};

// In-memory checkins: { "YYYY-MM-DD_AM": Set(["2782..."]) }
const checkins = {};

function nowParts() {
  const d = new Date();
  const yyyyMmDd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // "2026-01-06"

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      hour12: false,
    }).format(d)
  );

  const period = hour < 12 ? "AM" : "PM";
  return { yyyyMmDd, period };
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
async function sendText(toDigits, text) {
  if (!API_KEY) throw new Error("Missing WASENDER_API_KEY");
  const url = "https://api.wasenderapi.com/api/send-message";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      to: `${toDigits}@s.whatsapp.net`,
      text,
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
    const senderPn = msg?.key?.cleanedSenderPn; // "2782..."
    const text = (msg?.messageBody || "").trim();

    if (!senderPn) return res.sendStatus(200);

    // Only count expected roster
    if (!EXPECTED[senderPn]) return res.sendStatus(200);

    // Check-in trigger: 👍 (you can add "OK" too if needed)
    if (text === "👍") {
      const { period } = nowParts();
      markCheckin(senderPn, period);
      console.log(`CHECKIN ${period}: ${EXPECTED[senderPn]} (${senderPn})`);
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
    if (!ADMIN_NUMBER) return res.status(400).send("Set ADMIN_NUMBER");
    const period = req.params.period === "PM" ? "PM" : "AM";
    const s = buildSummary(period);

    const text =
      `${s.period} check-in: ${s.presentCount}/${s.total}\n` +
      `Missing: ${s.missingNames.length ? s.missingNames.join(", ") : "None"}`;

    const r = await sendText(ADMIN_NUMBER, text);
    res.send(`Sent:\n${text}\n\nAPI:\n${r}`);
  } catch (e) {
    res.status(500).send(String(e));
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Listening on", port));
