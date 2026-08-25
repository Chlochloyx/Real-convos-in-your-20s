# midnight matcha

A cozy, community-first personal site for 20-somethings figuring life out together. Real thoughts, a shared wall for other people's stories, and a few small interactive bits along the way (a matcha bowl you can stir, a photobooth, a letterbox of real quotes).

## Structure

Plain HTML/CSS/JS, no build step required.

- `index.html` — home
- `share.html` — the shared roll (community wall)
- `about.html` — about Chloe
- `journal.html` — journal entries
- `grab-matcha.html` — contact
- `css/style.css` — all styles
- `js/main.js` — all interactivity
- `api/pins.js` — the shared wall's backend (a Vercel serverless function)
- `api/letters.js` — the letterbox's backend, same shape as `api/pins.js` (a Vercel serverless function)

## Running locally

Since a few features (the photobooth's file picker, camera-adjacent APIs, and now the shared wall's API) need a real origin rather than `file://`, serve it with any static server, for example:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Note that a plain static server like this won't run `api/pins.js` or `api/letters.js`, so the wall and the letterbox's community quotes won't load locally this way — use `vercel dev` instead if you need those working too.

## Deploying

Deploys as-is to Vercel with no build configuration needed. `api/pins.js` and `api/letters.js` are picked up automatically as serverless functions.

## The shared wall

The "shared roll" saves pins to a real backend: Upstash Redis, connected through Vercel's Storage integration, and read/written by `api/pins.js`. Every visitor sees the same wall. Moderation (unlocking admin mode and deleting a pin) goes through the same API, checked against the `ADMIN_PASSCODE` environment variable, so a delete actually removes it for everyone rather than just hiding it on one device.

Required environment variables (set in the Vercel project, under Settings → Environment Variables):

- `KV_REST_API_URL` and `KV_REST_API_TOKEN` — added automatically when you connect the Upstash Redis integration
- `ADMIN_PASSCODE` — set this one yourself, it's the same passcode used to unlock admin mode in the site itself

Seed pins (the ones baked into `share.html` itself) are a separate, simpler case: hiding one is still just local to whichever device clicked delete, since they're static HTML rather than rows in the database.

## The letterbox

Visitors can add their own quote to the home page's letterbox, not just read the curated ones baked into `js/main.js`. Community quotes are read/written by `api/letters.js` (same Upstash Redis instance as the shared wall, its own list key) and get mixed into the same random "read another" rotation as the curated quotes. Moderation works the same way as the shared wall: once admin mode is unlocked, a "remove this one" control shows up on community quotes (never on the curated ones), which deletes through the API against the `ADMIN_PASSCODE` environment variable.
