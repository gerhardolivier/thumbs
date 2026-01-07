// state.js
// Tracks who has checked in for the CURRENT shift.

let checkInStatus = {}; // { "jid": true/false }

function resetShift(rosterKeys) {
  checkInStatus = {};
  rosterKeys.forEach((jid) => {
    checkInStatus[jid] = false; // Default: Not checked in
  });
  console.log(
    "🔄 Shift Reset. Tracking:",
    Object.keys(checkInStatus).length,
    "users."
  );
}

function markSafe(jid) {
  // Returns true if the user was pending, false if already safe or unknown
  if (checkInStatus.hasOwnProperty(jid)) {
    const wasPending = checkInStatus[jid] === false;
    checkInStatus[jid] = true;
    return wasPending;
  }
  return false;
}

function getMissingUsers() {
  return Object.keys(checkInStatus).filter(
    (jid) => checkInStatus[jid] === false
  );
}

module.exports = { resetShift, markSafe, getMissingUsers };
