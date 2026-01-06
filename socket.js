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
    // CHANGED: Turn on logs so we can see connection issues
    logger: pino({ level: "info" }),
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) console.log("QR RECEIVED (Copy code from previous step if needed)");

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed. Reconnecting:", shouldReconnect);
      if (shouldReconnect) startSock();
    } else if (connection === "open") {
      console.log("✅ Connected to WhatsApp!");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // --- DEBUG MESSAGE HANDLER ---
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    // We removed 'if (type !== "notify")' so we see EVERYTHING.

    for (const m of messages) {
      if (!m.message) continue;

      // Extract Sender JID
      const senderJid = m.key.remoteJid;

      // LOG EVERYTHING: This will show us exactly who is messaging and what the ID looks like
      console.log("------------------------------------------------");
      console.log("MSG RECEIVED FROM:", senderJid);
      console.log("IS FROM ME?", m.key.fromMe);

      // Ignore messages sent BY the bot itself
      if (m.key.fromMe) return;

      const textRaw =
        m.message.conversation || m.message.extendedTextMessage?.text || "";
      const text = textRaw.trim();

      console.log("TEXT CONTENT:", text);

      // Pass to logic
      await handleDirectMessage({ senderJid, text });
    }
  });
}

async function sendBaileysText(toJid, text) {
  if (!sock) throw new Error("Socket not ready");
  await sock.sendMessage(toJid, { text });
}

module.exports = { startSock, sendBaileysText };
