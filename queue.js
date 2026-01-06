// REMOVED: const { sendBaileysText } = require("./socket"); (This caused the crash)

const queue = [];
let running = false;

async function enqueue(toJid, text) {
  queue.push({ toJid, text });
  if (!running) run();
}

async function run() {
  running = true;

  // FIX: Lazy load the socket here.
  // By the time this runs, socket.js is fully loaded, so no circular crash.
  const { sendBaileysText } = require("./socket");

  while (queue.length) {
    const { toJid, text } = queue.shift();
    try {
      await sendBaileysText(toJid, text);
      console.log(`Sent to ${toJid}`);
    } catch (e) {
      console.error("SEND FAILED:", e);
      // Wait 5 seconds if there's a network error
      await new Promise((r) => setTimeout(r, 5000));
    }

    // Fast delay: 1 second is plenty safe for Baileys
    await new Promise((r) => setTimeout(r, 1000));
  }

  running = false;
}

module.exports = { enqueue };
