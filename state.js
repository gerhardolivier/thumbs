// state.js
let checkInStatus = {}; // { "jid": true/false }
let isRoundActive = false; // The Master Switch

function startRound(rosterKeys) {
  isRoundActive = true;
  checkInStatus = {};
  rosterKeys.forEach((jid) => {
    checkInStatus[jid] = false;
  });
  console.log("🟢 Check-in Window OPEN");
}

function endRound() {
  isRoundActive = false;
  console.log("🔴 Check-in Window CLOSED");
}

function getWindowStatus() {
  return isRoundActive;
}

function markSafe(jid) {
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

module.exports = {
  startRound,
  endRound,
  getWindowStatus,
  markSafe,
  getMissingUsers,
};
