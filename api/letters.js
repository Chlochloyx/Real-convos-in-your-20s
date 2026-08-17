// The letterbox's real backend. Same shape as api/pins.js: reads and
// writes a list in the same Upstash Redis instance, just under its own
// key, so people can add their own quote to the letterbox instead of it
// only ever showing the curated ones baked into the page.

const REDIS_URL = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
const LIST_KEY = "fnm:letters";
const MAX_LETTERS = 300;

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

function parseLetter(raw) {
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
      const raw = await redis(["LRANGE", LIST_KEY, "0", String(MAX_LETTERS - 1)]);
      const letters = (raw || []).map(parseLetter).filter(Boolean);
      res.status(200).json({ letters: letters });
      return;
    }

    if (req.method === "POST") {
      var body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      body = body || {};

      var text = String(body.text || "").trim().slice(0, 240);
      if (!text) {
        res.status(400).json({ error: "text is required" });
        return;
      }
      var sign = String(body.sign || "").trim().slice(0, 40);

      var letter = {
        id: "letter-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
        text: text,
        sign: sign,
        created: Date.now()
      };

      await redis(["LPUSH", LIST_KEY, JSON.stringify(letter)]);
      await redis(["LTRIM", LIST_KEY, "0", String(MAX_LETTERS - 1)]);
      res.status(201).json({ letter: letter });
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

      var raw = await redis(["LRANGE", LIST_KEY, "0", String(MAX_LETTERS - 1)]);
      var keep = (raw || []).filter(function (s) {
        var letter = parseLetter(s);
        return letter && letter.id !== id;
      });

      // rebuild the list without the deleted letter, same as api/pins.js:
      // this scale (a personal blog, admin-only, occasional deletes)
      // doesn't need anything fancier than a full rewrite
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
