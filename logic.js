// logic.js
const { EXPECTED } = require("./roster");
const { enqueue } = require("./queue");
const { sendBaileysText } = require("./socket");
const { resetShift, markSafe, getMissingUsers } = require("./state");

// LOAD GROUP ID FROM ENVIRONMENT VARIABLES
const ALERT_GROUP_ID = process.env.ALERT_GROUP_JID;

if (!ALERT_GROUP_ID) {
  console.error(
    "⚠️ FATAL ERROR: ALERT_GROUP_JID is missing in Railway Variables!"
  );
}

// --- TRIGGERED BY SERVER.JS (THE CLOCK) ---
async function startCheckInRound() {
  console.log("⏰ STARTING CHECK-IN ROUND");

  // 1. Reset Memory
  const userJids = Object.keys(EXPECTED);
  resetShift(userJids);

  // 2. Send Initial Messages
  for (const jid of userJids) {
    const name = EXPECTED[jid];
    await enqueue(
      jid,
      `👋 Hi ${name}, check-in time.\nReply *YES* to confirm you are safe.`
    );
  }

  // 3. Schedule Reminder (5 Minutes)
  setTimeout(async () => {
    console.log("⏳ Running 5-minute reminder check...");
    const missing = getMissingUsers();

    for (const jid of missing) {
      await enqueue(
        jid,
        "⚠️ Check-in Reminder: Please reply *YES* immediately."
      );
    }
  }, 5 * 60 * 1000); // 5 minutes

  // 4. Schedule Alert (10 Minutes)
  setTimeout(async () => {
    console.log("🚨 Running 10-minute final check...");
    const missing = getMissingUsers();

    if (missing.length > 0) {
      // Create list of missing names
      const missingNames = missing
        .map((jid) => `- ${EXPECTED[jid] || jid}`)
        .join("\n");
      const alertMsg = `🚨 *MISSED CHECK-IN REPORT* 🚨\n\nUsers not accounted for:\n${missingNames}\n\nPlease contact them.`;

      try {
        await sendBaileysText(ALERT_GROUP_ID, alertMsg);
      } catch (err) {
        console.error("Failed to alert group:", err);
      }
    } else {
      console.log("✅ Shift check complete. All safe.");
    }
  }, 10 * 60 * 1000); // 10 minutes
}

// --- TRIGGERED BY SOCKET.JS (INCOMING MESSAGES) ---
async function handleDirectMessage({ senderJid, text }) {
  const cleanText = text.trim().toUpperCase();

  // 🛠️ SECRET ADMIN TRIGGER
  // If you send "!FORCE", the bot starts the round instantly.
  if (cleanText === "!FORCE") {
    await enqueue(senderJid, "🛠️ Admin: Forcing a check-in round now...");
    startCheckInRound(); // <--- Manually triggers the function
    return;
  }

  // Normalize JID (Fix @lid issues)
  let realJid = senderJid;
  if (
    !EXPECTED[realJid] &&
    EXPECTED[realJid.replace("@lid", "@s.whatsapp.net")]
  ) {
    realJid = realJid.replace("@lid", "@s.whatsapp.net");
  }

  // 1. Check for YES (Safe)
  if (["YES", "Y", "SAFE", "OK", "👍"].some((w) => cleanText.includes(w))) {
    const wasPending = markSafe(realJid);

    if (wasPending) {
      await enqueue(senderJid, "✅ You are marked as SAFE. Have a good shift.");
      console.log(`[SAFE] ${EXPECTED[realJid]} confirmed.`);
    } else {
      await enqueue(senderJid, "👍 Confirmed.");
    }
    return;
  }

  // 2. Check for NO (Danger)
  if (["NO", "HELP", "SOS", "DANGER"].some((w) => cleanText.includes(w))) {
    const name = EXPECTED[realJid] || realJid;
    await sendBaileysText(
      ALERT_GROUP_ID,
      `🆘 *EMERGENCY*: ${name} reported DANGER!`
    );
    await enqueue(senderJid, "🚨 Alert sent to Admin Group.");
  }
}

module.exports = { startCheckInRound, handleDirectMessage };
