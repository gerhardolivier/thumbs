// Normalizes Wasender webhook payload into a simple object.
function pickMsg(payload) {
  if (!payload) return null;

  // messages.received
  if (payload.data && payload.data.messages) return payload.data.messages;

  // messages.upsert
  if (
    payload.message &&
    payload.message.data &&
    payload.message.data.messages
  ) {
    // If it's an array, grab the first one. If it's an object, use it directly.
    const msgs = payload.message.data.messages;
    return Array.isArray(msgs) ? msgs[0] : msgs;
  }

  // Fallback for arrays in data
  if (
    payload.data &&
    Array.isArray(payload.data.messages) &&
    payload.data.messages[0]
  ) {
    return payload.data.messages[0];
  }

  return null;
}

function parseMessage(payload) {
  const msg = pickMsg(payload);
  if (!msg) return { ok: false };

  const key = msg.key || {};
  const remoteJid = msg.remoteJid || key.remoteJid || null;

  // Ensure we get a sender JID.
  // Warning: senderPn is often just the number. You might need to append '@s.whatsapp.net' here
  // if your roster keys have it but the API doesn't send it.
  const senderJid = key.senderPn || msg.senderPn || null;

  // ROBUST TEXT EXTRACTION
  // 1. messageBody/conversation: Standard text
  // 2. extendedTextMessage.text: Replies / Link previews / Formatted text
  // 3. body/text: Common variations in some APIs
  let textRaw =
    msg.messageBody ||
    msg.conversation ||
    (msg.message &&
      msg.message.extendedTextMessage &&
      msg.message.extendedTextMessage.text) ||
    (msg.extendedTextMessage && msg.extendedTextMessage.text) ||
    msg.body ||
    msg.text ||
    "";

  const text = String(textRaw).trim();

  return {
    ok: true,
    event: payload.event || null,
    senderJid,
    remoteJid,
    text,
    raw: payload,
  };
}

module.exports = { parseMessage };
