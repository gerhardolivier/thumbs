// Two-step help flow:
// 1) Ask YES/NO
// 2) If YES, ask for location/details (anything they send next)

const helpState = {}; // { senderJid: { step: "ASKED"|"WAITING_LOCATION", askedAt: ms } }

function setHelp(senderJid, step) {
  helpState[senderJid] = { step, askedAt: Date.now() };
}

function getHelp(senderJid) {
  return helpState[senderJid] || null;
}

function clearHelp(senderJid) {
  delete helpState[senderJid];
}

function norm(text) {
  return String(text || "").trim().toLowerCase();
}

function isYes(text) {
  const t = norm(text);
  return t === "yes" || t === "y" || t === "ja" || t === "j" || t === "yebo";
}

function isNo(text) {
  const t = norm(text);
  return t === "no" || t === "n" || t === "nee";
}

module.exports = { setHelp, getHelp, clearHelp, isYes, isNo };
