# PB 2026 - Planetary Biology Conference App

**Integrating Scales in Planetary Biology**  
October 28-30, 2026 · Uppsala, Sweden

A Progressive Web App (PWA) for conference participants, featuring:

- 📅 **Schedule** - Day-by-day program with speaker profiles and talk abstracts
- 🎤 **Pitch Slam** - Submit cross-disciplinary project ideas, browse pitches, join teams
- 💬 **Chat** - Team discussions and direct messaging (anonymous handles)
- 💡 **Session Reactions** - Quick feedback for organizers
- 📍 **Practical Info** - Venue with map, travel, hotels, contacts

## Privacy by Design

- No email addresses or phone numbers stored
- Chat profiles are self-created (anonymous by default)
- All data deleted 30 days after conference
- No GDPR-sensitive personal data collected

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- npm (comes with Node.js)

### Install & Run Locally

```bash
git clone https://github.com/OlgaVP-PB/pb2026-app.git
cd pb2026-app
npm install
npm start
```

The app will open at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

This creates an optimized build in the `build/` folder.

### Deploy to GitHub Pages

1. In `package.json`, update the `homepage` field:
   ```json
   "homepage": "https://OlgaVP-PB.github.io/pb2026-app"
   ```

2. Deploy:
   ```bash
   npm run deploy
   ```

The app will be live at `https://OlgaVP-PB.github.io/pb2026-app`.

### Install on Phone (PWA)

Once deployed, open the URL on your phone and:
- **iPhone**: Tap Share > "Add to Home Screen"
- **Android**: Tap the browser menu > "Add to Home Screen" or accept the install prompt

## Tech Stack

- React 18
- CSS (custom, no framework)
- Fonts: Fraunces (display) + DM Sans (body)
- Backend: Supabase (to be connected)

## Project Structure

```
pb2026-app/
├── public/
│   ├── index.html          # HTML template with PWA meta tags
│   ├── manifest.json       # PWA manifest
│   ├── icon-192.png        # App icon (192x192)
│   └── icon-512.png        # App icon (512x512)
├── src/
│   ├── index.js            # Entry point
│   └── App.jsx             # Main application
├── package.json
└── README.md
```

## Roadmap

- [ ] Connect Supabase backend for real data storage
- [ ] Live chat functionality
- [ ] Pitch submission persistence
- [ ] Reaction aggregation for organizer dashboard
- [ ] Push notifications
- [x] Speakers gallery page
- [ ] Live Q&A during sessions
- [x] Reskin to match conference website (SciLifeLab teal/lime palette, Lato, key visual)

## Team

Built for the Planetary Biology conference organizing committee.

---

*Speakers, session themes and practical info are taken from the conference website. The day-by-day timetable is preliminary and the Pitch Slam / Chat features have no backend yet.*
