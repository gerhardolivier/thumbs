const { EXPECTED } = require("./roster");
const { ALERT_GROUP_JID } = require("./config");
const { getPeriodByWindow } = require("./time");
const { markCheckin, buildSummary } = require("./store");
const { enqueue } = require("./queue");
const { setHelp, getHelp, clearHelp, isYes, isNo } = require("./helpFlow");

function isThumbsUp(text) {
  if (!text) return false;
  const t = String(text)
    .trim()
    .replace(/\uFE0F/g, "") // variation selector
    .replace(/\u200D/g, ""); // zero-width joiner
  return t.includes("👍");
}

function summaryText(period) {
  const s = buildSummary(period, EXPECTED);
  return `${period} check-in: ${s.presentCount}/${s.total}\nMissing: ${
    s.missingNames.length ? s.missingNames.join(", ") : "None"
  }`;
}

async function postHelpToGroup(text) {
  if (!ALERT_GROUP_JID) return;
  await enqueue(ALERT_GROUP_JID, text);
}

// Main handler for an incoming *direct message* from a roster member
async function handleDirectMessage({ senderJid, text }) {
  const name = EXPECTED[senderJid];
  if (!name) return { action: "ignored:not-in-roster" };

  // 1. Help flow continuation? (PRIORITY 1)
  // If they are already in a help conversation, handle that first.
  const hs = getHelp(senderJid);
  if (hs && hs.step === "ASKED") {
    if (isYes(text)) {
      setHelp(senderJid, "WAITING_LOCATION");
      await enqueue(senderJid, "___LOCATION_REQUEST___");
      return { action: "help:asked-location" };
    }

    if (isNo(text)) {
      clearHelp(senderJid);
      await enqueue(senderJid, "Ok.");
      return { action: "help:cleared" };
    }

    await enqueue(senderJid, "Please reply YES or NO.");
    return { action: "help:clarify-yes-no" };
  }

  if (hs && hs.step === "WAITING_LOCATION") {
    // Anything they send now becomes location/details
    clearHelp(senderJid);

    await enqueue(senderJid, "Got it. Stay safe. Help has been alerted.");

    // Post to group
    await postHelpToGroup(
      `HELP NEEDED: ${name}\nDetails/location: ${text}\nPlease contact them now.`
    );

    return { action: "help:posted" };
  }

  // 2. Check Time Window (PRIORITY 2)
  const period = getPeriodByWindow();

  // If OUTSIDE the window, ANY message triggers the safety check.
  if (!period) {
    setHelp(senderJid, "ASKED");
    await enqueue(
      senderJid,
      "You messaged outside check-in time. Do you need help? Reply YES or NO."
    );
    return { action: "help:asked" };
  }

  // 3. If INSIDE the window, only 👍 marks a check-in.
  if (isThumbsUp(text)) {
    markCheckin(senderJid, period);
    return { action: "checkin:marked", period };
  }

  // Inside window, but not a thumbs up? Ignore.
  return { action: "ignored:non-checkin" };
}

module.exports = { EXPECTED, summaryText, handleDirectMessage };
