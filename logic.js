const { EXPECTED } = require("./roster");
const { enqueue } = require("./queue");
const {
  startRound,
  endRound,
  getWindowStatus,
  markSafe,
  getMissingUsers,
} = require("./state");

const ALERT_GROUP_ID = process.env.ALERT_GROUP_JID;

// --- TRIGGERED AT 7:00 AM / 7:00 PM ---
async function startCheckInRound() {
  const { sendBaileysText } = require("./socket");
  console.log("⏰ STARTING CHECK-IN ROUND");

  const userJids = Object.keys(EXPECTED);
  startRound(userJids); // Open Window

  for (const jid of userJids) {
    const name = EXPECTED[jid];
    await enqueue(
      jid,
      `👋 Hi ${name}, check-in time.\nReply with 👍 to confirm you are safe.`
    );
  }

  // 5-Minute Reminder
  setTimeout(async () => {
    const { sendBaileysText } = require("./socket");
    const missing = getMissingUsers();
    for (const jid of missing) {
      await enqueue(
        jid,
        "⚠️ Reminder: You haven't checked in.\nPlease reply with 👍 now."
      );
    }
  }, 5 * 60 * 1000);

  // 10-Minute Alert & Close
  setTimeout(async () => {
    const { sendBaileysText } = require("./socket");
    const missing = getMissingUsers();

    if (missing.length > 0) {
      const missingNames = missing
        .map((jid) => `- ${EXPECTED[jid] || jid}`)
        .join("\n");
      const alertMsg = `🚨 *MISSED CHECK-IN* 🚨\n\nUsers missing:\n${missingNames}\n\nPlease check on them.`;
      try {
        await sendBaileysText(ALERT_GROUP_ID, alertMsg);
      } catch (e) {}
    }
    endRound(); // Close Window
  }, 10 * 60 * 1000);
}

// --- INCOMING MESSAGE HANDLER ---
async function handleDirectMessage({ senderJid, text }) {
  const { sendBaileysText } = require("./socket");
  const cleanText = text.trim().toUpperCase();

  // ADMIN FORCE
  if (cleanText === "!FORCE") {
    await enqueue(senderJid, "🛠️ Forcing check-in round...");
    startCheckInRound();
    return;
  }

  // DEBUG ID
  if (cleanText === "!MYID") {
    await enqueue(senderJid, `ID: ${senderJid}`);
    return;
  }

  // Resolve JID
  let realJid = senderJid;
  if (
    !EXPECTED[realJid] &&
    EXPECTED[realJid.replace("@lid", "@s.whatsapp.net")]
  ) {
    realJid = realJid.replace("@lid", "@s.whatsapp.net");
  }
  const name = EXPECTED[realJid] || "Unknown";

  // --- SAFETY LOGIC ---

  // 1. GLOBAL SOS (Always Active)
  if (
    ["HELP", "SOS", "DANGER", "EMERGENCY"].some((w) => cleanText.includes(w))
  ) {
    await sendBaileysText(
      ALERT_GROUP_ID,
      `🆘 *EMERGENCY*: ${name} needs HELP!`
    );
    await enqueue(senderJid, "🚨 Help notified.");
    return;
  }

  // 2. CHECK-IN WINDOW ACTIVE?
  if (getWindowStatus() === true) {
    // EXPANDED DICTIONARY: Covers Emojis, Text, and our 'Sticker' trick
    const safeWords = [
      "👍",
      "YES",
      "Y",
      "SAFE",
      "OK",
      "CHECK",
      "✅",
      "\uD83D\uDC4D",
    ];

    // Fuzzy Match: If text contains ANY safe word OR is a Sticker/Image (which we set to "👍")
    if (safeWords.some((w) => cleanText.includes(w))) {
      const wasPending = markSafe(realJid);
      if (wasPending) {
        await enqueue(senderJid, "✅ Checked in. Have a good shift!");
        console.log(`[SAFE] ${name} checked in.`);
      }
      return;
    }

    // ⚠️ FALLBACK: If they typed something we didn't understand
    await enqueue(
      senderJid,
      "❓ I didn't catch that.\nPlease reply with *YES* or 👍 to check in."
    );
    return;
  }

  // 3. OUTSIDE WINDOW
  if (getWindowStatus() === false) {
    if (["NO", "NAH"].some((w) => cleanText === w)) return; // Ignore "No"
    await enqueue(
      senderJid,
      "You are outside the check-in window.\nReply *HELP* if you are in danger."
    );
  }
}

module.exports = { startCheckInRound, handleDirectMessage };
