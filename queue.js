const { sendBaileysText } = require("./socket"); // Import from new file

const queue = [];
let running = false;

async function enqueue(toJid, text) {
  queue.push({ toJid, text });
  if (!running) run();
}

async function run() {
  running = true;

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
