const { API_KEY } = require("./config");

async function sendText(toJid, text) {
  if (!API_KEY) throw new Error("Missing WASENDER_API_KEY");

  const url = "https://api.wasenderapi.com/api/send-message";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ to: toJid, text }),
  });

  const body = await res.text();
  if (!res.ok) throw new Error(body);
  return body;
}

module.exports = { sendText };
