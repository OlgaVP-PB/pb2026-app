import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import {
  ensureSession, getMyProfile, saveProfile, getConfig,
  listPitches, createPitch, listMembers, joinPitch, leavePitch,
  listMessages, sendMessage, subscribeToRoom,
  listReactions, addReaction, removeReaction, listProfiles,
} from "./supabase";

// --- Shared app state (who you are, organiser switches, everyone's names) ---
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// Turn raw reaction rows into { sessionKey: { emoji: {count, mine} } }
function tallyReactions(rows, myId) {
  const out = {};
  rows.forEach((r) => {
    const bucket = (out[r.session_key] = out[r.session_key] || {});
    const cell = (bucket[r.emoji] = bucket[r.emoji] || { count: 0, mine: false });
    cell.count += 1;
    if (r.user_id === myId) cell.mine = true;
  });
  return out;
}

// Optimistic add/remove of one of my reactions
function applyReaction(prev, sessionKey, emoji, mine) {
  const bucket = { ...(prev[sessionKey] || {}) };
  const cell = bucket[emoji] || { count: 0, mine: false };
  bucket[emoji] = {
    count: Math.max(0, cell.count + (mine ? 1 : -1)),
    mine,
  };
  return { ...prev, [sessionKey]: bucket };
}

// ============================================================
// PLANETARY BIOLOGY CONFERENCE APP - Shell / Prototype
// "Integrating Scales in Planetary Biology"
// October 28-30, 2026 · Uppsala, Sweden
// ============================================================

// --- Theme & Config ---
const CONFERENCE = {
  name: "Integrating Scales in Planetary Biology",
  shortName: "PB 2026",
  dates: "28-30 October 2026",
  location: "Uppsala, Sweden",
  tagline: "From Cells to Biodiversity & Planetary Resilience",
  website: "https://lyyti.events/p/Integrating_Scales_in_Planetary_Biology_5919",
};

// --- Venue ---
const VENUE = {
  name: "Uppsala University Main Building (Universitetshuset)",
  room: "Sal X",
  address: "Biskopsgatan 3, 753 10 Uppsala",
  lat: 59.8576,
  lon: 17.6295,
};

// --- Session themes (from the conference website) ---
const THEMES = [
  { id: "I", title: "Integrating approaches in Planetary Biology", blurb: "Integrating methods across disciplines to understand life across scales." },
  { id: "II", title: "Climate resilience", blurb: "Organismal, community and ecosystem responses to climate change." },
  { id: "III", title: "Biodiversity decline", blurb: "Understanding and mitigating biodiversity decline through integrative approaches." },
  { id: "IV", title: "Sustainable food systems", blurb: "Biological knowledge for resilient agriculture, sustainable aquaculture, soil health and food system innovation." },
];

const EXPERTISE_TAGS = [
  "Cell Biology",
  "Ecology",
  "Molecular Biology",
  "Genetics",
  "Genomics",
  "Bioinformatics",
  "Data Science / AI",
  "Evolutionary Biology",
  "Marine Biology",
  "Climate Science",
  "Proteomics",
  "Plant Science",
  "Conservation",
  "Science Policy",
  "Engineering",
  "Biochemistry",
  "Microbiology",
  "Systems Biology",
];

// --- Speaker profiles (confirmed speakers, from the conference website) ---
// bios compiled from institutional pages and Wikipedia; photos in public/speakers/
const SPEAKERS = {
  "margaret-mcfall-ngai": {
    id: "margaret-mcfall-ngai",
    name: "Margaret McFall-Ngai",
    affiliation: "Carnegie Science, US",
    photo: "mcfall-ngai.jpg",
    bio: "Microbiologist who built the Hawaiian bobtail squid and its Vibrio fischeri partner into a model for beneficial animal-bacterial symbiosis, reshaping how biologists view microbiomes in animal development and health. Member of the US National Academy of Sciences.",
  },
  "colin-averill": {
    id: "colin-averill",
    name: "Colin Averill",
    affiliation: "Funga Public Benefit Corporation, US",
    photo: "averill.jpg",
    bio: "Forest ecologist studying how soil fungal communities shape tree growth, biodiversity and carbon storage, and applying microbiome science to restore degraded forests. Founder and CEO of Funga, and previously a scientist at ETH Zurich.",
  },
  "alexandra-worden": {
    id: "alexandra-worden",
    name: "Alexandra Worden",
    affiliation: "Marine Biological Laboratory, US",
    photo: "alexandra-worden.jpg",
    bio: "Marine microbial ecologist studying uncultured ocean protists and phytoplankton, pioneering targeted metagenomics to reveal their genomes and their role in the ocean carbon cycle. Member of the German National Academy of Sciences Leopoldina.",
  },
  "detlev-arendt": {
    id: "detlev-arendt",
    name: "Detlev Arendt",
    affiliation: "EMBL, Germany",
    photo: "arendt.jpg",
    bio: "Evolutionary biologist studying how nervous systems and animal body plans evolved, using the marine annelid Platynereis dumerilii, which he established as a model organism. His work helped found the study of cell type evolution.",
  },
  "anne-magurran": {
    id: "anne-magurran",
    name: "Anne Magurran",
    affiliation: "University of St Andrews, Scotland",
    photo: "magurran.jpg",
    bio: "Ecologist studying how biological diversity is measured and how assemblages change over time, work central to tracking biodiversity in a rapidly changing world. Author of the standard reference Measuring Biological Diversity; appointed CBE in 2022.",
  },
  "corentin-bisot": {
    id: "corentin-bisot",
    name: "Corentin Bisot",
    affiliation: "AMOLF, Netherlands & EMBL, Germany",
    photo: "bisot.jpg",
    bio: "Biophysicist studying fungal networks, using robotic time-lapse imaging and machine learning to track how mycelial networks grow and move nutrients. Co-lead author of a 2025 Nature study on plant-fungal trade.",
  },
  "andrew-haines": {
    id: "andrew-haines",
    name: "Andrew Haines",
    affiliation: "London School of Hygiene & Tropical Medicine, UK",
    photo: "haines.jpg",
    bio: "Physician and epidemiologist researching how climate change and environmental degradation affect health, and the health co-benefits of low-carbon policies. Director of LSHTM from 2001 to 2010; knighted in 2005 for services to medicine.",
  },
  "jenni-lehtimaki": {
    id: "jenni-lehtimaki",
    name: "Jenni Lehtimäki",
    affiliation: "Finnish Environment Institute, Finland",
    photo: "lehtimaki.jpg",
    bio: "Principal researcher studying environmental and human microbiomes, and how biodiversity in everyday living environments shapes immune development and immune-mediated disease. Holds an ERC Starting Grant for the project Residents.",
  },
  "arnau-sebe-pedros": {
    id: "arnau-sebe-pedros",
    name: "Arnau Sebé-Pedrós",
    affiliation: "Centre for Genomic Regulation, Spain & Wellcome Sanger Institute, UK",
    photo: "sebe-pedros.jpg",
    bio: "Group leader using single-cell genomics to map cell type diversity across animals and to trace how gene regulation evolved. EMBO Young Investigator and associate faculty in the Wellcome Sanger Institute's Tree of Life programme.",
  },
  "anna-liisa-laine": {
    id: "anna-liisa-laine",
    name: "Anna-Liisa Laine",
    affiliation: "University of Helsinki, Finland",
    photo: "laine.jpg",
    bio: "Plant ecologist studying how wild plant populations and their fungal pathogens coevolve, using long-term field data to reveal how biodiversity loss and climate change alter disease dynamics. Holds an ERC Advanced Grant.",
  },
  "federico-ariel": {
    id: "federico-ariel",
    name: "Federico Ariel",
    affiliation: "IFIBYNE-CONICET, Argentina",
    photo: "ariel.jpg",
    bio: "Plant molecular biologist working on long non-coding RNAs and how they shape chromatin and gene expression, with applications to RNA-based alternatives to agrochemicals. Won the 2023 UNESCO-Al-Fozan International Prize.",
  },
  "courtney-stairs": {
    id: "courtney-stairs",
    name: "Courtney Stairs",
    affiliation: "Uppsala University, Sweden",
    photo: "courtney-stairs.jpg",
    bio: "Molecular evolutionary biologist investigating how microbial eukaryotes evolved to thrive without oxygen, combining genomics and cell biology to explain anaerobic metabolism in low-oxygen habitats. Holds an ERC Starting Grant for the TANGO2 project.",
  },
};

