const { EXPECTED } = require("./roster");
const { ALERT_GROUP_JID } = require("./config");
const { getPeriodByWindow } = require("./time");
const { markCheckin, buildSummary } = require("./store");
const { sendText } = require("./wasender");
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
  await sendText(ALERT_GROUP_JID, text);
}

// Main handler for an incoming *direct message* from a roster member
async function handleDirectMessage({ senderJid, text }) {
  const name = EXPECTED[senderJid];
  if (!name) return { action: "ignored:not-in-roster" };

  // Help flow continuation?
  const hs = getHelp(senderJid);
  if (hs && hs.step === "ASKED") {
    if (isYes(text)) {
      setHelp(senderJid, "WAITING_LOCATION");
      await sendText(
        senderJid,
        "OK. Send your location now.\nWhatsApp: 📎 → Location → Send current location.\nIf you can’t, reply with nearest landmark."
      );
      return { action: "help:asked-location" };
    }

    if (isNo(text)) {
      clearHelp(senderJid);
      await sendText(senderJid, "Ok.");
      return { action: "help:cleared" };
    }

    await sendText(senderJid, "Please reply YES or NO.");
    return { action: "help:clarify-yes-no" };
  }

  if (hs && hs.step === "WAITING_LOCATION") {
    // Anything they send now becomes location/details
    clearHelp(senderJid);

    await sendText(senderJid, "Got it. Stay safe. Help has been alerted.");

    // Post to group
    await postHelpToGroup(
      `HELP NEEDED: ${name}\nDetails/location: ${text}\nPlease contact them now.`
    );

    return { action: "help:posted" };
  }

  // Normal thumbs up handling
  if (isThumbsUp(text)) {
    const period = getPeriodByWindow();

    if (!period) {
      // Outside window: start help flow
      setHelp(senderJid, "ASKED");
      await sendText(senderJid, "You sent 👍 outside check-in time. Do you need help? Reply YES or NO.");
      return { action: "help:asked" };
    }

    markCheckin(senderJid, period);
    return { action: "checkin:marked", period };
  }

  return { action: "ignored:non-checkin" };
}

module.exports = { EXPECTED, summaryText, handleDirectMessage };
