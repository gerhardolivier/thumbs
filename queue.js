const { sendText } = require("./wasender");

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
      await sendText(toJid, text);
    } catch (e) {
      console.error("SEND FAILED:", e);
      // Optional: Wait a bit longer if there was an error to let the API recover
      await new Promise((r) => setTimeout(r, 5000));
    }

    // UPDATED: 2 seconds is polite but fast.
    // Railway's paid tier allows continuous execution, so we don't need 65s anymore.
    await new Promise((r) => setTimeout(r, 2000));
  }

  running = false;
}

module.exports = { enqueue };
