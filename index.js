const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => res.send("ok"));

// Add this so browser tests work
app.get("/wa-webhook", (req, res) => res.send("webhook ok (GET)"));

// Wasender will POST here
app.post("/wa-webhook", (req, res) => {
  console.log("WEBHOOK PAYLOAD:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Listening on", port));
