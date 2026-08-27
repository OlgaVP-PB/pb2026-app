import { useState, useEffect, useRef } from "react";

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
          🔒 This app stores minimal data. No emails or phone numbers are collected.
          Chat profiles are self-created and anonymous by default.
          All data will be deleted 30 days after the conference ends.
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
      {REACTION_OPTIONS.map((r) => (
        <button
          key={r.emoji}
          className={`reaction-btn ${current[r.emoji] ? "reacted" : ""}`}
          onClick={(e) => { e.stopPropagation(); onReact(r.emoji); }}
          title={r.label}
        >
          <span className="reaction-emoji">{r.emoji}</span>
          <span className="reaction-label">{r.label}</span>
        </button>
      ))}
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
                    onReact={(emoji) => {
                      setReactions((prev) => {
                        const current = prev[sessionKey] || {};
                        if (current[emoji]) {
                          const next = { ...current };
                          delete next[emoji];
                          return { ...prev, [sessionKey]: next };
                        }
                        return { ...prev, [sessionKey]: { ...current, [emoji]: true } };
                      });
                    }}
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
function PitchesPage() {
  const [view, setView] = useState("list"); // list | detail | submit
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [joined, setJoined] = useState(new Set());
  const [filterTag, setFilterTag] = useState(null);

  if (view === "submit") {
    return <PitchSubmitForm onBack={() => setView("list")} />;
  }

  if (view === "detail" && selectedPitch) {
    return (
      <PitchDetail
        pitch={selectedPitch}
        joined={joined.has(selectedPitch.id)}
        onJoin={() => {
          const next = new Set(joined);
          if (next.has(selectedPitch.id)) next.delete(selectedPitch.id);
          else next.add(selectedPitch.id);
          setJoined(next);
        }}
        onBack={() => setView("list")}
      />
    );
  }

  const filteredPitches = filterTag
    ? DEMO_PITCHES.filter((p) => p.lookingFor.includes(filterTag))
    : DEMO_PITCHES;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Pitch Slam</h1>
        <p>Browse project ideas and join teams for cross-disciplinary collaboration</p>
      </div>

      <button className="btn-primary" onClick={() => setView("submit")} style={{ marginBottom: 16 }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Icons.Plus /> Submit Your Pitch
        </span>
      </button>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Filter by expertise needed
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button
            className={`tag-option ${!filterTag ? "selected" : ""}`}
            onClick={() => setFilterTag(null)}
          >
            All
          </button>
          {["Cell Biology", "Ecology", "Genomics", "Data Science / AI", "Bioinformatics", "Marine Biology"].map((tag) => (
            <button
              key={tag}
              className={`tag-option ${filterTag === tag ? "selected" : ""}`}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {filteredPitches.map((pitch) => (
        <div
          className="pitch-card"
          key={pitch.id}
          onClick={() => { setSelectedPitch(pitch); setView("detail"); }}
        >
          <div className="pitch-author">{pitch.name}</div>
          <div className="pitch-affiliation">{pitch.affiliation}</div>
          <h3>{pitch.title}</h3>
          <div className="pitch-tags" style={{ marginTop: 10 }}>
            {pitch.lookingFor.map((tag) => (
              <span className="pitch-tag looking-for" key={tag}>{tag}</span>
            ))}
          </div>
          <div className="pitch-actions">
            <span className="pitch-interest-count">{pitch.interested + (joined.has(pitch.id) ? 1 : 0)} interested</span>
            <Icons.ChevronRight />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Pitch Detail ---
function PitchDetail({ pitch, joined, onJoin, onBack }) {
  return (
    <div className="fade-in">
      <div className="chat-room-header">
        <button className="back-btn" onClick={onBack}><Icons.Back /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{pitch.title}</div>
        </div>
      </div>

      <div className="pitch-author" style={{ fontSize: 15 }}>{pitch.name}</div>
      <div className="pitch-affiliation" style={{ marginBottom: 20 }}>{pitch.affiliation}</div>

      <div className="detail-section">
        <h4>The Problem / Question</h4>
        <p>{pitch.problem}</p>
      </div>

      <div className="detail-section">
        <h4>Our Approach</h4>
        <p>{pitch.approach}</p>
      </div>

      <div className="detail-section">
        <h4>Looking for Expertise in</h4>
        <div className="pitch-tags" style={{ marginTop: 4 }}>
          {pitch.lookingFor.map((tag) => (
            <span className="pitch-tag looking-for" key={tag}>{tag}</span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: "var(--text-dim)" }}>
        {pitch.interested + (joined ? 1 : 0)} researchers interested
      </div>

      <button className={`btn-im-in ${joined ? "joined" : ""}`} onClick={onJoin} style={{ width: "100%", padding: 14 }}>
        {joined ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icons.Check /> You're In!
          </span>
        ) : (
          "I'm In - Join This Project"
        )}
      </button>

      {joined && (
        <div style={{ marginTop: 12, padding: 14, background: "rgba(167,201,71,0.18)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(167,201,71,0.28)" }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            You've joined this pitch team! Check the <strong>Chat</strong> tab for the team discussion,
            and connect with other team members during coffee breaks and mingles.
          </p>
        </div>
      )}
    </div>
  );
}

// --- Pitch Submit Form ---
function PitchSubmitForm({ onBack }) {
  const [formData, setFormData] = useState({
    name: "",
    affiliation: "",
    title: "",
    problem: "",
    approach: "",
    lookingFor: [],
  });
  const [submitted, setSubmitted] = useState(false);

  const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;
  const WORD_LIMIT = 150;

  const toggleTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      lookingFor: prev.lookingFor.includes(tag)
        ? prev.lookingFor.filter((t) => t !== tag)
        : [...prev.lookingFor, tag],
    }));
  };

  const canSubmit =
    formData.name &&
    formData.affiliation &&
    formData.title &&
    formData.problem &&
    formData.approach &&
    formData.lookingFor.length > 0 &&
    wordCount(formData.problem) <= WORD_LIMIT &&
    wordCount(formData.approach) <= WORD_LIMIT;

  if (submitted) {
    return (
      <div className="fade-in" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🎤</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 12 }}>
          Pitch Submitted!
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 300, margin: "0 auto 24px" }}>
          Your project idea has been received. Prepare your 2-minute presentation for Day 1 - and get ready to meet your future collaborators.
        </p>
        <button className="btn-primary" onClick={onBack} style={{ maxWidth: 240, margin: "0 auto" }}>
          Back to Pitches
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="chat-room-header">
        <button className="back-btn" onClick={onBack}><Icons.Back /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Submit a Pitch</div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 24 }}>
        Propose a cross-disciplinary project idea. You'll have 2 minutes to pitch it on Day 1.
        Other researchers can then join your team to develop the idea throughout the conference.
      </p>

      <div className="form-section">
        <label className="form-label">Your Name</label>
        <input
          className="form-input"
          placeholder="e.g. Dr. Anna Svensson"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="form-section">
        <label className="form-label">Affiliation</label>
        <input
          className="form-input"
          placeholder="e.g. Uppsala University"
          value={formData.affiliation}
          onChange={(e) => setFormData({ ...formData, affiliation: e.target.value })}
        />
      </div>

      <div className="form-section">
        <label className="form-label">Pitch Title</label>
        <span className="form-hint">Short and catchy - max 10 words</span>
        <input
          className="form-input"
          placeholder="e.g. Cellular drought memory for climate-resilient crops"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div className="form-section">
        <label className="form-label">The Problem / Scientific Question</label>
        <span className="form-hint">What big question are you tackling? (max {WORD_LIMIT} words)</span>
        <textarea
          className="form-textarea"
          placeholder="Describe the scientific challenge you want to address through cross-disciplinary collaboration..."
          value={formData.problem}
          onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
        />
        <div className={`word-count ${wordCount(formData.problem) > WORD_LIMIT ? "over" : ""}`}>
          {wordCount(formData.problem)} / {WORD_LIMIT} words
        </div>
      </div>

      <div className="form-section">
        <label className="form-label">Your Approach / What You Bring</label>
        <span className="form-hint">What expertise or data do you bring to the table? (max {WORD_LIMIT} words)</span>
        <textarea
          className="form-textarea"
          placeholder="Describe your existing work, data, or methods that form the foundation of this project..."
          value={formData.approach}
          onChange={(e) => setFormData({ ...formData, approach: e.target.value })}
        />
        <div className={`word-count ${wordCount(formData.approach) > WORD_LIMIT ? "over" : ""}`}>
          {wordCount(formData.approach)} / {WORD_LIMIT} words
        </div>
      </div>

      <div className="form-section">
        <label className="form-label">Expertise You're Looking For</label>
        <span className="form-hint">Select all fields where you need collaborators</span>
        <div className="tag-selector">
          {EXPERTISE_TAGS.map((tag) => (
            <button
              key={tag}
              className={`tag-option ${formData.lookingFor.includes(tag) ? "selected" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn-primary"
        disabled={!canSubmit}
        onClick={() => setSubmitted(true)}
      >
        Submit Pitch
      </button>

      <div className="data-notice">
        <p>
          🔒 Your name and affiliation will be visible to other conference participants.
          No email or contact details are stored. All pitch data will be deleted 30 days after the conference.
        </p>
      </div>
    </div>
  );
}

// --- Chat Page ---
function ChatPage() {
  const [activeChat, setActiveChat] = useState(null);
  const [chatInput, setChatInput] = useState("");

  const demoChats = [
    {
      id: "team-1",
      type: "team",
      name: "Team: Cellular drought memory",
      emoji: "🌱",
      lastMsg: "Who's free at the 16:00 coffee break to meet?",
      time: "14:32",
      unread: true,
      messages: [
        { author: "Dr. Maria Chen", text: "Welcome everyone! So glad you joined. Let's plan our first meetup.", time: "10:15" },
        { author: "Explorer-17", text: "Very excited about this! I work on crop epigenetics at SLU - perfect overlap.", time: "10:22" },
        { author: "Researcher-8", text: "I can bring computational modeling to this. When should we meet?", time: "11:45" },
        { author: "Dr. Maria Chen", text: "Who's free at the 16:00 coffee break to meet?", time: "14:32" },
      ],
    },
    {
      id: "team-2",
      type: "team",
      name: "Team: eDNA coral reef monitoring",
      emoji: "🪸",
      lastMsg: "Let's meet near the poster area during lunch",
      time: "12:15",
      unread: false,
      messages: [
        { author: "Prof. James Okafor", text: "Hello team! We have 3 years of eDNA data ready to analyze together.", time: "09:30" },
        { author: "DataSci-42", text: "I've worked with time-series predictions before. Happy to help with modeling.", time: "10:05" },
        { author: "Prof. James Okafor", text: "Let's meet near the poster area during lunch", time: "12:15" },
      ],
    },
    {
      id: "dm-1",
      type: "direct",
      name: "Explorer-17",
      emoji: "E",
      lastMsg: "Have you seen the soil fungi pitch? Might interest you too",
      time: "13:20",
      unread: true,
      messages: [
        { author: "Explorer-17", text: "Hi! I noticed you joined the drought memory team. I work on similar things.", time: "12:40" },
        { author: "You", text: "Yes! I'm looking at chromatin responses in barley specifically.", time: "12:55" },
        { author: "Explorer-17", text: "Have you seen the soil fungi pitch? Might interest you too", time: "13:20" },
      ],
    },
  ];

  if (activeChat) {
    const chat = demoChats.find((c) => c.id === activeChat);
    return (
      <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}>
        <div className="chat-room-header">
          <button className="back-btn" onClick={() => setActiveChat(null)}><Icons.Back /></button>
          <div className={`chat-avatar ${chat.type}`}>{chat.emoji}</div>
          <div style={{ flex: 1 }}>
            <div className="chat-preview-name">{chat.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
              {chat.type === "team" ? "Team chat" : "Direct message"}
            </div>
          </div>
        </div>

        <div className="chat-messages" style={{ flex: 1 }}>
          {chat.messages.map((msg, i) => (
            <div className="chat-message" key={i}>
              <div className="chat-message-author">{msg.author}</div>
              <div className="chat-message-text">{msg.text}</div>
              <div className="chat-message-time">{msg.time}</div>
            </div>
          ))}
        </div>

        <div className="chat-input-bar">
          <input
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setChatInput("")}
          />
          <button className="chat-send-btn" onClick={() => setChatInput("")}>
            <Icons.Send />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Chat</h1>
        <p>Team discussions and direct messages</p>
      </div>

      {demoChats.map((chat) => (
        <div className="chat-list-item" key={chat.id} onClick={() => setActiveChat(chat.id)}>
          <div className={`chat-avatar ${chat.type}`}>{chat.emoji}</div>
          <div className="chat-preview">
            <div className="chat-preview-name">{chat.name}</div>
            <div className="chat-preview-msg">{chat.lastMsg}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div className="chat-time">{chat.time}</div>
            {chat.unread && <div className="unread-dot" />}
          </div>
        </div>
      ))}
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
          This app collects minimal personal data. No email addresses or phone numbers
          are stored. Chat profiles are self-created with the level of anonymity you choose.
          All user data and messages will be permanently deleted 30 days after the conference
          (30 November 2026). Exchange contact details directly with collaborators during the event.
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
export default function App() {
  const [page, setPage] = useState("home");

  return (
    <>
      <style>{css}</style>
      <div className="app-container">
        <div className="page-content">
          {page === "home" && <HomePage setPage={setPage} />}
          {page === "schedule" && <SchedulePage />}
          {page === "pitches" && <PitchesPage />}
          {page === "chat" && <ChatPage />}
          {page === "info" && <InfoPage />}
        </div>
        <NavBar page={page} setPage={setPage} />
      </div>
    </>
  );
}
