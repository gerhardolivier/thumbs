const TZ = process.env.TIMEZONE || "Africa/Johannesburg";
const API_KEY = process.env.WASENDER_API_KEY;
const ADMIN_JID = process.env.ADMIN_JID; 
const ALERT_GROUP_JID = process.env.ALERT_GROUP_JID; 

module.exports = {
  TZ,
  API_KEY,
  ADMIN_JID,
  ALERT_GROUP_JID,
};
