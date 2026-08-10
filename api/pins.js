// The shared wall's real backend. Reads and writes a list of pins in
// Upstash Redis (connected via the Vercel Storage integration), so every
// visitor sees the same wall instead of each browser having its own copy.
//
// No npm dependencies on purpose: Upstash's REST API is just plain HTTP,
// and Vercel's Node runtime already has a global fetch, so this stays a
// zero-dependency function like the rest of this static site.

const REDIS_URL = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
const LIST_KEY = "fnm:pins";
const MAX_PINS = 300;

const ALLOWED_TOPICS = [
  "exchange", "travel", "pressure", "career", "deep",
  "money", "relationships", "burnout", "adulting", "random"
];
const ALLOWED_PETS = ["matcha", "clay", "cream", "house", "plant", "cup", "sky", "berry"];

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + REDIS_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

function parsePin(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    res.status(500).json({ error: "storage isn't connected yet" });
    return;
  }

  try {
    if (req.method === "GET") {
      const raw = await redis(["LRANGE", LIST_KEY, "0", String(MAX_PINS - 1)]);
      const pins = (raw || []).map(parsePin).filter(Boolean);
      res.status(200).json({ pins: pins });
      return;
    }

    if (req.method === "POST") {
      var body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      body = body || {};

      var text = String(body.text || "").trim().slice(0, 280);
      if (!text) {
        res.status(400).json({ error: "text is required" });
        return;
      }
      var topic = ALLOWED_TOPICS.indexOf(body.topic) !== -1 ? body.topic : "random";
      var pet = ALLOWED_PETS.indexOf(body.pet) !== -1 ? body.pet : "matcha";
      var sign = String(body.sign || "").trim().slice(0, 24);

      var pin = {
        id: "pin-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
        topic: topic,
        text: text,
        sign: sign,
        pet: pet,
        created: Date.now()
      };

      await redis(["LPUSH", LIST_KEY, JSON.stringify(pin)]);
      await redis(["LTRIM", LIST_KEY, "0", String(MAX_PINS - 1)]);
      res.status(201).json({ pin: pin });
      return;
    }

    if (req.method === "DELETE") {
      var passcode = (req.query && req.query.passcode) || "";
      if (passcode !== process.env.ADMIN_PASSCODE) {
        res.status(401).json({ error: "wrong passcode" });
        return;
      }
      var id = req.query && req.query.id;
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }

      var raw = await redis(["LRANGE", LIST_KEY, "0", String(MAX_PINS - 1)]);
      var keep = (raw || []).filter(function (s) {
        var pin = parsePin(s);
        return pin && pin.id !== id;
      });

      // rebuild the list without the deleted pin. this scale (a personal
      // blog's wall, admin-only, occasional deletes) doesn't need
      // anything fancier than a full rewrite.
      await redis(["DEL", LIST_KEY]);
      for (var i = keep.length - 1; i >= 0; i--) {
        await redis(["RPUSH", LIST_KEY, keep[i]]);
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    res.status(500).json({ error: "something went wrong talking to storage" });
  }
};
