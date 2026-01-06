const { nowDateKey } = require("./time");

// In-memory stores (reset on restart). Good enough for now.
const checkins = {}; // { "YYYY-MM-DD_AM": Set([senderJid]) }

function keyFor(period) {
  return `${nowDateKey()}_${period}`;
}

function markCheckin(senderJid, period) {
  const k = keyFor(period);
  if (!checkins[k]) checkins[k] = new Set();
  checkins[k].add(senderJid);
}

function buildSummary(period, expectedMap) {
  const k = keyFor(period);
  const present = checkins[k] || new Set();
  const all = Object.keys(expectedMap);
  const missing = all.filter((jid) => !present.has(jid)).map((jid) => expectedMap[jid]);

  return {
    period,
    presentCount: present.size,
    total: all.length,
    missingNames: missing,
  };
}

module.exports = { markCheckin, buildSummary };
