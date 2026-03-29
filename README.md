# The Home Reset

ADHD-friendly daily & weekly cleaning checklist for families.

## Deploy to Vercel

### Option A: Vercel CLI (quickest)

```bash
# Install Vercel CLI if you don't have it
npm i -g vercel

# From the project directory
cd home-reset
vercel
```

Follow the prompts — it will auto-detect Next.js and deploy.

### Option B: GitHub → Vercel

1. Push this folder to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo
4. Vercel auto-detects Next.js — click Deploy

### Add to Home Screen (PWA)

Once deployed, open the URL on your phone:
- **iOS**: Safari → Share → "Add to Home Screen"
- **Android**: Chrome → Menu → "Add to Home Screen"

This gives you a full-screen app experience with no browser chrome.

## Features

- **10-minute reset timer** with start/pause/reset
- **Daily checklist** (5 tasks) — auto-resets each day
- **Weekly tasks** — one per day, auto-resets each week
- **"Close the Loop" house rules** — expandable reference
- All state persisted in localStorage
- Mobile-first, works great on phone screens
