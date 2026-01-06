const TZ = process.env.TIMEZONE || "Africa/Johannesburg";
const API_KEY = process.env.WASENDER_API_KEY;
const ADMIN_JID = process.env.ADMIN_JID; // e.g. "2782...@s.whatsapp.net"
const ALERT_GROUP_JID = process.env.ALERT_GROUP_JID; // e.g. "1203...@g.us" or your discovered group jid

module.exports = {
  TZ,
  API_KEY,
  ADMIN_JID,
  ALERT_GROUP_JID,
};
