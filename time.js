const { TZ } = require("./config");

function nowDateKey() {
  const d = new Date();
  // "YYYY-MM-DD" in South Africa time
  const yyyyMmDd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return yyyyMmDd;
}

function getMinutesNow() {
  const d = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d)
  );
  const minute = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, minute: "2-digit" }).format(d)
  );
  return hour * 60 + minute;
}

// Your current windows:
// AM: 05:00–15:00 (you widened this for testing)
// PM: 16:00–21:00
function getPeriodByWindow() {
  const hhmm = getMinutesNow();

  if (hhmm >= 5 * 60 && hhmm <= 15 * 60) return "AM";
  if (hhmm >= 17 * 60 && hhmm <= 21 * 60) return "PM";

  return null;
}

module.exports = { nowDateKey, getPeriodByWindow };
