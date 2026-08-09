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

## Running locally

Since a few features (the photobooth's file picker, camera-adjacent APIs) need a real origin rather than `file://`, serve it with any static server, for example:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploying

This is a static site, so it deploys as-is to GitHub Pages, Vercel, Netlify, or similar with no build configuration needed.

## A note on the shared wall

The "shared roll" currently saves pins to each visitor's own browser (localStorage), not a shared server. That means moderation ("manage posts" on the Share page) only affects what a given browser/device shows. Making the wall genuinely shared across visitors, and moderation genuinely centralized, needs a real backend.