const SPEAKER_LIST = Object.values(SPEAKERS);

// --- Programme (PRELIMINARY - times and order to be confirmed) ---
const SCHEDULE_NOTE = "Preliminary programme. Talk order and times will be confirmed closer to the conference.";
const SCHEDULE = [
  {
    day: 1,
    date: "28 Oct",
    title: "Opening, Sessions I-II & Pitch Slam kick-off",
    sessions: [
      { time: "08:30", title: "Registration & Coffee", type: "break" },
      { time: "09:00", title: "Opening & Welcome", type: "plenary", speaker: "Organizing Committee" },
      { time: "09:30", title: "Session I: Integrating approaches in Planetary Biology", type: "session", speaker: "Invited talks", themeId: "I" },
      { time: "12:30", title: "Lunch", type: "break" },
      { time: "13:30", title: "Session II: Climate resilience", type: "session", speaker: "Invited talks", themeId: "II" },
      { time: "16:00", title: "🎤 Pitch Slam kick-off", type: "pitch", speaker: "Present your idea, find your team" },
      { time: "18:00", title: "Welcome Reception & Poster Mingle", type: "social" },
    ],
  },
  {
    day: 2,
    date: "29 Oct",
    title: "Sessions III-IV & Round Tables",
    sessions: [
      { time: "09:00", title: "Session III: Biodiversity decline", type: "session", speaker: "Invited talks", themeId: "III" },
      { time: "12:00", title: "Lunch & Pitch Team Working Time", type: "break" },
      { time: "13:30", title: "Session IV: Sustainable food systems", type: "session", speaker: "Invited talks", themeId: "IV" },
      { time: "16:00", title: "Round tables: Emerging research priorities", type: "plenary", speaker: "All participants" },
      { time: "19:00", title: "Conference Dinner", type: "social" },
    ],
  },
  {
    day: 3,
    date: "30 Oct",
    title: "Pitch Finals & Funders",
    sessions: [
      { time: "09:00", title: "Voices from the Round Tables", type: "plenary", speaker: "Session Chairs" },
      { time: "10:30", title: "Coffee & Final Pitch Preparations", type: "break" },
      { time: "11:00", title: "🏆 Pitch Finals - Team Presentations", type: "pitch", speaker: "Formed teams" },
      { time: "13:30", title: "Panel with funding stakeholders", type: "session", speaker: "Funder Panel" },
      { time: "15:00", title: "Best Poster Award & Closing", type: "plenary", speaker: "Organizing Committee" },
    ],
  },
];

// Placeholder pitches for demo
const DEMO_PITCHES = [
  {
    id: 1,
    name: "Dr. Maria Chen",
    affiliation: "ETH Zürich",
    title: "Cellular drought memory for climate-resilient crops",
    problem: "Plants have cellular mechanisms to 'remember' drought stress, but we don't understand how this memory scales to crop resilience across generations. Can we harness epigenetic stress memory in cells to develop crops that pre-adapt to water scarcity?",
    approach: "We have identified key chromatin remodeling complexes in Arabidopsis that retain drought memory for up to 5 generations. We need partners to scale this from model organisms to real crops and test across diverse ecological conditions.",
    lookingFor: ["Ecology", "Plant Science", "Genomics", "Data Science / AI"],
    interested: 12,
  },
  {
    id: 2,
    name: "Prof. James Okafor",
    affiliation: "University of Cape Town",
    title: "eDNA monitoring of coral reef microbiome collapse",
    problem: "Coral reef collapse begins at the microbial level long before visible bleaching. Can we build an early warning system using environmental DNA to detect microbiome shifts that predict reef collapse months in advance?",
    approach: "We have 3 years of eDNA time-series data from Indian Ocean reefs. We need bioinformatics expertise to build predictive models and cell biologists to help us understand the host-microbe signaling that precedes collapse.",
    lookingFor: ["Bioinformatics", "Cell Biology", "Marine Biology", "Data Science / AI"],
    interested: 8,
  },
  {
    id: 3,
    name: "Dr. Sofia Lindström",
    affiliation: "SLU Uppsala",
    title: "Soil fungal networks as climate resilience infrastructure",
    problem: "Mycorrhizal networks connect trees and distribute nutrients across forest ecosystems, but we lack molecular understanding of how these networks respond to warming. How do cellular stress responses in fungi affect forest-scale resilience?",
    approach: "We combine proteomics of fungal stress responses with ecological field data from Swedish boreal forests. Looking for collaborators who can bridge the molecular-to-ecosystem gap with modeling and genomic tools.",
    lookingFor: ["Molecular Biology", "Systems Biology", "Climate Science", "Genomics"],
    interested: 15,
  },
];

// --- Icons (inline SVG components) ---
const Icons = {
  Home: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Calendar: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Zap: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  MessageCircle: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  Info: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  Users: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Send: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Back: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Map: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Mic: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
};

