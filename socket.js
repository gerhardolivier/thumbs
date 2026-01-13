const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { handleDirectMessage } = require("./logic");

let sock;

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "info" }),
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) console.log("QR RECEIVED:", qr);
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startSock();
    } else if (connection === "open") {
      console.log("✅ Connected to WhatsApp!");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // --- MESSAGE LISTENER ---
  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const m of messages) {
      if (!m.message) continue;
      if (m.key.fromMe) continue;

      const senderJid = m.key.remoteJid;
      let text = "";
      let type = "";

      // 1. Conversation (Normal Text)
      if (m.message.conversation) {
        text = m.message.conversation;
        type = "text";
      }
      // 2. Extended Text (Replies, etc.)
      else if (m.message.extendedTextMessage) {
        text = m.message.extendedTextMessage.text;
        type = "text";
      }
      // 3. Reaction (Tap and hold)
      else if (m.message.reactionMessage) {
        text = m.message.reactionMessage.text; // "👍"
        type = "reaction";
      }
      // 4. Sticker (Often confused with emojis)
      else if (m.message.stickerMessage) {
        text = "👍"; // Treat ALL stickers as a thumbs up
        type = "sticker";
      }
      // 5. Image (Photo proof)
      else if (m.message.imageMessage) {
        text = "👍"; // Treat ALL images as a thumbs up
        type = "image";
      }

      if (!text) continue;

      console.log(
        `[MSG] From: ${senderJid} | Type: ${type} | Content: ${text}`
      );
      await handleDirectMessage({ senderJid, text });
    }
  });
}

async function sendBaileysText(toJid, text) {
  if (!sock) throw new Error("Socket not ready");
  await sock.sendMessage(toJid, { text });
}

module.exports = { startSock, sendBaileysText };
