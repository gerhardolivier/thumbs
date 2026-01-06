const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal"); // Import the QR generator
const { handleDirectMessage } = require("./logic");

let sock;

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Turn off the built-in (deprecated) one
    logger: pino({ level: "error" }),
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // FIX: Manually generate the QR code
    if (qr) {
      console.log("Sensitivity: HIGH - QR CODE BELOW");
      // Print the graphic (just in case)
      qrcode.generate(qr, { small: true });

      console.log("\n====================================================");
      console.log("CAN'T SCAN? COPY THE TEXT BELOW THIS LINE:");
      console.log(qr);
      console.log("====================================================\n");
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

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const m of messages) {
      if (!m.message) continue;

      const senderJid = m.key.remoteJid;

      const textRaw =
        m.message.conversation || m.message.extendedTextMessage?.text || "";

      const text = textRaw.trim();

      if (senderJid.endsWith("@s.whatsapp.net")) {
        console.log(`📩 Received from ${senderJid}: ${text}`);
        await handleDirectMessage({ senderJid, text });
      }
    }
  });
}

async function sendBaileysText(toJid, text) {
  if (!sock) throw new Error("Socket not ready");
  await sock.sendMessage(toJid, { text });
}

module.exports = { startSock, sendBaileysText };