// --- Styles ---
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;0,900;1,400&display=swap');

  /* Palette: SciLifeLab graphic profile, as used on the conference website
     Teal #045C64 (primary), Lime #A7C947 (main accent), Aqua #4C979F, Grape #491F53 (sparingly) */
  :root {
    --teal: #045C64;
    --teal-dark: #033f45;
    --lime: #A7C947;
    --lime-dark: #7fa02b;
    --aqua: #4C979F;
    --grape: #491F53;
    --orange: #F9A12C;

    --bg-deep: #f4f6f4;
    --bg-card: #ffffff;
    --bg-card-hover: #f0f7f8;
    --bg-surface: #eef3f1;
    --accent-green: var(--teal);
    --accent-green-dim: var(--teal-dark);
    --accent-teal: var(--aqua);
    --accent-amber: var(--orange);
    --accent-rose: var(--grape);
    --accent-blue: var(--teal);
    --text-primary: #192832;
    --text-secondary: #46545b;
    --text-dim: #7a878e;
    --border: #e3e8e6;
    --border-light: #cfd8d5;
    --font-display: 'Lato', Helvetica, Arial, sans-serif;
    --font-body: 'Lato', Helvetica, Arial, sans-serif;
    --radius: 14px;
    --radius-sm: 8px;
    --shadow-card: 0 2px 12px rgba(25,40,50,0.08);
    --shadow-glow: 0 0 0 transparent;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body, #root {
    font-family: var(--font-body);
    background: var(--bg-deep);
    color: var(--text-primary);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  .app-container {
    max-width: 480px;
    margin: 0 auto;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    background: var(--bg-deep);
  }

  .page-content {
    flex: 1;
    padding: 16px 16px 90px 16px;
    overflow-y: auto;
  }

  /* --- Navigation Bar --- */
  .nav-bar {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-around;
    padding: 8px 4px;
    padding-bottom: max(8px, env(safe-area-inset-bottom));
    z-index: 100;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 6px 8px;
    border-radius: 12px;
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 10px;
    font-family: var(--font-body);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .nav-item.active {
    color: var(--teal);
    font-weight: 700;
  }

  .nav-item:hover {
    color: var(--text-secondary);
  }

  /* --- Header --- */
  .page-header {
    margin-bottom: 20px;
  }

  .page-header h1 {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.2;
    color: var(--text-primary);
  }

  .page-header p {
    font-size: 14px;
    color: var(--text-secondary);
    margin-top: 6px;
    line-height: 1.5;
  }

  /* --- Home Page --- */
  .hero-section {
    position: relative;
    margin: -16px -16px 0;
    aspect-ratio: 16 / 11;
    overflow: hidden;
    background: var(--teal-dark);
  }

  .hero-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 45%;
  }

  .hero-logo {
    position: absolute;
    top: 14px;
    right: 16px;
    width: 108px;
    height: auto;
    z-index: 2;
    filter: drop-shadow(0 1px 4px rgba(0,0,0,0.35));
  }

  .hero-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 20px 18px 18px;
    background: linear-gradient(180deg, rgba(3,63,69,0.42) 0%, rgba(3,63,69,0.06) 26%, rgba(3,63,69,0.55) 70%, rgba(3,63,69,0.82) 100%);
    color: #fff;
  }

  .hero-title {
    font-family: var(--font-display);
    font-size: 27px;
    font-weight: 900;
    letter-spacing: -0.01em;
    line-height: 1.15;
    margin-bottom: 6px;
    color: #fff;
    text-shadow: 0 1px 8px rgba(0,0,0,0.35);
  }

  .hero-tagline {
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    opacity: 0.95;
    margin-bottom: 8px;
    text-shadow: 0 1px 6px rgba(0,0,0,0.35);
  }

  .hero-meta {
    font-size: 13px;
    font-weight: 700;
    color: var(--lime);
    text-shadow: 0 1px 6px rgba(0,0,0,0.4);
  }

  /* --- Quick Links --- */
  .quick-links {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 20px;
  }

  .quick-link {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .quick-link:hover, .quick-link:active {
    background: var(--bg-card-hover);
    border-color: var(--border-light);
    transform: translateY(-1px);
  }

  .quick-link-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .quick-link-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
    line-height: 1.3;
  }

  .ql-green .quick-link-icon { background: rgba(167,201,71,0.25); color: var(--teal); }
  .ql-blue .quick-link-icon { background: rgba(4,92,100,0.10); color: var(--teal); }
  .ql-amber .quick-link-icon { background: rgba(249,161,44,0.16); color: #c47a12; }
  .ql-rose .quick-link-icon { background: rgba(73,31,83,0.10); color: var(--grape); }
  .ql-teal .quick-link-icon { background: rgba(76,151,159,0.16); color: var(--aqua); }

  /* --- Pitch Slam Feature Banner --- */
  .pitch-banner {
    background: linear-gradient(135deg, var(--teal), var(--teal-dark));
    border: 1px solid var(--teal-dark);
    color: #fff;
    border-radius: var(--radius);
    padding: 20px 18px;
    margin-top: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .pitch-banner::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -30%;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(167,201,71,0.18), transparent);
  }

  .pitch-banner:hover {
    border-color: rgba(167,201,71,0.9);
  }

  .pitch-banner-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--lime);
    margin-bottom: 8px;
  }

  .pitch-banner h3 {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 6px;
    color: #fff;
  }

  .pitch-banner p {
    font-size: 13px;
    color: rgba(255,255,255,0.85);
    line-height: 1.5;
  }

  /* --- Schedule --- */
  .day-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .day-tab {
    flex-shrink: 0;
    padding: 10px 18px;
    border-radius: 100px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font-body);
    cursor: pointer;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .day-tab.active {
    background: var(--accent-green);
    border-color: var(--accent-green);
    color: var(--bg-deep);
  }

  .session-card {
    display: flex;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid var(--border);
  }

  .session-card:last-child { border-bottom: none; }

  .session-time {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-dim);
    min-width: 48px;
    padding-top: 2px;
    font-variant-numeric: tabular-nums;
  }

  .session-info { flex: 1; }

  .session-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.35;
    margin-bottom: 4px;
  }

  .session-speaker {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .session-type-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 3px 8px;
    border-radius: 4px;
    margin-bottom: 6px;
  }

  .badge-pitch { background: rgba(249,161,44,0.18); color: var(--accent-amber); }
  .badge-session { background: rgba(4,92,100,0.10); color: var(--accent-blue); }
  .badge-plenary { background: rgba(167,201,71,0.28); color: var(--accent-green); }
  .badge-social { background: rgba(73,31,83,0.10); color: var(--accent-rose); }
  .badge-break { background: rgba(122,135,142,0.16); color: var(--text-dim); }

  /* --- Session Reactions --- */
  .session-reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  .reaction-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    border-radius: 100px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.15s ease;
    -webkit-tap-highlight-color: transparent;
    font-family: var(--font-body);
  }

  .reaction-btn:hover {
    border-color: var(--border-light);
    background: var(--bg-card-hover);
  }

  .reaction-btn.reacted {
    background: rgba(167,201,71,0.28);
    border-color: rgba(4,92,100,0.35);
  }

  .reaction-emoji {
    font-size: 14px;
    line-height: 1;
  }

  .reaction-label {
    font-size: 10px;
    font-weight: 500;
    color: var(--text-dim);
  }

  .reaction-btn.reacted .reaction-label {
    color: var(--accent-green);
  }

  /* --- Pitches Page --- */
  .pitch-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .pitch-card:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-light);
  }

  .pitch-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
  }

  .pitch-card h3 {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--text-primary);
    flex: 1;
    margin-right: 8px;
  }

  .pitch-author {
    font-size: 13px;
    color: var(--accent-teal);
    font-weight: 500;
    margin-bottom: 2px;
  }

  .pitch-affiliation {
    font-size: 12px;
    color: var(--text-dim);
    margin-bottom: 10px;
  }

  .pitch-description {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.55;
    margin-bottom: 14px;
  }

  .pitch-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
  }

  .pitch-tag {
    font-size: 11px;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 100px;
    background: rgba(167,201,71,0.18);
    color: var(--accent-green);
    border: 1px solid rgba(167,201,71,0.5);
  }

  .pitch-tag.looking-for {
    background: rgba(4,92,100,0.06);
    color: var(--accent-blue);
    border-color: rgba(4,92,100,0.18);
  }

  .pitch-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pitch-interest-count {
    font-size: 12px;
    color: var(--text-dim);
  }

  .btn-im-in {
    padding: 8px 20px;
    border-radius: 100px;
    background: var(--accent-green);
    color: var(--bg-deep);
    font-size: 13px;
    font-weight: 700;
    font-family: var(--font-body);
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .btn-im-in:hover { background: var(--accent-teal); }
  .btn-im-in.joined {
    background: rgba(167,201,71,0.28);
    color: var(--accent-green);
  }

  /* --- Submit Pitch Form --- */
  .form-section {
    margin-bottom: 20px;
  }

  .form-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 6px;
    display: block;
  }

  .form-hint {
    font-size: 11px;
    color: var(--text-dim);
    margin-bottom: 8px;
    display: block;
  }

  .form-input, .form-textarea {
    width: 100%;
    padding: 12px 14px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 14px;
    font-family: var(--font-body);
    transition: border-color 0.2s ease;
    outline: none;
  }

  .form-input:focus, .form-textarea:focus {
    border-color: var(--accent-green);
  }

  .form-input::placeholder, .form-textarea::placeholder {
    color: var(--text-dim);
  }

  .form-textarea {
    resize: vertical;
    min-height: 100px;
    line-height: 1.5;
  }

  .word-count {
    font-size: 11px;
    color: var(--text-dim);
    text-align: right;
    margin-top: 4px;
  }

  .word-count.over { color: var(--accent-rose); }

  .tag-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag-option {
    padding: 6px 14px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 500;
    font-family: var(--font-body);
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .tag-option.selected {
    background: rgba(4,92,100,0.10);
    border-color: rgba(4,92,100,0.35);
    color: var(--accent-blue);
  }

  .btn-primary {
    width: 100%;
    padding: 14px;
    border-radius: var(--radius-sm);
    background: var(--accent-green);
    color: var(--bg-deep);
    font-size: 15px;
    font-weight: 700;
    font-family: var(--font-body);
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .btn-primary:hover { background: var(--accent-teal); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-secondary {
    width: 100%;
    padding: 14px;
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
    font-family: var(--font-body);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.15s ease;
    margin-top: 10px;
  }

  /* --- Chat Page --- */
  .chat-list-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .chat-list-item:hover {
    background: var(--bg-card-hover);
  }

  .chat-avatar {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .chat-avatar.team { background: rgba(249,161,44,0.18); color: var(--accent-amber); }
  .chat-avatar.direct { background: rgba(4,92,100,0.10); color: var(--accent-blue); }

  .chat-preview { flex: 1; overflow: hidden; }

  .chat-preview-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 2px;
  }

  .chat-preview-msg {
    font-size: 12px;
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chat-time {
    font-size: 11px;
    color: var(--text-dim);
    flex-shrink: 0;
  }

  .unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-green);
    flex-shrink: 0;
  }

  /* --- Chat Room --- */
  .chat-room-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }

  .back-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 12px;
  }

  .chat-message {
    margin-bottom: 14px;
  }

  .chat-message-author {
    font-size: 12px;
    font-weight: 600;
    color: var(--accent-teal);
    margin-bottom: 3px;
  }

  .chat-message-text {
    font-size: 14px;
    color: var(--text-primary);
    line-height: 1.5;
    background: var(--bg-card);
    padding: 10px 14px;
    border-radius: 12px 12px 12px 4px;
    display: inline-block;
    max-width: 85%;
  }

  .chat-message-time {
    font-size: 10px;
    color: var(--text-dim);
    margin-top: 3px;
  }

  .chat-input-bar {
    display: flex;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }

  .chat-input-bar input {
    flex: 1;
    padding: 12px 14px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 100px;
    color: var(--text-primary);
    font-size: 14px;
    font-family: var(--font-body);
    outline: none;
  }

  .chat-input-bar input:focus {
    border-color: var(--accent-green);
  }

  .chat-send-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--accent-green);
    color: var(--bg-deep);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s ease;
  }

  .chat-send-btn:hover { background: var(--accent-teal); }

  /* --- Info Page --- */
  .info-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
    margin-bottom: 12px;
  }

  .info-card h3 {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-primary);
  }

  .info-card p {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  /* --- Profile Setup Modal --- */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(25,40,50,0.45);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 200;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-sheet {
    background: var(--bg-card);
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 85vh;
    overflow-y: auto;
    padding: 28px 20px;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  .modal-handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--text-dim);
    margin: 0 auto 20px;
  }

  /* --- Pitch Detail --- */
  .detail-section {
    margin-bottom: 20px;
  }

  .detail-section h4 {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    margin-bottom: 8px;
  }

  .detail-section p {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  /* --- Data Notice --- */
  .data-notice {
    background: rgba(4,92,100,0.06);
    border: 1px solid rgba(4,92,100,0.10);
    border-radius: var(--radius-sm);
    padding: 14px;
    margin-top: 16px;
  }

  .link-btn {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: var(--teal);
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;
  }

  .data-notice p {
    font-size: 11px;
    color: var(--text-dim);
    line-height: 1.5;
  }

  /* --- Animations --- */
  .fade-in {
    animation: contentFade 0.3s ease;
  }

  @keyframes contentFade {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* --- Scrollbar --- */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  /* --- Programme extras --- */
  .schedule-note {
    font-size: 12px;
    color: var(--text-dim);
    background: var(--bg-surface);
    border-left: 3px solid var(--lime);
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    margin: 4px 0 14px;
  }

  .speaker-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 4px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
  }
  .speaker-row:last-child { border-bottom: none; }
  .speaker-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
  .speaker-aff { font-size: 12.5px; color: var(--text-secondary); margin-top: 2px; }

  .speaker-photo {
    border-radius: 14px;
    object-fit: cover;
    background: var(--bg-surface);
    flex-shrink: 0;
    display: block;
  }

  .avatar {
    border-radius: 14px;
    background: linear-gradient(135deg, var(--teal), var(--aqua));
    color: #fff;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }

  /* --- Venue map --- */
  .map-card {
    margin-top: 12px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--bg-surface);
  }
  .map-links {
    display: flex;
    justify-content: space-around;
    padding: 8px 6px;
    background: var(--bg-card);
    border-top: 1px solid var(--border);
  }
  .map-links a {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--teal);
    text-decoration: none;
  }

  .info-card a { color: var(--teal); }

  .sll-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-dim);
    padding: 18px 0 8px;
  }

  .sll-footer img {
    width: 150px;
    height: auto;
  }

  .offline-banner {
    background: #fff6e5;
    border: 1px solid #f0d9a8;
    color: #7a5a12;
    font-size: 12.5px;
    line-height: 1.5;
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    margin-bottom: 14px;
  }

  /* --- Live data UI --- */
  .empty-note {
    font-size: 13.5px;
    color: var(--text-dim);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 16px;
    text-align: center;
    margin: 12px 0;
  }
  .empty-note.error { color: #9b2c2c; background: #fdf2f2; border-color: #f5d5d5; }

  .tag-filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin: 14px 0 16px;
  }

  .tag-chip {
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 600;
    padding: 6px 11px;
    border-radius: 999px;
    border: 1px solid var(--border-light);
    background: var(--bg-card);
    color: var(--text-secondary);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .tag-chip.active {
    background: var(--teal);
    border-color: var(--teal);
    color: #fff;
  }

  .pitch-card-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.3;
    margin-bottom: 4px;
  }
  .pitch-card-author { font-size: 12.5px; color: var(--aqua); font-weight: 600; margin-bottom: 8px; }
  .pitch-card-problem {
    font-size: 13.5px;
    color: var(--text-secondary);
    line-height: 1.55;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .pitch-card-meta {
    margin-top: 10px;
    font-size: 12px;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .joined-flag {
    background: rgba(167,201,71,0.3);
    color: #4d6410;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
  }

  .reaction-count {
    margin-left: 4px;
    font-weight: 700;
    color: var(--teal);
  }

  /* --- Chat --- */
  .chat-page { display: flex; flex-direction: column; min-height: 70vh; }

  .chat-thread {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 6px 0 12px;
  }

  .chat-msg { max-width: 82%; align-self: flex-start; }
  .chat-msg.mine { align-self: flex-end; }

  .chat-msg-name {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--aqua);
    margin-bottom: 3px;
    padding-left: 2px;
  }

  .chat-bubble {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px 14px 14px 4px;
    padding: 10px 13px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-primary);
    word-break: break-word;
    white-space: pre-wrap;
  }
  .chat-msg.mine .chat-bubble {
    background: var(--teal);
    border-color: var(--teal);
    color: #fff;
    border-radius: 14px 14px 4px 14px;
  }

  .chat-input-row {
    position: sticky;
    bottom: 74px;
    display: flex;
    gap: 8px;
    padding: 10px 0;
    background: var(--bg-deep);
  }
  .chat-input-row .form-input { margin: 0; flex: 1; }

  .chat-send {
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 700;
    padding: 0 16px;
    border-radius: var(--radius-sm);
    border: none;
    background: var(--teal);
    color: #fff;
    cursor: pointer;
  }
  .chat-send:disabled { opacity: 0.4; cursor: default; }
