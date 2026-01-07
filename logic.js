const { EXPECTED } = require("./roster");
const { enqueue } = require("./queue");
const {
  startRound,
  endRound,
  getWindowStatus,
  markSafe,
  getMissingUsers,
} = require("./state");

// LOAD GROUP ID
const ALERT_GROUP_ID = process.env.ALERT_GROUP_JID;

if (!ALERT_GROUP_ID) {
  console.error(
    "⚠️ FATAL ERROR: ALERT_GROUP_JID is missing! Add it to Railway Variables."
  );
}

// --- TRIGGERED AT 7:00 AM / 7:00 PM ---
async function startCheckInRound() {
  const { sendBaileysText } = require("./socket");

  console.log("⏰ STARTING CHECK-IN ROUND (Window Open)");

  // 1. Open the Window
  const userJids = Object.keys(EXPECTED);
  startRound(userJids);

  // 2. Send Initial Messages
  for (const jid of userJids) {
    const name = EXPECTED[jid];
    // Asking specifically for the Thumbs Up emoji
    await enqueue(
      jid,
      `👋 Hi ${name}, check-in time.\nReply with 👍 to confirm you are safe.`
    );
  }

  // 3. Reminder at 5 Minutes
  setTimeout(async () => {
    const { sendBaileysText } = require("./socket");
    console.log("⏳ 5-Minute Reminder...");
    const missing = getMissingUsers();

    for (const jid of missing) {
      await enqueue(
        jid,
        "⚠️ Reminder: You haven't checked in.\nPlease reply with 👍 now."
      );
    }
  }, 5 * 60 * 1000);

  // 4. Report & Close at 10 Minutes
  setTimeout(async () => {
    const { sendBaileysText } = require("./socket");
    console.log("🚨 10-Minute Report & Closing Window...");

    const missing = getMissingUsers();

    // A. Send Report to Admin Group
    if (missing.length > 0) {
      const missingNames = missing
        .map((jid) => `- ${EXPECTED[jid] || jid}`)
        .join("\n");
      const alertMsg = `🚨 *MISSED CHECK-IN* 🚨\n\nThe following users did not reply with 👍:\n\n${missingNames}\n\nPlease check on them.`;

      try {
        await sendBaileysText(ALERT_GROUP_ID, alertMsg);
      } catch (err) {
        console.error("Failed to alert group:", err);
      }
    } else {
      console.log("✅ All users checked in safe.");
    }

    // B. Close the Window
    endRound();
  }, 10 * 60 * 1000);
}

// --- INCOMING MESSAGE HANDLER ---
async function handleDirectMessage({ senderJid, text }) {
  const { sendBaileysText } = require("./socket");

  const cleanText = text.trim().toUpperCase();

  // 🛠️ ADMIN FORCE COMMAND
  if (cleanText === "!FORCE") {
    await enqueue(senderJid, "🛠️ Admin: Forcing check-in round...");
    startCheckInRound();
    return;
  }

  // Fix JID
  let realJid = senderJid;
  if (
    !EXPECTED[realJid] &&
    EXPECTED[realJid.replace("@lid", "@s.whatsapp.net")]
  ) {
    realJid = realJid.replace("@lid", "@s.whatsapp.net");
  }
  const name = EXPECTED[realJid] || "Unknown";

  // --- LOGIC SPLIT ---

  // SCENARIO 1: CHECK-IN WINDOW IS ACTIVE (7:00 - 7:10)
  if (getWindowStatus() === true) {
    // Accept Thumbs Up (or Yes)
    if (["👍", "YES", "Y", "SAFE"].some((w) => cleanText.includes(w))) {
      const wasPending = markSafe(realJid);
      if (wasPending) {
        await enqueue(senderJid, "✅ Checked in. Have a good shift!");
        console.log(`[SAFE] ${name} checked in.`);
      }
      return;
    }
  }

  // SCENARIO 2: OUTSIDE OF WINDOW (OR EMERGENCY MSG)
  // If they say HELP/SOS at ANY time, we alert.
  if (
    ["HELP", "SOS", "DANGER", "EMERGENCY"].some((w) => cleanText.includes(w))
  ) {
    await sendBaileysText(
      ALERT_GROUP_ID,
      `🆘 *EMERGENCY ALERT* 🆘\n\nUser: ${name}\nReported DANGER.`
    );
    await enqueue(senderJid, "🚨 Help has been notified.");
    return;
  }

  // If they text normally outside of window, we ask if they are okay.
  if (getWindowStatus() === false) {
    // Ignore "NO" replies to "Do you need help?" to prevent loops
    if (["NO", "NAH", "I'M GOOD", "FALSE"].some((w) => cleanText === w)) {
      await enqueue(senderJid, "👍 Okay.");
      return;
    }

    await enqueue(
      senderJid,
      "You have messaged outside the check-in window.\n\n⚠️ *DO YOU NEED HELP?*\nReply *HELP* if you are in danger, or *NO* if you are okay."
    );
  }
}

module.exports = { startCheckInRound, handleDirectMessage };
