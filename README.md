# field notes & matcha

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

## Running locally

Since a few features (the photobooth's file picker, camera-adjacent APIs, and now the shared wall's API) need a real origin rather than `file://`, serve it with any static server, for example:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Note that a plain static server like this won't run `api/pins.js`, so the wall itself won't load pins locally this way — use `vercel dev` instead if you need that working too.

## Deploying

Deploys as-is to Vercel with no build configuration needed. `api/pins.js` is picked up automatically as a serverless function.

## The shared wall

The "shared roll" saves pins to a real backend: Upstash Redis, connected through Vercel's Storage integration, and read/written by `api/pins.js`. Every visitor sees the same wall. Moderation (unlocking admin mode and deleting a pin) goes through the same API, checked against the `ADMIN_PASSCODE` environment variable, so a delete actually removes it for everyone rather than just hiding it on one device.

Required environment variables (set in the Vercel project, under Settings → Environment Variables):

- `KV_REST_API_URL` and `KV_REST_API_TOKEN` — added automatically when you connect the Upstash Redis integration
- `ADMIN_PASSCODE` — set this one yourself, it's the same passcode used to unlock admin mode in the site itself

Seed pins (the ones baked into `share.html` itself) are a separate, simpler case: hiding one is still just local to whichever device clicked delete, since they're static HTML rather than rows in the database.