`;

// ============================================================
// COMPONENTS
// ============================================================

// --- Navigation ---
function Avatar({ name, size = 44 }) {
  const initials = name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

function SpeakerPhoto({ speaker, size = 46 }) {
  if (!speaker.photo) return <Avatar name={speaker.name} size={size} />;
  return (
    <img
      className="speaker-photo"
      src={`${process.env.PUBLIC_URL}/speakers/${speaker.photo}`}
      alt={speaker.name}
      loading="lazy"
      style={{ width: size, height: size }}
    />
  );
}

function NavBar({ page, setPage }) {
  const items = [
    { id: "home", label: "Home", icon: <Icons.Home /> },
    { id: "schedule", label: "Schedule", icon: <Icons.Calendar /> },
    { id: "pitches", label: "Pitches", icon: <Icons.Zap /> },
    { id: "chat", label: "Chat", icon: <Icons.MessageCircle /> },
    { id: "info", label: "Info", icon: <Icons.Info /> },
  ];

  return (
    <nav className="nav-bar">
      {items.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${page === item.id ? "active" : ""}`}
          onClick={() => setPage(item.id)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}

// --- Home Page ---
function HomePage({ setPage }) {
  return (
    <div className="fade-in">
      <div className="hero-section">
        <img className="hero-image" src={process.env.PUBLIC_URL + "/hero.jpg"} alt="" />
        <img
          className="hero-logo"
          src={process.env.PUBLIC_URL + "/sll-logo-neg.png"}
          alt="SciLifeLab"
        />
        <div className="hero-overlay">
          <h1 className="hero-title">{CONFERENCE.name}</h1>
          <div className="hero-tagline">{CONFERENCE.tagline}</div>
          <div className="hero-meta">{CONFERENCE.dates} · {CONFERENCE.location}</div>
        </div>
      </div>

      <div className="quick-links">
        <div className="quick-link ql-blue" onClick={() => setPage("schedule")}>
          <div className="quick-link-icon"><Icons.Calendar /></div>
          <div className="quick-link-label">Schedule</div>
        </div>
        <div className="quick-link ql-amber" onClick={() => setPage("pitches")}>
          <div className="quick-link-icon"><Icons.Zap /></div>
          <div className="quick-link-label">Pitch Slam</div>
        </div>
        <div className="quick-link ql-rose" onClick={() => setPage("chat")}>
          <div className="quick-link-icon"><Icons.MessageCircle /></div>
          <div className="quick-link-label">Chat</div>
        </div>
        <div className="quick-link ql-teal" onClick={() => setPage("info")}>
          <div className="quick-link-icon"><Icons.Map /></div>
          <div className="quick-link-label">Venue & Info</div>
        </div>
      </div>

      <div className="pitch-banner" onClick={() => setPage("pitches")}>
        <div className="pitch-banner-label">Core Feature</div>
        <h3>🎤 Pitch Slam</h3>
        <p>
          Submit your cross-disciplinary project idea, form a team during the conference,
          and pitch your proposal to funding stakeholders on Day 3. Promising ideas will be recognised.
        </p>
      </div>

      <div className="data-notice">
        <p>
          🔒 Pick any display name you like - there is no login and we never ask for
          an email address or phone number. What you post is stored with an external
          provider inside the EU and deleted 30 days after the conference.{" "}
          <button className="link-btn" onClick={() => setPage("info")}>Full details</button>
        </p>
      </div>
    </div>
  );
}

