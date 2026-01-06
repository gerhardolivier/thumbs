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
    }

    // Railway free tier safe delay
    await new Promise((r) => setTimeout(r, 65_000));
  }

  running = false;
}

module.exports = { enqueue };
