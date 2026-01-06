const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { handleDirectMessage } = require("./logic"); // Import your existing logic

let sock;

async function startSock() {
  // Save login data to a folder named "auth_info_baileys"
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // This prints the QR code to your logs
    logger: pino({ level: "silent" }), // Hides noisy logs
  });

  // Handle connection updates (Login, Reconnect, Close)
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("SCAN THIS QR CODE WITH WHATSAPP LINKED DEVICES:");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed. Reconnecting:", shouldReconnect);
      if (shouldReconnect) startSock();
    } else if (connection === "open") {
      console.log("✅ Connected to WhatsApp!");
    }
  });

  // Save credentials whenever they update
  sock.ev.on("creds.update", saveCreds);

  // Listen for incoming messages
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const m of messages) {
      if (!m.message) continue;

      // Extract Sender JID
      const senderJid = m.key.remoteJid;

      // Extract Text (Handling simple text and replies)
      const textRaw =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        "";
        
      const text = textRaw.trim();

      // Only handle DMs (ignore groups for check-in logic)
      if (senderJid.endsWith("@s.whatsapp.net")) {
        console.log(`📩 Received from ${senderJid}: ${text}`);
        await handleDirectMessage({ senderJid, text });
      }
    }
  });
}

// Helper to send text
async function sendBaileysText(toJid, text) {
  if (!sock) throw new Error("Socket not ready");
  await sock.sendMessage(toJid, { text });
}

module.exports = { startSock, sendBaileysText };