// --- Session Reactions Component ---
const REACTION_OPTIONS = [
  { emoji: "💡", label: "Inspiring" },
  { emoji: "🧠", label: "Thought-provoking" },
  { emoji: "🤝", label: "Want to collaborate" },
  { emoji: "🔥", label: "Highly relevant" },
];

function SessionReactions({ sessionKey, reactions, onReact }) {
  const current = reactions[sessionKey] || {};
  return (
    <div className="session-reactions">
      {REACTION_OPTIONS.map((r) => {
        const cell = current[r.emoji];
        const mine = !!(cell && cell.mine);
        const count = cell ? cell.count : 0;
        return (
          <button
            key={r.emoji}
            className={`reaction-btn ${mine ? "reacted" : ""}`}
            onClick={(e) => { e.stopPropagation(); onReact(r.emoji, mine); }}
            title={r.label}
          >
            <span className="reaction-emoji">{r.emoji}</span>
            <span className="reaction-label">{r.label}</span>
            {count > 0 && <span className="reaction-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// --- Schedule Page ---
function SchedulePage() {
  const [activeDay, setActiveDay] = useState(1);
  const [view, setView] = useState("days"); // days | speakers
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [activeAbstract, setActiveAbstract] = useState(null);
  const [reactions, setReactions] = useState({});
  const { user } = useApp();

  useEffect(() => {
    if (!user) return;
    let alive = true;
    listReactions()
      .then((rows) => { if (alive) setReactions(tallyReactions(rows, user.id)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [user]);

  const toggleReaction = async (sessionKey, emoji, mine) => {
    if (!user) return;
    setReactions((prev) => applyReaction(prev, sessionKey, emoji, !mine));
    try {
      if (mine) await removeReaction(sessionKey, user.id, emoji);
      else await addReaction(sessionKey, user.id, emoji);
    } catch {
      setReactions((prev) => applyReaction(prev, sessionKey, emoji, mine));
    }
  };
  const dayData = SCHEDULE.find((d) => d.day === activeDay);

  const badgeClass = (type) => {
    const map = { pitch: "badge-pitch", session: "badge-session", plenary: "badge-plenary", social: "badge-social", break: "badge-break" };
    return map[type] || "";
  };

  const badgeLabel = (type) => {
    const map = { pitch: "Pitch Slam", session: "Session", plenary: "Plenary", social: "Social", break: "Break" };
    return map[type] || "";
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Programme</h1>
      </div>

      <div className="day-tabs">
        {SCHEDULE.map((d) => (
          <button
            key={d.day}
            className={`day-tab ${view === "days" && activeDay === d.day ? "active" : ""}`}
            onClick={() => { setView("days"); setActiveDay(d.day); }}
          >
            Day {d.day} · {d.date}
          </button>
        ))}
        <button
          className={`day-tab ${view === "speakers" ? "active" : ""}`}
          onClick={() => setView("speakers")}
        >
          Speakers
        </button>
      </div>

      {view === "speakers" && (
        <div>
          <div className="schedule-note">Confirmed speakers. Tap a name for details.</div>
          {SPEAKER_LIST.map((sp) => (
            <div className="speaker-row" key={sp.id} onClick={() => setActiveSpeaker(sp)}>
              <SpeakerPhoto speaker={sp} />
              <div>
                <div className="speaker-name">{sp.name}</div>
                <div className="speaker-aff">{sp.affiliation}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "days" && (<>
      <div className="schedule-note">{SCHEDULE_NOTE}</div>
      <div style={{ marginBottom: 8, fontSize: 15, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--accent-teal)" }}>
        {dayData.title}
      </div>

      <div>
        {dayData.sessions.map((s, i) => {
          const sessionKey = `${activeDay}-${i}`;
          const hasReactions = s.type === "session" || s.type === "plenary" || s.type === "pitch";
          return (
            <div className="session-card" key={i}>
              <div className="session-time">{s.time}</div>
              <div className="session-info">
                <span className={`session-type-badge ${badgeClass(s.type)}`}>
                  {badgeLabel(s.type)}
                </span>
                <div
                  className="session-title"
                  style={(s.abstract || s.themeId) ? { cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--border-light)", textUnderlineOffset: 3, textDecorationThickness: 1 } : {}}
                  onClick={() => (s.abstract || s.themeId) && setActiveAbstract(s)}
                >
                  {s.title}
                </div>
                <div className="session-speaker">
                  {s.speakerId ? (
                    <span
                      style={{ cursor: "pointer", color: "var(--accent-teal)", borderBottom: "1px dotted var(--accent-teal)" }}
                      onClick={(e) => { e.stopPropagation(); setActiveSpeaker(SPEAKERS[s.speakerId]); }}
                    >
                      {s.speaker}
                    </span>
                  ) : (
                    s.speaker
                  )}
                </div>
                {hasReactions && (
                  <SessionReactions
                    sessionKey={sessionKey}
                    reactions={reactions}
                    onReact={(emoji, mine) => toggleReaction(sessionKey, emoji, mine)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      </>)}

      {/* Speaker Profile Modal */}
      {activeSpeaker && (
        <div className="modal-overlay" onClick={() => setActiveSpeaker(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
              <SpeakerPhoto speaker={activeSpeaker} size={68} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  {activeSpeaker.name}
                </div>
                <div style={{ fontSize: 13, color: "var(--accent-teal)", marginTop: 2 }}>
                  {activeSpeaker.affiliation}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>
              {activeSpeaker.bio || "Talk title and biography coming soon."}
            </div>
            <button
              className="btn-secondary"
              onClick={() => setActiveSpeaker(null)}
              style={{ marginTop: 20 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Abstract Modal */}
      {activeAbstract && (
        <div className="modal-overlay" onClick={() => setActiveAbstract(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <span className={`session-type-badge ${badgeClass(activeAbstract.type)}`} style={{ marginBottom: 8 }}>
              {badgeLabel(activeAbstract.type)}
            </span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, lineHeight: 1.3, marginBottom: 6, color: "var(--text-primary)" }}>
              {activeAbstract.title}
            </h2>
            {activeAbstract.speakerId && (
              <div style={{ fontSize: 14, color: "var(--accent-teal)", marginBottom: 16, fontWeight: 500 }}>
                {activeAbstract.speaker} · {SPEAKERS[activeAbstract.speakerId]?.affiliation}
              </div>
            )}
            {!activeAbstract.speakerId && activeAbstract.speaker && (
              <div style={{ fontSize: 14, color: "var(--accent-teal)", marginBottom: 16, fontWeight: 500 }}>
                {activeAbstract.speaker}
              </div>
            )}
            <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {activeAbstract.abstract || THEMES.find((t) => t.id === activeAbstract.themeId)?.blurb}
            </div>
            {activeAbstract.themeId && (
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 12 }}>
                Speakers and talk titles for this session will be announced closer to the conference.
              </div>
            )}
            <button
              className="btn-secondary"
              onClick={() => setActiveAbstract(null)}
              style={{ marginTop: 20 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Pitches Page ---
function PitchesPage({ setPage, setChatRoom }) {
  const { user, config, profilesById } = useApp();
  const [view, setView] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [filterTag, setFilterTag] = useState(null);
  const [pitches, setPitches] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const open = config.pitch_submissions_open === true;

  const refresh = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([listPitches(), listMembers()]);
      setPitches(p);
      setMembers(m);
      setError(null);
    } catch (e) {
      setError("Could not load pitches. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  const memberCount = (id) => members.filter((m) => m.pitch_id === id).length;
  const hasJoined = (id) => members.some((m) => m.pitch_id === id && m.user_id === user?.id);

  const toggleJoin = async (pitchId) => {
    const joined = hasJoined(pitchId);
    setMembers((prev) => joined
      ? prev.filter((m) => !(m.pitch_id === pitchId && m.user_id === user.id))
      : [...prev, { pitch_id: pitchId, user_id: user.id }]);
    try {
      if (joined) await leavePitch(pitchId, user.id);
      else await joinPitch(pitchId, user.id);
    } catch {
      refresh();
    }
  };

  const selected = pitches.find((p) => p.id === selectedId);

  if (view === "submit") {
    return <PitchSubmitForm onBack={() => { setView("list"); refresh(); }} />;
  }

  if (view === "detail" && selected) {
    return (
      <PitchDetail
        pitch={selected}
        joined={hasJoined(selected.id)}
        memberCount={memberCount(selected.id)}
        members={members.filter((m) => m.pitch_id === selected.id).map((m) => profilesById[m.user_id]).filter(Boolean)}
        onJoin={() => toggleJoin(selected.id)}
        onOpenChat={() => { setChatRoom(`pitch:${selected.id}`); setPage("chat"); }}
        onBack={() => setView("list")}
      />
    );
  }

  const shown = filterTag ? pitches.filter((p) => (p.looking_for || []).includes(filterTag)) : pitches;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Pitch Slam</h1>
        <p>Browse ideas, join a team, or put your own idea forward.</p>
      </div>

      {open ? (
        <button className="btn-primary" onClick={() => setView("submit")}>
          + Submit your pitch
        </button>
      ) : (
        <div className="schedule-note">
          Pitch submissions are not open yet. They open during the conference - watch the programme.
        </div>
      )}

      <div className="tag-filter-row">
        <button className={`tag-chip ${!filterTag ? "active" : ""}`} onClick={() => setFilterTag(null)}>All</button>
        {EXPERTISE_TAGS.map((t) => (
          <button key={t} className={`tag-chip ${filterTag === t ? "active" : ""}`} onClick={() => setFilterTag(filterTag === t ? null : t)}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="empty-note">Loading...</div>}
      {error && <div className="empty-note error">{error}</div>}

      {!loading && !error && shown.length === 0 && (
        <div className="empty-note">
          {pitches.length === 0
            ? "No pitches yet. The first one could be yours."
            : "No pitches looking for that expertise yet."}
        </div>
      )}

      {shown.map((p) => (
        <div key={p.id} className="pitch-card" onClick={() => { setSelectedId(p.id); setView("detail"); }}>
          <div className="pitch-card-title">{p.title}</div>
          <div className="pitch-card-author">{p.author_name}{p.author_affiliation ? ` · ${p.author_affiliation}` : ""}</div>
          <div className="pitch-card-problem">{p.problem}</div>
          <div className="pitch-tags">
            {(p.looking_for || []).map((t) => <span key={t} className="pitch-tag">{t}</span>)}
          </div>
          <div className="pitch-card-meta">
            {memberCount(p.id)} {memberCount(p.id) === 1 ? "person" : "people"} on this team
            {hasJoined(p.id) && <span className="joined-flag">You joined</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Pitch Detail ---
function PitchDetail({ pitch, joined, memberCount, members, onJoin, onOpenChat, onBack }) {
  return (
    <div className="fade-in">
      <button className="back-btn" onClick={onBack}>← Back to pitches</button>
      <div className="page-header">
        <h1>{pitch.title}</h1>
        <p>{pitch.author_name}{pitch.author_affiliation ? ` · ${pitch.author_affiliation}` : ""}</p>
      </div>

      <div className="info-card">
        <h3>The challenge</h3>
        <p>{pitch.problem}</p>
      </div>

      {pitch.approach && (
        <div className="info-card">
          <h3>What we bring</h3>
          <p>{pitch.approach}</p>
        </div>
      )}

      <div className="info-card">
        <h3>Looking for</h3>
        <div className="pitch-tags">
          {(pitch.looking_for || []).map((t) => <span key={t} className="pitch-tag">{t}</span>)}
        </div>
      </div>

      <div className="info-card">
        <h3>Team ({memberCount})</h3>
        {members.length === 0 ? (
          <p>Nobody has joined yet.</p>
        ) : (
          <p>{members.map((m) => m.display_name).join(", ")}</p>
        )}
      </div>

      <button className={joined ? "btn-secondary" : "btn-primary"} onClick={onJoin}>
        {joined ? "Leave this team" : "Join this team"}
      </button>

      {joined && (
        <button className="btn-secondary" style={{ marginTop: 10 }} onClick={onOpenChat}>
          Open team chat
        </button>
      )}
    </div>
  );
}

// --- Pitch Submit Form ---
function PitchSubmitForm({ onBack }) {
  const { user, profile } = useApp();
  const [form, setForm] = useState({
    author_name: profile?.display_name || "",
    author_affiliation: profile?.affiliation || "",
    title: "",
    problem: "",
    approach: "",
    looking_for: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  // Note: must read from the previous state, not the captured `form` - two quick
  // taps on different tags would otherwise overwrite each other.
  const toggleTag = (t) =>
    setForm((f) => ({
      ...f,
      looking_for: f.looking_for.includes(t)
        ? f.looking_for.filter((x) => x !== t)
        : [...f.looking_for, t],
    }));

  const valid = form.author_name.trim() && form.title.trim().length >= 3 && form.problem.trim().length >= 10;

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      await createPitch(user.id, {
        author_name: form.author_name.trim(),
        author_affiliation: form.author_affiliation.trim() || null,
        title: form.title.trim(),
        problem: form.problem.trim(),
        approach: form.approach.trim() || null,
        looking_for: form.looking_for,
      });
      setDone(true);
    } catch (e) {
      setError(e.message && e.message.includes("row-level security")
        ? "Submissions are not open yet."
        : "Could not submit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="fade-in">
        <div className="page-header"><h1>Pitch submitted</h1></div>
        <div className="info-card">
          <p>It is now visible to everyone. People can join your team from the pitch list.</p>
        </div>
        <button className="btn-primary" onClick={onBack}>Back to pitches</button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <button className="back-btn" onClick={onBack}>← Cancel</button>
      <div className="page-header">
        <h1>Submit your pitch</h1>
        <p>Others will read this and decide whether to join you. Keep it concrete.</p>
      </div>

      <label className="form-label">Your name</label>
      <input className="form-input" value={form.author_name} onChange={(e) => set("author_name", e.target.value)} placeholder="e.g. Anna Svensson" />

      <label className="form-label">Affiliation</label>
      <input className="form-input" value={form.author_affiliation} onChange={(e) => set("author_affiliation", e.target.value)} placeholder="e.g. Uppsala University" />

      <label className="form-label">Title of your idea</label>
      <input className="form-input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Cellular drought memory for climate-resilient crops" />

      <label className="form-label">The challenge</label>
      <textarea className="form-textarea" value={form.problem} onChange={(e) => set("problem", e.target.value)} placeholder="What scientific problem do you want to tackle across disciplines?" />

      <label className="form-label">What you already bring</label>
      <textarea className="form-textarea" value={form.approach} onChange={(e) => set("approach", e.target.value)} placeholder="Existing work, data or methods this could build on." />

      <label className="form-label">Expertise you are looking for</label>
      <div className="tag-filter-row">
        {EXPERTISE_TAGS.map((t) => (
          <button key={t} className={`tag-chip ${form.looking_for.includes(t) ? "active" : ""}`} onClick={() => toggleTag(t)}>{t}</button>
        ))}
      </div>

      {error && <div className="empty-note error">{error}</div>}

      <button className="btn-primary" disabled={!valid || saving} onClick={submit}>
        {saving ? "Submitting..." : "Submit pitch"}
      </button>
    </div>
  );
}

// --- Chat Page ---
function ChatPage({ chatRoom, setChatRoom }) {
  const { user, profile, profilesById, config } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [rooms, setRooms] = useState([{ id: "general", label: "Everyone" }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  const room = chatRoom || "general";
  const chatOpen = config.chat_open !== false;

  // Team rooms for the pitches you joined
  useEffect(() => {
    if (!user) return;
    Promise.all([listMembers(), listPitches()])
      .then(([m, p]) => {
        const mine = m.filter((x) => x.user_id === user.id).map((x) => x.pitch_id);
        const teamRooms = p.filter((x) => mine.includes(x.id))
          .map((x) => ({ id: `pitch:${x.id}`, label: x.title }));
        setRooms([{ id: "general", label: "Everyone" }, ...teamRooms]);
      })
      .catch(() => {});
  }, [user]);

  // Messages + live updates
  useEffect(() => {
    if (!user) return;
    let alive = true;
    setLoading(true);
    listMessages(room)
      .then((rows) => { if (alive) { setMessages(rows); setError(null); } })
      .catch(() => { if (alive) setError("Could not load messages."); })
      .finally(() => { if (alive) setLoading(false); });

    const unsub = subscribeToRoom(room, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return () => { alive = false; unsub(); };
  }, [room, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const body = input.trim();
    if (!body || !user) return;
    setInput("");
    try {
      await sendMessage(room, user.id, body);
    } catch {
      setError("Message not sent.");
      setInput(body);
    }
  };

  const nameFor = (id) =>
    id === user?.id ? (profile?.display_name || "You") : (profilesById[id]?.display_name || "Someone");

  return (
    <div className="fade-in chat-page">
      <div className="page-header">
        <h1>Chat</h1>
        <p>Visible to everyone at the conference - not a private channel.</p>
      </div>

      {rooms.length > 1 && (
        <div className="day-tabs">
          {rooms.map((r) => (
            <button key={r.id} className={`day-tab ${room === r.id ? "active" : ""}`} onClick={() => setChatRoom(r.id)}>
              {r.label.length > 24 ? r.label.slice(0, 24) + "..." : r.label}
            </button>
          ))}
        </div>
      )}

      <div className="chat-thread">
        {loading && <div className="empty-note">Loading...</div>}
        {error && <div className="empty-note error">{error}</div>}
        {!loading && messages.length === 0 && (
          <div className="empty-note">No messages yet. Say hello.</div>
        )}
        {messages.map((m) => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={`chat-msg ${mine ? "mine" : ""}`}>
              {!mine && <div className="chat-msg-name">{nameFor(m.user_id)}</div>}
              <div className="chat-bubble">{m.body}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {chatOpen ? (
        <div className="chat-input-row">
          <input
            className="form-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Type a message..."
          />
          <button className="chat-send" onClick={send} disabled={!input.trim()}>Send</button>
        </div>
      ) : (
        <div className="schedule-note">Chat is closed.</div>
      )}
    </div>
  );
}

// --- Info Page ---
const HOTELS = [
  "Elite Hotel Academia", "Grand Hotell Hörnan", "Radisson Blu Hotel", "Clarion Gillet",
  "Best Western Svava", "Home Hotel Uppsala", "Akademihotellet", "Hotell Stella",
  "Hotell Centralstation", "Uppsala City Hostel",
];

function VenueMap() {
  const d = 0.004;
  const bbox = `${VENUE.lon - d * 1.6},${VENUE.lat - d},${VENUE.lon + d * 1.6},${VENUE.lat + d}`;
  const osm = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${VENUE.lat},${VENUE.lon}`;
  const q = encodeURIComponent(`${VENUE.name}, ${VENUE.address}`);
  return (
    <div className="map-card">
      <iframe
        title="Map of the venue"
        src={osm}
        loading="lazy"
        referrerPolicy="no-referrer"
        style={{ width: "100%", height: 220, border: 0, display: "block" }}
      />
      <div className="map-links">
        <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer">Google Maps</a>
        <a href={`https://maps.apple.com/?q=${q}`} target="_blank" rel="noreferrer">Apple Maps</a>
        <a href={`https://www.openstreetmap.org/?mlat=${VENUE.lat}&mlon=${VENUE.lon}#map=17/${VENUE.lat}/${VENUE.lon}`} target="_blank" rel="noreferrer">OpenStreetMap</a>
      </div>
    </div>
  );
}

function InfoPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Practical Info</h1>
      </div>

      <div className="info-card">
        <h3>📍 Venue</h3>
        <p>
          <strong>{VENUE.name}</strong><br />
          {VENUE.address}<br />
          Lecture hall: <strong>{VENUE.room}</strong><br />
          The University Main Building (the "Aula") sits in the University Park next to Uppsala Cathedral,
          about 15 minutes on foot from Uppsala Central Station.
        </p>
        <VenueMap />
      </div>

      <div className="info-card">
        <h3>📅 Dates</h3>
        <p>
          {CONFERENCE.dates}<br />
          {SCHEDULE.map((d) => (
            <span key={d.day}>Day {d.day} ({d.date}): {d.title}<br /></span>
          ))}
        </p>
      </div>

      <div className="info-card">
        <h3>🧭 Sessions</h3>
        <p>
          {THEMES.map((t) => (
            <span key={t.id}><strong>Session {t.id}:</strong> {t.title}<br /></span>
          ))}
        </p>
      </div>

      <div className="info-card">
        <h3>✈️ Getting to Uppsala</h3>
        <p>
          <strong>From Stockholm Arlanda Airport (ARN)</strong><br />
          Train: about 20 min to Uppsala Central Station (SEK 120-210)<br />
          Bus UL 801: about 50 min (SEK 120)<br />
          Taxi: fixed price SEK 675 + SEK 30 airport fee<br /><br />
          <strong>From Stockholm Central Station</strong><br />
          Frequent direct trains, about 40 min.
        </p>
      </div>

      <div className="info-card">
        <h3>🏨 Accommodation</h3>
        <p>
          Participants book and pay for their own accommodation. Hotels within a 10-15 minute walk of the venue:<br />
          {HOTELS.join(" · ")}
        </p>
      </div>

      <div className="info-card">
        <h3>📶 WiFi</h3>
        <p>
          Eduroam is available throughout the building. A guest network and password
          will be displayed at the registration desk.
        </p>
      </div>

      <div className="info-card">
        <h3>🎤 Pitch Slam - How It Works</h3>
        <p>
          1. Submit your project idea in this app<br />
          2. Present a short pitch at the kick-off on Day 1<br />
          3. Other participants join your team via the app<br />
          4. Work on the idea during breaks and mingles<br />
          5. Present your team's proposal at the Pitch Finals on Day 3<br />
          6. Funding stakeholders react - promising ideas will be recognised
        </p>
      </div>

      <div className="info-card">
        <h3>🏆 Best Poster Award</h3>
        <p>
          Sponsored by the New Phytologist Foundation. Bring your poster to the welcome reception on Day 1.
        </p>
      </div>

      <div className="info-card">
        <h3>🔒 Data & Privacy</h3>
        <p>
          <strong>What this app stores</strong><br />
          A display name you choose yourself; any pitch you submit, together with the name
          and affiliation you put on it; which team you join; messages you send in the app;
          and anonymous reactions to sessions.
        </p>
        <p>
          <strong>You choose how identifiable you are</strong><br />
          Your display name can be your real name or anything else. There is no login,
          and we never ask for an email address or a phone number.
        </p>
        <p>
          <strong>Where it is stored</strong><br />
          With Supabase, an external provider, on servers inside the EU. They process the
          data on our behalf under the EU standard contractual clauses. Technical data such
          as IP addresses is handled by the provider for security and is not used by the organisers.
        </p>
        <p>
          <strong>How long</strong><br />
          Everything is deleted 30 days after the conference, by 30 November 2026.
          If you want to keep in touch with someone you met here, exchange details directly.
        </p>
        <p>
          Uppsala University is responsible for this processing. Questions, or want something
          removed sooner? Write to <a href="mailto:anabella.aguilera@scilifelab.se">anabella.aguilera@scilifelab.se</a>.
        </p>
      </div>

      <div className="info-card">
        <h3>📧 Contact</h3>
        <p>
          Programme & abstracts: <a href="mailto:anabella.aguilera@scilifelab.se">anabella.aguilera@scilifelab.se</a><br />
          Registration & practicalities: <a href="mailto:PlanetaryBiology2026@akademikonferens.se">PlanetaryBiology2026@akademikonferens.se</a><br />
          Website: <a href={CONFERENCE.website} target="_blank" rel="noreferrer">Conference website</a>
        </p>
      </div>

      <div className="info-card">
        <h3>👥 Organizing Committee</h3>
        <p>
          Olga Vinnere Pettersson, Anabella Aguilera, Fevziye Hasan, Amy Gladfelter,
          Monica Bettencourt Dias, Gautam Dey, Guillermina Kubaczka, Nathaniel Street
        </p>
      </div>

      <div className="sll-footer">
        <span>Organised by</span>
        <img src={process.env.PUBLIC_URL + "/sll-logo-pos.png"} alt="SciLifeLab" />
        <span>Planetary Biology</span>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
function OfflineNote({ what }) {
  return (
    <div className="fade-in">
      <div className="page-header"><h1>{what}</h1></div>
      <div className="empty-note">
        This part needs a connection to the conference server, and there isn't one
        right now. Try again when you are back on wifi - nothing you wrote has been lost.
      </div>
    </div>
  );
}

function Onboarding({ onDone }) {
  const { user } = useApp();
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [intro, setIntro] = useState("");
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (t) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const p = await saveProfile(user.id, {
        display_name: name.trim(),
        affiliation: affiliation.trim() || null,
        intro: intro.trim() || null,
        tags,
      });
      onDone(p);
    } catch {
      setError("Could not save. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Welcome</h1>
        <p>
          Set up how you appear to other participants. You can use your real name
          or stay anonymous - it is up to you, and you can change it later.
        </p>
      </div>

      <label className="form-label">Display name</label>
      <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="How others will see you" />

      <label className="form-label">Affiliation (optional)</label>
      <input className="form-input" value={affiliation} onChange={(e) => setAffiliation(e.target.value)} placeholder="e.g. Uppsala University" />

      <label className="form-label">One line about what you work on (optional)</label>
      <textarea className="form-textarea" value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="What brings you to this conference?" />

      <label className="form-label">Your expertise - pick any that fit</label>
      <div className="tag-filter-row">
        {EXPERTISE_TAGS.map((t) => (
          <button key={t} className={`tag-chip ${tags.includes(t) ? "active" : ""}`} onClick={() => toggle(t)}>{t}</button>
        ))}
      </div>

      {error && <div className="empty-note error">{error}</div>}

      <button className="btn-primary" disabled={!name.trim() || saving} onClick={submit}>
        {saving ? "Saving..." : "Enter the app"}
      </button>

      <div className="data-notice" style={{ marginTop: 18 }}>
        <p>
          🔒 Stored with an external provider inside the EU and deleted 30 days
          after the conference. No email address or phone number is collected.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [chatRoom, setChatRoom] = useState("general");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [config, setConfig] = useState({});
  const [profilesById, setProfilesById] = useState({});
  const [status, setStatus] = useState("loading"); // loading | onboarding | ready | offline

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await ensureSession();
        if (!alive) return;
        setUser(u);
        const [prof, cfg, everyone] = await Promise.all([
          getMyProfile(u.id),
          getConfig().catch(() => ({})),
          listProfiles().catch(() => []),
        ]);
        if (!alive) return;
        setConfig(cfg);
        setProfilesById(Object.fromEntries(everyone.map((p) => [p.id, p])));
        if (prof) { setProfile(prof); setStatus("ready"); }
        else setStatus("onboarding");
      } catch {
        if (alive) setStatus("offline");
      }
    })();
    return () => { alive = false; };
  }, []);

  const offline = status === "offline";
  const ctx = { user, profile, setProfile, config, profilesById, offline };

  if (status === "loading") {
    return (
      <>
        <style>{css}</style>
        <div className="app-container"><div className="page-content">
          <div className="empty-note" style={{ marginTop: 60 }}>Connecting...</div>
        </div></div>
      </>
    );
  }

  return (
    <AppCtx.Provider value={ctx}>
      <style>{css}</style>
      <div className="app-container">
        <div className="page-content">
          {offline && (
            <div className="offline-banner">
              No connection to the conference server - pitches and chat are unavailable.
              The programme and practical info below are up to date.
            </div>
          )}
          {status === "onboarding" ? (
            <Onboarding onDone={(p) => {
              setProfile(p);
              setProfilesById((prev) => ({ ...prev, [p.id]: p }));
              setStatus("ready");
            }} />
          ) : (
            <>
              {page === "home" && <HomePage setPage={setPage} />}
              {page === "schedule" && <SchedulePage />}
              {page === "pitches" && (offline ? <OfflineNote what="Pitch Slam" /> : <PitchesPage setPage={setPage} setChatRoom={setChatRoom} />)}
              {page === "chat" && (offline ? <OfflineNote what="Chat" /> : <ChatPage chatRoom={chatRoom} setChatRoom={setChatRoom} />)}
              {page === "info" && <InfoPage />}
            </>
          )}
        </div>
        {status !== "onboarding" && <NavBar page={page} setPage={setPage} />}
      </div>
    </AppCtx.Provider>
  );
}
