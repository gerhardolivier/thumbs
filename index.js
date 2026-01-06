const express = require("express");
const app = express();

app.use(express.json());

// Health check
app.get("/", (req, res) => res.send("ok"));

// Webhook from WasenderAPI
app.post("/wa-webhook", (req, res) => {
  console.log("INCOMING WEBHOOK:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Listening on", port));
