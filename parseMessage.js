// Normalizes Wasender webhook payload into a simple object.
// Handles both:
// - messages.received (payload.data.messages)
// - messages.upsert (payload.message.data.messages) - your group payload uses this

function pickMsg(payload) {
  if (!payload) return null;

  // messages.received
  if (payload.data && payload.data.messages) return payload.data.messages;

  // messages.upsert (your sample)
  if (payload.message && payload.message.data && payload.message.data.messages) {
    return payload.message.data.messages;
  }

  // Some variants might use payload.data.messages as an array
  if (payload.data && Array.isArray(payload.data.messages) && payload.data.messages[0]) {
    return payload.data.messages[0];
  }

  return null;
}

function parseMessage(payload) {
  const msg = pickMsg(payload);
  if (!msg) return { ok: false };

  // In your messages.received payload, sender is msg.key.senderPn
  const key = msg.key || {};

  // remoteJid: group ends with @g.us, DM usually ends with @lid or @s.whatsapp.net depending on backend
  const remoteJid = msg.remoteJid || key.remoteJid || null;

  const senderJid = key.senderPn || msg.senderPn || null;

  // Text fields: messageBody OR conversation
  const text = String(msg.messageBody || msg.conversation || "").trim();

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
