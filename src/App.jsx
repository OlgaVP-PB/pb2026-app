import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ensureSession, getMyProfile, saveProfile, getConfig,
  listPitches, createPitch, updatePitch, listMembers, joinPitch, leavePitch,
  getSlamEntry, saveSlamEntry, exportWarmup, exportSlam,
  listMessages, sendMessage, subscribeToRoom, currentUser,
  listProfiles, listRecentActivity, subscribeToAllMessages,
} from "./supabase";

// --- Shared app state (who you are, organiser switches, everyone's names) ---
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// Squeeze whatever the server said into one short diagnosable line. Shown in
// small grey text under the friendly message so a screenshot is enough to debug.
function errorDetail(e) {
  if (!e) return null;
  const code = e.code || e.status || e.error_code || "";
  const msg = (e.message || e.msg || String(e)).slice(0, 110);
  const line = [code, msg].filter(Boolean).join(" · ").trim();
  return line && line !== "·" ? line : null;
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
  room: "Sal IX",
  address: "Biskopsgatan 3, 753 10 Uppsala",
  lat: 59.8576,
  lon: 17.6295,
};

// --- Places on the map ---
// Coordinates verified against OpenStreetMap; every hotel link points at the
// operator's own site, each one checked by loading it. Two took an address
// rather than a name to find: Grand Hotell Hornan is filed in OSM as "Grand
// Hotel Hornan" (one L), and Hotell Centralstation as "Hotell & Vandrarhem
// Centralstationen".
const PLACES = [
  { id: "venue",   kind: "venue",   name: "Universitetshuset", sub: "Conference venue, Sal IX · Biskopsgatan 3", lat: 59.85760, lon: 17.62946 },
  { id: "dinner",  kind: "dinner",  name: "Norrlands nation",  sub: "Conference dinner", lat: 59.85717, lon: 17.63775 },
  { id: "station", kind: "station", name: "Uppsala Central Station", sub: "Trains from Arlanda and Stockholm", lat: 59.85821, lon: 17.64658, url: "https://www.jernhusen.se/hitta-din-station/uppsala-centralstation/" },

  { id: "academia",  kind: "hotel", name: "Elite Hotel Academia",     lat: 59.85676, lon: 17.64850, url: "https://www.elite.se/sv/hotell/uppsala/hotel-academia/" },
  { id: "radisson",  kind: "hotel", name: "Radisson Blu Hotel",       lat: 59.85915, lon: 17.64820, url: "https://www.radissonhotels.com/en-us/hotels/radisson-blu-uppsala" },
  { id: "gillet",    kind: "hotel", name: "Clarion Hotel Gillet",     lat: 59.86058, lon: 17.63756, url: "https://www.strawberry.se/hotell/sverige/uppsala/clarion-hotel-gillet/" },
  { id: "svava",     kind: "hotel", name: "Best Western Hotel Svava", lat: 59.85809, lon: 17.64411, url: "https://www.hotelsvava.se/" },
  { id: "home",      kind: "hotel", name: "Home Hotel Uppsala",       lat: 59.86013, lon: 17.64673, url: "https://www.strawberry.se/hotell/sverige/uppsala/home-hotel-uppsala/" },
  { id: "akademi",   kind: "hotel", name: "Akademihotellet",          lat: 59.85638, lon: 17.63066, url: "https://www.akademihotellet.se/" },
  { id: "stella",    kind: "hotel", name: "Hotell Stella",            lat: 59.85597, lon: 17.61975, url: "https://www.hotellstella.se/" },
  { id: "hostel",    kind: "hotel", name: "Uppsala City Hostel",      lat: 59.86045, lon: 17.63947, url: "https://uppsalacityhostel.se/" },
  { id: "hornan",    kind: "hotel", name: "Grand Hotell Hörnan",       lat: 59.85642, lon: 17.64058, url: "https://www.grandhotellhornan.com/" },
  { id: "central",   kind: "hotel", name: "Hotell Centralstation",     lat: 59.85772, lon: 17.64391, url: "https://hotellcentralstation.se/" },
];

const PLACE_STYLE = {
  venue:   { color: "#045C64", label: "Venue" },
  dinner:  { color: "#491F53", label: "Dinner" },
  station: { color: "#C47A12", label: "Station" },
  hotel:   { color: "#4C979F", label: "Hotels" },
};

// Straight-line metres between two points - honest about being as-the-crow-flies.
function metresFrom(a, b) {
  const R = 6371000, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const mapsSearch = (name) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ", Uppsala, Sweden")}`;

// --- Session themes (from the conference website) ---
const THEMES = [
  { id: "I", title: "Integrating approaches in Planetary Biology", blurb: "Integrating methods across disciplines to understand life across scales." },
  { id: "II", title: "Climate resilience", blurb: "Organismal, community and ecosystem responses to climate change." },
  { id: "III", title: "Biodiversity decline", blurb: "Understanding and mitigating biodiversity decline through integrative approaches." },
  { id: "IV", title: "Feeding the world", blurb: "Biological knowledge for resilient agriculture, sustainable aquaculture, soil health and food system innovation." },
];

// Keywords for the warm-up (Anabella's list) - used for both "what you bring"
// and "what you'd like to connect around", max 3 each.
const KEYWORDS = [
  "Climate resilience",
  "Biodiversity & ecosystem functioning",
  "Microbiomes & symbiosis",
  "Evolution",
  "Genomics",
  "Single-cell biology",
  "Imaging & microscopy",
  "Modelling & prediction",
  "Environmental & Earth-system data",
  "Remote sensing & spatial data",
  "Plant & agricultural systems",
  "Marine & freshwater ecosystems",
  "Biogeochemistry & nutrient cycling",
  "Biotechnology & engineered living systems",
  "Cross-scale data integration",
];
const MAX_KEYWORDS = 3;

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
    affiliation: "EMBL, Germany · EMBO Member",
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

// --- Programme (source: organisers' programme doc, version 21.09.2026) ---
// Row types: header (session title + chair), talk, keynote, plenary, pitch, social, break,
// lightninghead + lightning (short talks selected from abstracts, sharing one time block).
const SCHEDULE_NOTE = "Programme as of 21 September 2026. Small changes may still happen.";
const SCHEDULE = [
  {
    day: 1,
    date: "28 Oct",
    title: "Opening, Sessions I-II & Pitch Slam intro",
    sessions: [
      { time: "10:00", end: "11:00", title: "Registration & morning coffee", type: "break" },
      { time: "11:00", end: "12:00", title: "Integrating Scales in Planetary Biology: Vision & foundation", type: "header", chair: "Nathaniel Street" },
      { time: "11:00", end: "11:20", title: "Welcome & introduction to Integrating Scales in Planetary Biology", type: "plenary", speaker: "Amy Gladfelter & Olga Vinnere Pettersson" },
      { time: "11:20", end: "11:30", title: "Connecting scales through research infrastructure: The SciLifeLab perspective", type: "plenary", speaker: "Annika Jenmalm Jensen" },
      { time: "11:30", end: "11:50", title: "The EMBO Keynote Lecture: From molecules to ecosystems: The EMBL vision for Planetary Biology", type: "keynote", speaker: "Detlev Arendt", speakerId: "detlev-arendt" },
      { time: "11:50", end: "12:00", title: "Practical information", type: "plenary", speaker: "Nathaniel Street" },
      { time: "12:00", end: "13:15", title: "Lunch", type: "break" },
      { time: "13:15", end: "16:40", title: "Session I - Integrating approaches in Planetary Biology", type: "header", chair: "Christopher Wheat", themeId: "I" },
      { time: "13:15", end: "14:00", title: "Challenges to animal-bacterial symbioses in our current climate crisis", type: "talk", speaker: "Margaret McFall-Ngai", speakerId: "margaret-mcfall-ngai" },
      { time: "14:00", end: "14:05", title: "Short break", type: "break" },
      { time: "14:05", end: "14:25", title: "Microbes, molecules, and marine ecosystems", type: "talk", speaker: "Alexandra Worden", speakerId: "alexandra-worden" },
      { time: "14:25", end: "14:45", title: "Mycorrhizae across scales, from microscopic hyphae to global underground networks", type: "talk", speaker: "Corentin Bisot", speakerId: "corentin-bisot" },
      { time: "14:45", end: "15:00", title: "Lightning talks", type: "lightninghead" },
      { time: "14:45", end: "14:50", title: "Scaling permafrost biogeochemistry: Integrating microbial genomics, thermodynamic kinetics, and Earth system modeling", type: "lightning", speaker: "Alexander Eiler" },
      { time: "14:50", end: "14:55", title: "A multiscale electron microscopy view of a diatom virus", type: "lightning", speaker: "Anna Munke" },
      { time: "14:55", end: "15:00", title: "Making multi-layer biodiversity information actionable for land-use decisions", type: "lightning", speaker: "Alejandro Ruete" },
      { time: "15:00", end: "16:00", title: "Coffee break & poster session", type: "break" },
      { time: "16:00", end: "16:20", title: "Convergent evolution of quinone biosynthesis in anaerobic eukaryotes", type: "talk", speaker: "Courtney Stairs", speakerId: "courtney-stairs" },
      { time: "16:20", end: "16:40", title: "Evolutionary single-cell genomics: mapping the tree of life at cellular resolution", type: "talk", speaker: "Arnau Sebé-Pedrós", speakerId: "arnau-sebe-pedros" },
      { time: "16:40", end: "17:15", title: "Session II - Climate resilience", type: "header", chair: "Sara Hallin", themeId: "II" },
      { time: "16:40", end: "17:00", title: "Planetary health: addressing conceptual, knowledge and implementation challenges", type: "talk", speaker: "Andrew Haines", speakerId: "andrew-haines" },
      { time: "17:00", end: "17:15", title: "Lightning talks", type: "lightninghead" },
      { time: "17:00", end: "17:05", title: "Cell-resolved transcriptional responses during heat-induced coral bleaching and recovery", type: "lightning", speaker: "Xavier Grau-Bové" },
      { time: "17:05", end: "17:10", title: "Enhancing climate resilience of engineered living materials through stress preconditioning", type: "lightning", speaker: "Valentina Hribljan" },
      { time: "17:10", end: "17:15", title: "A natural variation approach to improving plant resilience to changing atmospheric carbon dioxide levels and a changing climate", type: "lightning", speaker: "Katelyn Sageman-Furnas" },
      { time: "17:15", end: "17:30", title: "🎤 Pitch Slam introduction", type: "pitch" },
      { time: "17:30", end: "19:00", title: "Mingle & ice breakers", type: "social" },
    ],
  },
  {
    day: 2,
    date: "29 Oct",
    title: "Sessions III-IV, Round tables & Conference dinner",
    sessions: [
      { time: "09:00", end: "09:05", title: "Morning recap & practical information", type: "plenary", speaker: "Olga Vinnere Pettersson" },
      { time: "09:05", end: "10:55", title: "Session III - Biodiversity decline", type: "header", themeId: "III" },
      { time: "09:05", end: "09:50", title: "Rewilding the forest fungal microbiome", type: "talk", speaker: "Colin Averill", speakerId: "colin-averill" },
      { time: "09:50", end: "09:55", title: "Short break", type: "break" },
      { time: "09:55", end: "10:15", title: "Understanding and responding to biodiversity change", type: "talk", speaker: "Anne E. Magurran", speakerId: "anne-magurran" },
      { time: "10:15", end: "10:35", title: "Biodiversity and immunological health of children", type: "talk", speaker: "Jenni Lehtimäki", speakerId: "jenni-lehtimaki" },
      { time: "10:35", end: "10:55", title: "Lightning talks", type: "lightninghead" },
      { time: "10:35", end: "10:45", title: "Protist-trap reveals soil pore size affects microbial predation and diversity", type: "lightning", speaker: "Vanessa Stuermer" },
      { time: "10:45", end: "10:55", title: "Genome-resolved microbial greenhouse gas-cycling in a high-ebullition site in the coastal Baltic Sea", type: "lightning", speaker: "Anna Wallenius" },
      { time: "10:55", end: "11:00", title: "Industry spotlight", type: "plenary", speaker: "Theo Serivichyaswat" },
      { time: "11:00", end: "11:45", title: "Coffee break & poster session", type: "break" },
      { time: "11:45", end: "13:05", title: "Session IV - Feeding the world", type: "header", chair: "Guillermina Kubaczka", themeId: "IV" },
      { time: "11:45", end: "12:30", title: "From RNA biology to biotechnology for sustainable agriculture", type: "talk", speaker: "Federico Ariel", speakerId: "federico-ariel" },
      { time: "12:30", end: "12:50", title: "Supporting biodiversity and ecosystem functioning in agricultural landscapes through management", type: "talk", speaker: "Anna-Liisa Laine", speakerId: "anna-liisa-laine" },
      { time: "12:50", end: "13:05", title: "Lightning talks", type: "lightninghead" },
      { time: "12:50", end: "12:55", title: "Norway spruce spatiotemporal programs of conifer reproductive development", type: "lightning", speaker: "Stefania Giacomello" },
      { time: "12:55", end: "13:00", title: "Diversity of viruses infecting DPANN superphylum representatives along the salinity gradient of solar salterns", type: "lightning", speaker: "Alicia García Roldán" },
      { time: "13:00", end: "13:05", title: "Latitude, not geography, globally structures Oscheius tipulae into three deeply divergent lineages", type: "lightning", speaker: "Junho Lee" },
      { time: "13:05", end: "14:00", title: "Lunch", type: "break" },
      { time: "14:00", end: "15:10", title: "Round table discussions I", type: "plenary", speaker: "All participants" },
      { time: "15:10", end: "15:50", title: "Coffee break", type: "break" },
      { time: "15:50", end: "17:00", title: "Round table discussions II", type: "plenary", speaker: "All participants" },
      { time: "17:00", end: "18:30", title: "🎤 Pitch prep - teams prepare their presentations", type: "pitch" },
      { time: "19:00", end: "23:00", title: "Conference dinner at Norrlands Nation", type: "social" },
    ],
  },
  {
    day: 3,
    date: "30 Oct",
    title: "Pitch Slam, funders panel & awards",
    sessions: [
      { time: "09:00", end: "09:15", title: "Morning recap, practical information & pitch vote", type: "plenary", chair: "Anabella Aguilera & Guillermina Kubaczka", note: "The audience votes to pre-select which pitches go to the jury." },
      { time: "09:15", end: "10:00", title: "Key takeaways from the round table discussions", type: "plenary" },
      { time: "10:00", end: "10:30", title: "🏆 Pitch Slam", type: "pitch", speaker: "Selected teams pitch to the jury" },
      { time: "10:30", end: "11:15", title: "Coffee break & poster session", type: "break" },
      { time: "11:15", end: "12:15", title: "Panel: Investing in Planetary Biology", type: "plenary", chair: "Monica Bettencourt" },
      { time: "12:15", end: "12:45", title: "Awards & closing ceremony", type: "plenary", chair: "Amy Gladfelter & Olga Vinnere Pettersson" },
      { time: "12:45", end: "13:45", title: "Lunch", type: "break" },
    ],
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

  .session-note {
    font-size: 12px;
    color: var(--text-dim);
    font-style: italic;
    margin-top: 2px;
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
  .badge-keynote { background: rgba(73,31,83,0.12); color: var(--accent-rose); }

  .session-end {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-dim);
    opacity: 0.8;
    margin-top: 1px;
  }
  .session-compact { padding: 9px 0; }
  .session-compact .session-title { font-weight: 500; color: var(--text-secondary); margin-bottom: 0; }
  .unread-dot {
    display: inline-block;
    width: 9px; height: 9px;
    border-radius: 50%;
    background: #D6453D;
    box-shadow: 0 0 0 2px var(--bg-card, #fff);
  }
  .nav-icon-wrap { position: relative; display: inline-flex; }
  .nav-dot { position: absolute; top: -2px; right: -5px; }
  .tab-dot { margin-left: 6px; vertical-align: 1px; }
  .new-msg-pill {
    display: inline-flex; align-items: center; gap: 5px;
    margin-left: 8px; padding: 2px 8px;
    border-radius: 100px;
    background: rgba(214,69,61,0.10);
    color: #B3342D;
    font-size: 11px; font-weight: 700;
    font-family: var(--font-body);
    vertical-align: 2px;
    white-space: nowrap;
  }
  .new-msg-pill .unread-dot { width: 7px; height: 7px; box-shadow: none; }

  .slam-banner {
    background: rgba(249,161,44,0.14);
    border: 1px solid rgba(249,161,44,0.4);
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 14px;
    font-size: 14px;
    line-height: 1.45;
  }
  .slam-card {
    margin-top: 22px;
    padding: 16px;
    border-radius: 14px;
    border: 2px solid rgba(249,161,44,0.55);
    background: rgba(249,161,44,0.06);
  }
  .slam-card-title { font-family: var(--font-display); font-size: 17px; font-weight: 700; margin-bottom: 4px; }
  .slam-card-sub { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0 0 8px; }
  .slam-readonly { font-size: 14px; line-height: 1.5; }
  .slam-ro-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); margin-top: 8px; }
  .tag-chip.dimmed { opacity: 0.4; }
  .keyword-add { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
  .keyword-add .form-input { margin-bottom: 0; }
  .empty-note.ok { color: var(--accent-green); }

  .install-tip {
    background: rgba(167,201,71,0.18);
    border: 1px solid rgba(4,92,100,0.18);
    border-radius: 12px;
    padding: 14px 16px;
    margin: 4px 0 20px;
    color: var(--text-primary);
    font-size: 14px;
    line-height: 1.5;
  }
  .install-tip-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; color: var(--accent-teal); }
  .install-tip p { margin: 0 0 8px; }
  .install-tip ol { margin: 0 0 8px; padding-left: 22px; }
  .install-tip li { margin: 3px 0; }
  .install-tip-small { font-size: 12px; color: var(--text-secondary); margin: 0 !important; }
  .install-tip { position: relative; }
  .install-close {
    position: absolute; top: 8px; right: 8px;
    width: 26px; height: 26px;
    border: none; border-radius: 50%;
    background: rgba(0,0,0,0.06);
    color: var(--text-dim);
    font-size: 13px; line-height: 1;
    cursor: pointer;
  }

  .profile-strip {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 14px;
    margin: 14px 0 4px;
    cursor: pointer;
  }
  .profile-strip-label { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; }
  .profile-strip-name { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-top: 2px; }
  .profile-strip-aff { font-weight: 400; color: var(--text-secondary); font-size: 13px; }
  .profile-strip-edit { font-size: 13px; font-weight: 700; color: var(--accent-teal); white-space: nowrap; }

  .lightning-head { border-bottom: none; padding-bottom: 4px; }
  .lightning-title { font-size: 13px; font-weight: 700; color: var(--accent-amber); letter-spacing: 0.02em; }
  .lightning-sub { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
  .lightning-talk { padding: 8px 0 8px 0; border-bottom: none; }
  .lightning-talk .session-info { border-left: 2px solid rgba(249,161,44,0.45); padding-left: 12px; }
  .lightning-talk .session-title { font-size: 13px; }
  .lightning-talk + .session-card:not(.lightning-talk) { border-top: 1px solid var(--border); }

  .session-header {
    margin: 18px 0 2px;
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(4,92,100,0.07);
    border-left: 4px solid var(--accent-teal);
  }
  .session-header-time {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--accent-teal);
    font-variant-numeric: tabular-nums;
    margin-bottom: 3px;
  }
  .session-header-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--text-primary);
  }
  .session-header-chair {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
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
  .map-canvas {
    width: 100%;
    height: 300px;
    background: var(--bg-surface);
  }

  .leaflet-container { font-family: var(--font-body); }

  .pin {
    display: block;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2.5px solid #fff;
    box-shadow: 0 1px 4px rgba(25,40,50,0.45);
  }
  .pin-big { width: 26px; height: 26px; border-width: 3px; }

  .pin-pop { font-size: 13.5px; line-height: 1.5; min-width: 150px; }
  .pin-pop strong { font-size: 14.5px; color: var(--text-primary); }
  .pin-sub { color: var(--text-secondary); margin-top: 2px; }
  .pin-dist { color: var(--text-dim); font-size: 12px; margin: 4px 0 6px; }
  .pin-pop a { color: var(--teal); font-weight: 700; }

  .map-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 10px 12px;
    background: var(--bg-card);
    border-top: 1px solid var(--border);
    font-size: 12px;
    color: var(--text-secondary);
  }
  .legend-item { display: flex; align-items: center; gap: 6px; font-weight: 600; }
  .legend-dot {
    width: 11px; height: 11px; border-radius: 50%;
    border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(25,40,50,0.18);
  }

  .hotel-list {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .hotel-list li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid var(--border);
  }
  .hotel-list li:last-child { border-bottom: none; }
  .hotel-list a { font-weight: 600; text-decoration: none; }
  .hotel-dist {
    font-size: 12px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .map-foot { font-size: 12px; color: var(--text-dim); margin-top: 10px; font-style: italic; }

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

  .offline-banner .err-code { color: #9a7c3c; }

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

  .form-hint {
    font-style: italic;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--text-dim);
    margin: -4px 0 8px;
  }

  .field-meter {
    font-size: 11.5px;
    color: var(--text-dim);
    text-align: right;
    margin: -6px 0 4px;
    font-variant-numeric: tabular-nums;
  }
  .field-meter.warn { color: #b06a1e; font-weight: 700; }

  .req, .opt {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 3px;
    margin-left: 6px;
    vertical-align: 1px;
  }
  .req { background: rgba(167,201,71,0.3); color: #4d6410; }
  .opt { background: var(--bg-surface); color: var(--text-dim); }

  .err-code {
    display: block;
    margin-top: 9px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 11.5px;
    line-height: 1.45;
    color: #a37070;
    word-break: break-word;
  }

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

// --- Unread markers ---
// "Last seen" per chat room lives in this browser only (a convenience, not data we
// need to keep); "latest" comes from the server. A room is unread when someone
// else posted there after you last had it open.
const SEEN_KEY = "pb2026-seen";
function readSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") || {}; } catch { return {}; }
}
function writeSeen(v) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(v)); } catch { /* private mode etc. */ }
}

function useUnread(user, enabled) {
  const [latest, setLatest] = useState({});
  const [seen, setSeen] = useState(readSeen);
  const [teamRooms, setTeamRooms] = useState([]); // pitch rooms I own or joined

  const refreshTeams = useCallback(async () => {
    if (!user) return;
    try {
      const [p, m] = await Promise.all([listPitches(), listMembers()]);
      const joined = new Set(m.filter((x) => x.user_id === user.id).map((x) => x.pitch_id));
      setTeamRooms(
        p.filter((x) => x.owner === user.id || joined.has(x.id))
         .map((x) => ({ id: `pitch:${x.id}`, pitchId: x.id, label: x.title, mine: x.owner === user.id }))
      );
    } catch { /* markers are best-effort */ }
  }, [user]);

  useEffect(() => {
    if (!user || !enabled) return;
    let alive = true;
    refreshTeams();
    listRecentActivity()
      .then((rows) => {
        if (!alive) return;
        const out = {};
        rows.forEach((r) => {
          if (r.user_id === user.id) return;
          if (!out[r.room] || r.created_at > out[r.room]) out[r.room] = r.created_at;
        });
        setLatest(out);
      })
      .catch(() => {});
    const unsub = subscribeToAllMessages((msg) => {
      if (msg.user_id === user.id) return;
      setLatest((prev) => (prev[msg.room] && prev[msg.room] >= msg.created_at ? prev : { ...prev, [msg.room]: msg.created_at }));
    });
    return () => { alive = false; unsub(); };
  }, [user, enabled, refreshTeams]);

  // Seen = the later of "now" and the newest message in the room, so a phone whose
  // clock runs a bit slow doesn't keep showing a dot for messages already read.
  const latestRef = useRef(latest);
  latestRef.current = latest;
  const markSeen = useCallback((room) => {
    setSeen((prev) => {
      const now = new Date().toISOString();
      const newest = latestRef.current[room];
      const next = { ...prev, [room]: newest && newest > now ? newest : now };
      writeSeen(next);
      return next;
    });
  }, []);

  const isUnread = useCallback((room) => !!latest[room] && (!seen[room] || latest[room] > seen[room]), [latest, seen]);
  // The nav dot only counts team rooms - "Everyone" would be lit up all day.
  const teamUnread = teamRooms.some((r) => isUnread(r.id));

  return { isUnread, markSeen, teamRooms, teamUnread, refreshTeams };
}

function NavBar({ page, setPage }) {
  const { unread } = useApp();
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
          <span className="nav-icon-wrap">
            {item.icon}
            {item.id === "chat" && unread && unread.teamUnread && <span className="unread-dot nav-dot" aria-label="New messages" />}
          </span>
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

      <ProfileStrip onEdit={() => setPage("profile")} />

      <InstallBanner />

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
          Share your idea in the warm-up, find collaborators and form a team.
          On Day 3 teams pitch - anonymously - and everyone votes.
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

// --- Schedule Page ---
function SchedulePage() {
  const [activeDay, setActiveDay] = useState(1);
  const [view, setView] = useState("days"); // days | speakers
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [activeAbstract, setActiveAbstract] = useState(null);
  const dayData = SCHEDULE.find((d) => d.day === activeDay);

  const badgeClass = (type) => {
    const map = { pitch: "badge-pitch", session: "badge-session", talk: "badge-session", keynote: "badge-keynote", header: "badge-session", plenary: "badge-plenary", social: "badge-social", break: "badge-break" };
    return map[type] || "";
  };

  const badgeLabel = (type) => {
    // Talks carry no badge - they sit under their session header, which says enough.
    const map = { pitch: "Pitch Slam", session: "Session", header: "Session", keynote: "EMBO Keynote", plenary: "Plenary", social: "Social" };
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
          const clickable = !!(s.abstract || s.themeId);
          const openDetail = () => clickable && setActiveAbstract(s);

          if (s.type === "header") {
            return (
              <div className="session-header" key={i} onClick={openDetail} style={clickable ? { cursor: "pointer" } : {}}>
                <div className="session-header-time">{s.time}{s.end ? `-${s.end}` : ""}</div>
                <div className="session-header-title">{s.title}</div>
                {s.chair && <div className="session-header-chair">Chair: {s.chair}</div>}
              </div>
            );
          }

          if (s.type === "lightninghead") {
            return (
              <div className="session-card lightning-head" key={i}>
                <div className="session-time">
                  {s.time}
                  {s.end && <span className="session-end">{s.end}</span>}
                </div>
                <div className="session-info">
                  <div className="lightning-title">⚡ Lightning talks</div>
                  <div className="lightning-sub">Short talks selected from submitted abstracts</div>
                </div>
              </div>
            );
          }

          const compact = s.type === "break" || s.type === "social";
          return (
            <div className={`session-card ${compact ? "session-compact" : ""} ${s.type === "lightning" ? "lightning-talk" : ""}`} key={i}>
              <div className="session-time">
                {s.time}
                {s.time && s.end && <span className="session-end">{s.end}</span>}
              </div>
              <div className="session-info">
                {badgeLabel(s.type) && (
                  <span className={`session-type-badge ${badgeClass(s.type)}`}>{badgeLabel(s.type)}</span>
                )}
                <div
                  className="session-title"
                  style={clickable ? { cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--border-light)", textUnderlineOffset: 3, textDecorationThickness: 1 } : {}}
                  onClick={openDetail}
                >
                  {s.title}
                </div>
                {s.chair && <div className="session-speaker">Chair: {s.chair}</div>}
                {s.note && <div className="session-note">{s.note}</div>}
                {s.speaker && (
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
            {activeAbstract.chair && (
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 12 }}>
                Chair: {activeAbstract.chair}
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

// --- Pitch Slam timing helpers ---
const STOCKHOLM = "Europe/Stockholm";
function fmtWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-GB", { timeZone: STOCKHOLM, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}
// "before" | "open" | "closed" - the database enforces the same windows.
function windowPhase(from, to) {
  const opens = from ? new Date(from) : null;
  const closes = to ? new Date(to) : null;
  const now = new Date();
  if (!opens || !closes) return "before";
  if (now < opens) return "before";
  if (now >= closes) return "closed";
  return "open";
}
const slamPhase = (config) => windowPhase(config.slam_opens_at, config.slam_closes_at);
const warmupPhase = (config) => windowPhase(config.warmup_opens_at, config.warmup_closes_at);
const countWords = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);

// --- Pitches Page (warm-up ideas + teams) ---
function PitchesPage({ setPage, setChatRoom }) {
  const { user, config, profilesById, unread } = useApp();
  const [view, setView] = useState("list"); // list | detail | new | edit
  const [selectedId, setSelectedId] = useState(null);
  const [filterTag, setFilterTag] = useState(null);
  const [pitches, setPitches] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  const warmup = warmupPhase(config);
  const phase = slamPhase(config);

  const refresh = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([listPitches(), listMembers()]);
      setPitches(p);
      setMembers(m);
      setError(null);
    } catch (e) {
      setError("Could not load ideas. Check your connection and try again.");
      setDetail(errorDetail(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  const memberCount = (id) => members.filter((m) => m.pitch_id === id).length;
  const hasJoined = (id) => members.some((m) => m.pitch_id === id && m.user_id === user?.id);
  const isOwner = (p) => !!user && p.owner === user.id;

  const toggleJoin = async (pitchId) => {
    const joined = hasJoined(pitchId);
    setMembers((prev) => joined
      ? prev.filter((m) => !(m.pitch_id === pitchId && m.user_id === user.id))
      : [...prev, { pitch_id: pitchId, user_id: user.id }]);
    try {
      if (joined) await leavePitch(pitchId, user.id);
      else await joinPitch(pitchId, user.id);
      unread.refreshTeams();
    } catch {
      refresh();
    }
  };

  const selected = pitches.find((p) => p.id === selectedId);
  const backToList = () => { setView("list"); refresh(); unread.refreshTeams(); };

  if (view === "new") return <WarmupForm onBack={backToList} />;
  if (view === "edit" && selected) {
    return <WarmupForm existing={selected} onBack={() => { setView("detail"); refresh(); unread.refreshTeams(); }} />;
  }

  if (view === "detail" && selected) {
    return (
      <PitchDetail
        pitch={selected}
        owner={isOwner(selected)}
        ownerProfile={profilesById[selected.owner]}
        hasNew={unread.isUnread(`pitch:${selected.id}`)}
        joined={hasJoined(selected.id)}
        memberCount={memberCount(selected.id)}
        members={members.filter((m) => m.pitch_id === selected.id).map((m) => profilesById[m.user_id]).filter(Boolean)}
        onJoin={() => toggleJoin(selected.id)}
        onEdit={() => setView("edit")}
        onOpenChat={() => { setChatRoom(`pitch:${selected.id}`); setPage("chat"); }}
        onBack={() => setView("list")}
      />
    );
  }

  const tagged = (p) => [...(p.expertise_keywords || []), ...(p.connect_keywords || [])];
  // Keywords people added themselves show up in the filter too, once someone used them.
  const usedKeywords = [...new Set(pitches.flatMap(tagged))].sort();
  const shown = filterTag ? pitches.filter((p) => tagged(p).includes(filterTag)) : pitches;
  const myTeams = pitches.filter((p) => isOwner(p) || hasJoined(p.id));

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Pitch Slam</h1>
        <p>
          Start shaping your idea, share what you bring to the table, and tell us what you're looking for.
          Use this space to connect with potential collaborators before the Pitch Slam!
        </p>
      </div>

      {phase === "open" && (
        <div className="slam-banner">
          <strong>🎤 Final pitches are open until {fmtWhen(config.slam_closes_at)}.</strong>
          {myTeams.length
            ? " Open your team below and submit your final pitch."
            : " Join or start a team to submit one."}
        </div>
      )}

      {warmup === "open" ? (
        <button className="btn-primary" onClick={() => setView("new")}>+ Share your idea</button>
      ) : warmup === "before" ? (
        <div className="schedule-note">
          The warm-up opens {fmtWhen(config.warmup_opens_at)}. You can browse ideas and join teams in the meantime.
        </div>
      ) : (
        <div className="schedule-note">
          The warm-up closed {fmtWhen(config.warmup_closes_at)}. You can still join a team and use the team chat.
        </div>
      )}
      <p className="form-hint" style={{ marginTop: 8 }}>
        Your answers also help us spot common interests and set up matchmaking during the conference.
      </p>

      <div className="tag-filter-row">
        <button className={`tag-chip ${!filterTag ? "active" : ""}`} onClick={() => setFilterTag(null)}>All</button>
        {[...KEYWORDS, ...usedKeywords.filter((t) => !KEYWORDS.includes(t))].map((t) => (
          <button key={t} className={`tag-chip ${filterTag === t ? "active" : ""}`} onClick={() => setFilterTag(filterTag === t ? null : t)}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="empty-note">Loading...</div>}
      {error && <div className="empty-note error">{error}{detail && <span className="err-code">{detail}</span>}</div>}

      {!loading && !error && shown.length === 0 && (
        <div className="empty-note">
          {pitches.length === 0 ? "No ideas yet. The first one could be yours." : "No ideas with that keyword yet."}
        </div>
      )}

      {shown.map((p) => {
        const who = profilesById[p.owner];
        return (
          <div key={p.id} className="pitch-card" onClick={() => { setSelectedId(p.id); setView("detail"); }}>
            <div className="pitch-card-title">
              {p.title}
              {(isOwner(p) || hasJoined(p.id)) && unread.isUnread(`pitch:${p.id}`) && (
                <span className="new-msg-pill"><span className="unread-dot" /> New messages</span>
              )}
            </div>
            {who && <div className="pitch-card-author">{who.display_name}{who.affiliation ? ` · ${who.affiliation}` : ""}</div>}
            <div className="pitch-card-problem">{p.idea}</div>
            <div className="pitch-tags">
              {tagged(p).filter((t, i, a) => a.indexOf(t) === i).map((t) => <span key={t} className="pitch-tag">{t}</span>)}
            </div>
            <div className="pitch-card-meta">
              {memberCount(p.id) + 1} on this team
              {isOwner(p) ? <span className="joined-flag">Your idea</span> : hasJoined(p.id) && <span className="joined-flag">You joined</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Idea / team page ---
function PitchDetail({ pitch, owner, ownerProfile, hasNew, joined, memberCount, members, onJoin, onEdit, onOpenChat, onBack }) {
  const onTeam = owner || joined;
  return (
    <div className="fade-in">
      <button className="back-btn" onClick={onBack}>← Back to ideas</button>
      <div className="page-header">
        <h1>{pitch.title}</h1>
        {ownerProfile && (
          <p>
            {ownerProfile.display_name}{ownerProfile.affiliation ? ` · ${ownerProfile.affiliation}` : ""}
            {ownerProfile.intro && <><br /><span style={{ fontSize: 13 }}>{ownerProfile.intro}</span></>}
          </p>
        )}
      </div>

      <div className="info-card">
        <h3>Brings</h3>
        <div className="pitch-tags">
          {(pitch.expertise_keywords || []).map((t) => <span key={t} className="pitch-tag">{t}</span>)}
        </div>
      </div>

      <div className="info-card">
        <h3>The idea</h3>
        <p style={{ whiteSpace: "pre-wrap" }}>{pitch.idea}</p>
      </div>

      <div className="info-card">
        <h3>Would like to connect around</h3>
        <div className="pitch-tags">
          {(pitch.connect_keywords || []).map((t) => <span key={t} className="pitch-tag looking-for">{t}</span>)}
        </div>
      </div>

      {pitch.needs && (
        <div className="info-card">
          <h3>Looking for</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{pitch.needs}</p>
        </div>
      )}

      <div className="info-card">
        <h3>Team ({memberCount + 1})</h3>
        {ownerProfile && <p style={{ marginBottom: 6 }}><strong>Started by:</strong> {ownerProfile.display_name}</p>}
        {members.length === 0 ? <p>Nobody has joined yet.</p> : <p>{members.map((m) => m.display_name).join(", ")}</p>}
      </div>

      {owner ? (
        <>
          <div className="schedule-note">This is your idea. People who join can talk to you in the team chat.</div>
          <button className="btn-secondary" onClick={onEdit}>Edit your idea</button>
        </>
      ) : (
        <button className={joined ? "btn-secondary" : "btn-primary"} onClick={onJoin}>
          {joined ? "Leave this team" : "Join this team"}
        </button>
      )}

      {onTeam && (
        <button className={hasNew ? "btn-primary" : "btn-secondary"} style={{ marginTop: 10 }} onClick={onOpenChat}>
          {hasNew ? "Open team chat - new messages" : "Open team chat"}
        </button>
      )}

      {onTeam && <SlamEntryCard pitchId={pitch.id} />}
    </div>
  );
}

// --- Final Pitch Slam entry, shown only to the team ---
const SLAM_MAX_WORDS = 100;
function SlamEntryCard({ pitchId }) {
  const { user, config, profilesById } = useApp();
  const phase = slamPhase(config);
  const [entry, setEntry] = useState(null);
  const [form, setForm] = useState({ team_name: "", title: "", idea: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let alive = true;
    getSlamEntry(pitchId)
      .then((e) => {
        if (!alive) return;
        setEntry(e);
        if (e) setForm({ team_name: e.team_name, title: e.title, idea: e.idea });
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [pitchId]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setMsg(null); };
  const words = countWords(form.idea);

  const missing = [];
  if (!form.team_name.trim()) missing.push("a team name");
  if (form.title.trim().length < 3) missing.push("a title (at least 3 characters)");
  if (!form.idea.trim()) missing.push("your project idea");
  if (words > SLAM_MAX_WORDS) missing.push(`a shorter idea (max ${SLAM_MAX_WORDS} words)`);

  const save = async () => {
    if (missing.length) { setError(`Still needed: ${missing.join(", ")}.`); setDetail(null); return; }
    setSaving(true); setError(null);
    try {
      const saved = await saveSlamEntry(pitchId, user.id, {
        team_name: form.team_name.trim(),
        title: form.title.trim(),
        idea: form.idea.trim(),
      });
      setEntry(saved);
      setMsg("Saved. Anyone on your team can still change it until the deadline.");
    } catch (e) {
      setError(e.message && e.message.includes("row-level security")
        ? "Final pitches are closed."
        : "Could not save. Please try again.");
      setDetail(errorDetail(e));
    } finally {
      setSaving(false);
    }
  };

  const savedBy = entry && (entry.updated_by === user?.id ? "you" : profilesById[entry.updated_by]?.display_name || "a team member");

  return (
    <div className="slam-card">
      <div className="slam-card-title">🎤 Your team's final pitch</div>
      <p className="slam-card-sub">
        Shown anonymously - voters see the team name, title and text only, no names. All pitches go to a
        participant vote and the six most-voted teams pitch to the jury. Remember to send your supporting
        slide to the organisers as well.
        {" "}Open {fmtWhen(config.slam_opens_at)} - {fmtWhen(config.slam_closes_at)}.
      </p>

      {loading && <div className="empty-note">Loading...</div>}

      {!loading && phase === "before" && <p className="slam-card-sub"><strong>Not open yet.</strong> Talk it through in the team chat in the meantime.</p>}

      {!loading && phase === "closed" && (
        entry ? (
          <div className="slam-readonly">
            <div className="slam-ro-label">Team</div><div>{entry.team_name}</div>
            <div className="slam-ro-label">Title</div><div>{entry.title}</div>
            <div className="slam-ro-label">Idea</div><div style={{ whiteSpace: "pre-wrap" }}>{entry.idea}</div>
            <p className="slam-card-sub" style={{ marginTop: 10 }}>Submissions are closed. See you at the Pitch Slam!</p>
          </div>
        ) : (
          <p className="slam-card-sub"><strong>Submissions are closed</strong> - this team didn't submit a final pitch.</p>
        )
      )}

      {!loading && phase === "open" && (
        <>
          <label className="form-label">Team name <span className="req">required</span></label>
          <input className="form-input" value={form.team_name} maxLength={80} onChange={(e) => set("team_name", e.target.value)} placeholder="e.g. The Mycelium Collective" />

          <label className="form-label">Project / idea title <span className="req">required</span></label>
          <input className="form-input" value={form.title} maxLength={140} onChange={(e) => set("title", e.target.value)} />

          <label className="form-label">Project idea <span className="req">required</span></label>
          <p className="form-hint">
            What is the research question, challenge or opportunity? How does your idea connect different
            biological scales, disciplines and/or stakeholders? What could this collaboration make possible?
            Max. {SLAM_MAX_WORDS} words.
          </p>
          <textarea className="form-textarea" rows={7} value={form.idea} onChange={(e) => set("idea", e.target.value)} />
          <div className={`field-meter ${words > SLAM_MAX_WORDS ? "warn" : ""}`}>{words} / {SLAM_MAX_WORDS} words</div>

          {error && <div className="empty-note error">{error}{detail && <span className="err-code">{detail}</span>}</div>}
          {msg && <div className="empty-note ok">{msg}</div>}
          {entry && !msg && <p className="form-hint">Last saved by {savedBy}, {fmtWhen(entry.updated_at)}.</p>}

          <button className="btn-primary" disabled={saving} onClick={save}>
            {saving ? "Saving..." : entry ? "Save changes" : "Submit final pitch"}
          </button>
        </>
      )}
    </div>
  );
}

// --- Shared form bits ---
function FieldMeter({ value, min, max }) {
  const n = value.trim().length;
  const short = min && n < min;
  const long = n > max;
  return (
    <div className={`field-meter ${short || long ? "warn" : ""}`}>
      {short ? `${min - n} more character${min - n === 1 ? "" : "s"} needed` : `${n} / ${max}`}
    </div>
  );
}

function KeywordPicker({ value, onChange }) {
  const [custom, setCustom] = useState("");
  const full = value.length >= MAX_KEYWORDS;

  // Functional update: two quick taps must not overwrite each other.
  const toggle = (t) =>
    onChange((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length >= MAX_KEYWORDS ? prev : [...prev, t]));

  const addCustom = () => {
    const t = custom.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!t) return;
    onChange((prev) => {
      if (prev.length >= MAX_KEYWORDS) return prev;
      if (prev.some((x) => x.toLowerCase() === t.toLowerCase())) return prev;
      return [...prev, t];
    });
    setCustom("");
  };

  const mine = value.filter((t) => !KEYWORDS.includes(t));

  return (
    <>
      <div className="tag-filter-row">
        {KEYWORDS.map((t) => {
          const on = value.includes(t);
          return (
            <button key={t} className={`tag-chip ${on ? "active" : ""} ${!on && full ? "dimmed" : ""}`} onClick={() => toggle(t)}>
              {t}
            </button>
          );
        })}
        {mine.map((t) => (
          <button key={t} className="tag-chip active" onClick={() => toggle(t)}>{t} ✕</button>
        ))}
      </div>
      <div className="keyword-add">
        <input
          className="form-input"
          value={custom}
          maxLength={40}
          disabled={full}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder={full ? "3 keywords chosen" : "Missing something? Add your own"}
        />
        <button className="chat-send" onClick={addCustom} disabled={full || !custom.trim()}>Add</button>
      </div>
      <div className="field-meter">{value.length} / {MAX_KEYWORDS} selected</div>
    </>
  );
}

// --- Warm-up form (new idea, or edit your own) ---
function WarmupForm({ existing = null, onBack }) {
  const { user, profile } = useApp();
  const editing = !!existing;
  const [title, setTitle] = useState(existing?.title || "");
  const [expertise, setExpertise] = useState(existing?.expertise_keywords || []);
  const [idea, setIdea] = useState(existing?.idea || "");
  const [connect, setConnect] = useState(existing?.connect_keywords || []);
  const [needs, setNeeds] = useState(existing?.needs || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [done, setDone] = useState(false);

  // Mirrors the database checks, so the form can say what's missing.
  const missing = [];
  if (title.trim().length < 3) missing.push("a short title (at least 3 characters)");
  if (expertise.length === 0) missing.push("at least one keyword for your expertise");
  if (idea.trim().length < 10) missing.push("your project idea (at least 10 characters)");
  if (connect.length === 0) missing.push("at least one keyword for what you'd like to connect around");

  const attempt = () => {
    if (missing.length) { setError(`Still needed: ${missing.join(", ")}.`); setDetail(null); return; }
    submit();
  };

  const submit = async () => {
    setSaving(true); setError(null);
    const fields = {
      title: title.trim(),
      expertise_keywords: expertise,
      idea: idea.trim(),
      connect_keywords: connect,
      needs: needs.trim() || null,
    };
    try {
      if (editing) await updatePitch(existing.id, fields);
      else await createPitch(user.id, fields);
      setDone(true);
    } catch (e) {
      setError(e.message && e.message.includes("row-level security")
        ? "The warm-up is not open right now."
        : "Could not save. Please try again.");
      setDetail(errorDetail(e));
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="fade-in">
        <div className="page-header"><h1>{editing ? "Changes saved" : "Idea shared"}</h1></div>
        <div className="info-card">
          <p>Everyone at the conference can now see it and join your team. You'll see a red dot when someone writes in your team chat.</p>
        </div>
        <button className="btn-primary" onClick={onBack}>Back</button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <button className="back-btn" onClick={onBack}>← Cancel</button>
      <div className="page-header">
        <h1>{editing ? "Edit your idea" : "Share your idea"}</h1>
        <p>
          Posting as <strong>{profile?.display_name}</strong>{profile?.affiliation ? ` · ${profile.affiliation}` : ""}.
          {" "}To change that, edit your profile on the Home screen.
        </p>
      </div>

      <label className="form-label">Short title <span className="req">required</span></label>
      <p className="form-hint">The first line people see. Up to 80 characters.</p>
      <input className="form-input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Soil fungal networks under warming" />

      <label className="form-label">Your expertise / experience <span className="req">required</span></label>
      <p className="form-hint">Which areas, methods or approaches could you contribute to a collaborative project? Pick up to 3 - or add your own if nothing fits.</p>
      <KeywordPicker value={expertise} onChange={setExpertise} />

      <label className="form-label">Your project idea <span className="req">required</span></label>
      <p className="form-hint">
        Briefly describe a research question, idea or challenge that could benefit from collaboration across
        scales - from molecules and cells to organisms, populations and ecosystems.
      </p>
      <textarea className="form-textarea" value={idea} onChange={(e) => setIdea(e.target.value)} />
      <FieldMeter value={idea} min={10} max={2000} />

      <label className="form-label">What would you like to connect around? <span className="req">required</span></label>
      <p className="form-hint">Which areas, methods or approaches would you like to explore with others, or find collaborators for? Pick up to 3 - or add your own.</p>
      <KeywordPicker value={connect} onChange={setConnect} />

      <label className="form-label">What are you looking for? <span className="opt">optional</span></label>
      <p className="form-hint">What specific expertise, technology, equipment, data or collaboration would you need to develop your idea?</p>
      <textarea
        className="form-textarea"
        value={needs}
        onChange={(e) => setNeeds(e.target.value)}
        placeholder={"e.g. Someone with expertise in spatial metabolomics\nAccess to long-term freshwater ecosystem datasets\nSomeone working on mathematical modelling of population dynamics"}
      />
      <FieldMeter value={needs} max={2000} />

      {error && <div className="empty-note error">{error}{detail && <span className="err-code">{detail}</span>}</div>}

      <button className="btn-primary" disabled={saving} onClick={attempt}>
        {saving ? "Saving..." : editing ? "Save changes" : "Share idea"}
      </button>
    </div>
  );
}

// --- Organiser export: open the app at #organiser ---
function OrganiserPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState(null);

  const stamp = () => new Date().toLocaleString("sv-SE", { timeZone: STOCKHOLM }).slice(0, 16).replace(" ", "_").replace(":", "");
  const when = (v) => (v ? new Date(v).toLocaleString("sv-SE", { timeZone: STOCKHOLM }) : "");

  const download = async (which) => {
    setBusy(which); setError(null); setNote(null);
    try {
      await currentUser();
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      if (which === "warmup") {
        const rows = await exportWarmup(code.trim());
        if (!rows.length) throw new Error("Nothing came back - check the passcode (or there are no ideas yet).");
        const sheet = rows.map((r) => ({
          "Title": r.title, "Name": r.name, "Affiliation": r.affiliation, "Field(s)": r.field,
          "Expertise / experience": r.expertise, "Project idea": r.idea,
          "Would like to connect around": r.connect_around, "Looking for": r.looking_for,
          "Team members": r.team_members, "Posted": when(r.posted_at),
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), "Warm-up");
        XLSX.writeFile(wb, `PB2026-warm-up_${stamp()}.xlsx`);
        setNote(`Downloaded ${rows.length} idea${rows.length === 1 ? "" : "s"}.`);
      } else {
        const rows = await exportSlam(code.trim());
        if (!rows.length) throw new Error("Nothing came back - check the passcode (or no final pitches yet).");
        const anon = rows.map((r) => ({ "Team name": r.team_name, "Title": r.title, "Project idea": r.idea, "Words": countWords(r.idea || "") }));
        const full = rows.map((r) => ({
          "Team name": r.team_name, "Title": r.title, "Project idea": r.idea,
          "Warm-up idea": r.warmup_title, "Started by": r.owner_name, "Team members": r.team_members, "Last saved": when(r.last_saved),
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(anon), "For Menti (anonymous)");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(full), "With teams (organisers)");
        XLSX.writeFile(wb, `PB2026-pitch-slam_${stamp()}.xlsx`);
        setNote(`Downloaded ${rows.length} final pitch${rows.length === 1 ? "" : "es"}.`);
      }
    } catch (e) {
      setError(e.message || "Could not download.");
      setDetail(errorDetail(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Organisers</h1>
        <p>Download the warm-up ideas and the final pitches as spreadsheets.</p>
      </div>
      <label className="form-label">Passcode</label>
      <input className="form-input" type="password" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
      <button className="btn-primary" disabled={!code.trim() || !!busy} onClick={() => download("warmup")}>
        {busy === "warmup" ? "Preparing..." : "Download warm-up ideas"}
      </button>
      <button className="btn-primary" style={{ marginTop: 10 }} disabled={!code.trim() || !!busy} onClick={() => download("slam")}>
        {busy === "slam" ? "Preparing..." : "Download final pitches"}
      </button>
      <p className="form-hint" style={{ marginTop: 12 }}>
        The Pitch Slam file has two tabs: an anonymous one for Mentimeter, and one with team members for organisers only.
      </p>
      {error && <div className="empty-note error">{error}{detail && <span className="err-code">{detail}</span>}</div>}
      {note && <div className="empty-note ok">{note}</div>}
    </div>
  );
}

// --- Chat Page ---
function ChatPage({ chatRoom, setChatRoom }) {
  const { user, profile, profilesById, config, unread } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const endRef = useRef(null);

  const room = chatRoom || "general";
  const chatOpen = config.chat_open !== false;

  // Team rooms: pitches you own or joined
  const rooms = [{ id: "general", label: "Everyone" }, ...unread.teamRooms];
  useEffect(() => { unread.refreshTeams(); }, [unread.refreshTeams]);

  // Having a room open counts as reading it - including messages that arrive while it's open.
  useEffect(() => { unread.markSeen(room); }, [room, messages.length]);

  // Messages + live updates
  useEffect(() => {
    if (!user) return;
    let alive = true;
    setLoading(true);
    listMessages(room)
      .then((rows) => { if (alive) { setMessages(rows); setError(null); } })
      .catch((e) => { if (alive) { setError("Could not load messages."); setDetail(errorDetail(e)); } })
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
    } catch (e) {
      setError("Message not sent.");
      setDetail(errorDetail(e));
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
              {r.mine ? "★ " : ""}{r.label.length > 24 ? r.label.slice(0, 24) + "..." : r.label}
              {room !== r.id && unread.isUnread(r.id) && <span className="unread-dot tab-dot" aria-label="New messages" />}
            </button>
          ))}
        </div>
      )}

      <div className="chat-thread">
        {loading && <div className="empty-note">Loading...</div>}
        {error && <div className="empty-note error">{error}{detail && <span className="err-code">{detail}</span>}</div>}
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
function VenueMap() {
  const holder = useRef(null);
  const made = useRef(false);

  useEffect(() => {
    if (made.current || !holder.current) return;
    made.current = true;

    const map = L.map(holder.current, { scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const venue = PLACES.find((p) => p.id === "venue");

    PLACES.forEach((p) => {
      const style = PLACE_STYLE[p.kind];
      const big = p.kind !== "hotel";
      const size = big ? 26 : 18;
      const icon = L.divIcon({
        className: "",
        html: `<span class="pin ${big ? "pin-big" : ""}" style="background:${style.color}"></span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const away = p.id === "venue" ? null : metresFrom(venue, p);
      const link = p.url || mapsSearch(p.name);
      const linkText = p.url ? "Website" : "Find on map";
      const html = `
        <div class="pin-pop">
          <strong>${p.name}</strong>
          ${p.sub ? `<div class="pin-sub">${p.sub}</div>` : ""}
          ${away !== null ? `<div class="pin-dist">${away} m from the venue, in a straight line</div>` : ""}
          <a href="${link}" target="_blank" rel="noreferrer">${linkText}</a>
        </div>`;
      L.marker([p.lat, p.lon], { icon, title: p.name }).addTo(map).bindPopup(html);
    });

    map.fitBounds(PLACES.map((p) => [p.lat, p.lon]), { padding: [34, 34] });
    setTimeout(() => map.invalidateSize(), 200);
  }, []);

  return (
    <div className="map-card">
      <div ref={holder} className="map-canvas" />
      <div className="map-legend">
        {Object.entries(PLACE_STYLE).map(([k, v]) => (
          <span key={k} className="legend-item">
            <span className="legend-dot" style={{ background: v.color }} />
            {v.label}
          </span>
        ))}
      </div>
      <div className="map-links">
        <a href={mapsSearch("Universitetshuset")} target="_blank" rel="noreferrer">Venue in Google Maps</a>
        <a href={`https://www.openstreetmap.org/?mlat=${VENUE.lat}&mlon=${VENUE.lon}#map=16/${VENUE.lat}/${VENUE.lon}`} target="_blank" rel="noreferrer">OpenStreetMap</a>
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

      <InstallCard variant="short" />

      <div className="info-card">
        <h3>Venue</h3>
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
        <h3>Contact</h3>
        <p>
          Programme & abstracts: <a href="mailto:anabella.aguilera@scilifelab.se">anabella.aguilera@scilifelab.se</a><br />
          Registration & practicalities: <a href="mailto:PlanetaryBiology2026@akademikonferens.se">PlanetaryBiology2026@akademikonferens.se</a><br />
          Website: <a href={CONFERENCE.website} target="_blank" rel="noreferrer">Conference website</a>
        </p>
      </div>

      <div className="info-card">
        <h3>WiFi</h3>
        <p>
          Eduroam is available throughout the building. A guest network and password
          will be displayed at the registration desk.
        </p>
      </div>

      <div className="info-card">
        <h3>Poster Prize</h3>
        <p>
          The poster area is on the second floor of the venue.<br /><br />
          <strong>Put your poster up</strong> during registration on Day 1 (28 October, 10:00-11:00),
          or during the lunch break (12:00-13:00). Leave it up for the whole conference and take it
          down at the end.<br /><br />
          Poster sessions are during the coffee breaks on all three days.
          The Best Poster Award is sponsored by the New Phytologist Foundation.
        </p>
      </div>

      <div className="info-card">
        <h3>Pitch Slam - how it works</h3>
        <p>
          Bring different scales, disciplines and perspectives together to develop a new idea.
        </p>
        <p>
          <strong>1. Start connecting before the conference</strong><br />
          Share your expertise in the warm-up below, start shaping an idea, and tell others what
          you are looking for.<br />
          <em>30 September - 28 October, 23:00</em><br /><br />

          <strong>2. Find your collaborators at the conference</strong><br />
          Use the mingle to meet participants with complementary expertise, and form your team.<br />
          <em>28 October, 17:30-19:00</em><br /><br />

          <strong>3. Develop your idea</strong><br />
          Work on it together during the Pitch Slam preparation session.<br />
          <em>29 October, 17:00-18:30</em><br /><br />

          <strong>4. Submit your pitch</strong><br />
          Team name, title and your idea in max. 100 words, on your team's page in this app.
          Your team also sends one supporting slide to the organisers, using their template.<br />
          <em>Deadline: 29 October, 23:00</em><br /><br />

          <strong>5. Let participants choose</strong><br />
          All submitted ideas go to a participant vote. The six most-voted ideas move on to the
          final Pitch Slam. Pitches are shown without names.<br />
          <em>30 October, 09:00</em><br /><br />

          <strong>6. Pitch to the jury</strong><br />
          If your idea is selected, you present it to the jury - 3 minutes.<br />
          <em>30 October, 10:00-10:30</em>
        </p>
      </div>

      <div className="info-card">
        <h3>Accommodation</h3>
        <p>
          Participants book and pay for their own accommodation. All of these are
          marked on the map above - tap a pin for the distance and a link.
        </p>
        <ul className="hotel-list">
          {PLACES.filter((p) => p.kind === "hotel")
            .map((p) => ({ ...p, away: metresFrom(PLACES.find((v) => v.id === "venue"), p) }))
            .sort((a, b) => a.away - b.away)
            .map((p) => (
              <li key={p.id}>
                <a href={p.url || mapsSearch(p.name)} target="_blank" rel="noreferrer">{p.name}</a>
                <span className="hotel-dist">{p.away} m</span>
              </li>
            ))}
        </ul>
        <p className="map-foot">Distances are straight-line from the venue, so the walk is a little longer.</p>
      </div>

      <div className="info-card">
        <h3>Getting to Uppsala</h3>
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
        <h3>Organising Committee</h3>
        <p>
          Olga Vinnere Pettersson, Anabella Aguilera, Lucile Soler, Amy Gladfelter,
          Monica Bettencourt Dias, Gautam Dey, Guillermina Kubaczka, Nathaniel Street
        </p>
      </div>

      <div className="info-card">
        <h3>Data & Privacy</h3>
        <p>
          <strong>What this app stores</strong><br />
          A display name you choose yourself; any pitch you submit, together with the name
          and affiliation you put on it; which team you join; and messages you send in the app.
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

// Is the app running from a home-screen icon (rather than a browser tab)?
function isInstalled() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch { return false; }
}

function phoneKind() {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

const ShareGlyph = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px" }} aria-label="Share">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

// Chrome (Android, desktop) lets us open the install dialog ourselves. Safari
// does not, so on iPhones we show the two taps instead.
function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(isInstalled);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* dismissed */ }
    setDeferred(null);
  };

  return { canPrompt: !!deferred, install, installed };
}

// The "put me on your home screen" card. Shown on the welcome screen, as a
// dismissible banner on Home, and always in Practical Info until it's installed.
function InstallCard({ variant = "full", onDismiss }) {
  const { canPrompt, install, installed } = useInstallPrompt();
  const kind = phoneKind();
  if (installed) return null;

  const steps = kind === "ios" ? (
    <ol>
      <li>Tap <strong>Share</strong> <ShareGlyph /> at the bottom of Safari</li>
      <li>Tap <strong>Add to Home Screen</strong></li>
      <li>Open <strong>PB 2026</strong> from your home screen</li>
    </ol>
  ) : (
    <ol>
      <li>Tap the <strong>⋮</strong> menu at the top right</li>
      <li>Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>)</li>
      <li>Open <strong>PB 2026</strong> from your home screen</li>
    </ol>
  );

  return (
    <div className="install-tip">
      {onDismiss && (
        <button className="install-close" onClick={onDismiss} aria-label="Hide">✕</button>
      )}
      <div className="install-tip-title">📲 Put the conference in your pocket</div>
      <p>
        {variant === "full"
          ? "Add the app to your home screen and set up your profile there. It takes 10 seconds, and it opens like any other app - no browser, no address bar."
          : "Add the app to your home screen - it then opens like any other app, and works even when the venue wifi struggles."}
      </p>
      {canPrompt ? (
        <button className="btn-primary" onClick={install} style={{ marginTop: 4 }}>Add to Home Screen</button>
      ) : (
        steps
      )}
      <p className="install-tip-small">
        {kind === "ios"
          ? "Opened this from an email or Slack? Open it in Safari first."
          : "Opened this from an email or Slack? Open it in your browser first."}
        {variant === "full" && " Prefer to stay in the browser? Just fill in the form below."}
      </p>
    </div>
  );
}

// Home screen banner - hideable, and it stays hidden on this phone.
const INSTALL_HIDE_KEY = "pb2026-hide-install";
function InstallBanner() {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(INSTALL_HIDE_KEY) === "1"; } catch { return false; }
  });
  if (hidden) return null;
  return (
    <InstallCard
      variant="short"
      onDismiss={() => {
        setHidden(true);
        try { localStorage.setItem(INSTALL_HIDE_KEY, "1"); } catch { /* private mode */ }
      }}
    />
  );
}

// Used twice: the welcome screen on first open, and "Edit profile" later.
function ProfileForm({ mode = "welcome", initial = null, onDone, onCancel }) {
  const editing = mode === "edit";
  const [name, setName] = useState((initial && initial.display_name) || "");
  const [affiliation, setAffiliation] = useState((initial && initial.affiliation) || "");
  const [intro, setIntro] = useState((initial && initial.intro) || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      // Heal a stale session first - otherwise a device that was opened before
      // the accounts were reset can never get past this screen.
      const u = await currentUser();
      const p = await saveProfile(u.id, {
        display_name: name.trim(),
        affiliation: affiliation.trim() || null,
        intro: intro.trim() || null,
      });
      onDone(p, u);
    } catch (e) {
      setError("Could not save - check your connection and try again. If this keeps happening, close the app and reopen it.");
      setDetail(errorDetail(e));
      setSaving(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>{editing ? "Your profile" : "Welcome"}</h1>
        <p>
          {editing
            ? "This is how other participants see you in chat and in the Pitch Slam."
            : "Set up how you appear to other participants. You can use your real name or stay anonymous - it is up to you, and you can change it later from the Home screen."}
        </p>
      </div>

      {!editing && <InstallCard variant="full" />}

      <label className="form-label">Your name</label>
      <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="As you'd like others to see it" maxLength={60} />

      <label className="form-label">Your affiliation / organisation (optional)</label>
      <input className="form-input" value={affiliation} onChange={(e) => setAffiliation(e.target.value)} placeholder="e.g. Uppsala University" maxLength={120} />

      <label className="form-label">What you work on / your field(s) of expertise (optional)</label>
      <p className="form-hint">One line is enough - it helps people find you.</p>
      <textarea
        className="form-textarea"
        value={intro}
        onChange={(e) => setIntro(e.target.value)}
        placeholder="e.g. microbial ecology, evolutionary biology, imaging, bioinformatics, plant biology, environmental science"
      />
      <FieldMeter value={intro} max={500} />

      {error && <div className="empty-note error">{error}{detail && <span className="err-code">{detail}</span>}</div>}

      <button className="btn-primary" disabled={!name.trim() || saving} onClick={submit}>
        {saving ? "Saving..." : editing ? "Save changes" : "Enter the app"}
      </button>
      {editing && (
        <button className="btn-secondary" onClick={onCancel} disabled={saving} style={{ marginTop: 10 }}>
          Cancel
        </button>
      )}

      {editing && (
        <p className="form-hint" style={{ marginTop: 14 }}>
          Pitches you already submitted keep the name and affiliation you gave on the pitch form.
        </p>
      )}

      <div className="data-notice" style={{ marginTop: 18 }}>
        <p>
          🔒 Stored with an external provider inside the EU and deleted 30 days
          after the conference. No email address or phone number is collected.
        </p>
      </div>
    </div>
  );
}

// "You appear as ... · Edit" strip on the Home screen.
function ProfileStrip({ onEdit }) {
  const { profile } = useApp();
  if (!profile) return null;
  return (
    <div className="profile-strip" onClick={onEdit}>
      <div>
        <div className="profile-strip-label">You appear as</div>
        <div className="profile-strip-name">
          {profile.display_name}
          {profile.affiliation && <span className="profile-strip-aff"> · {profile.affiliation}</span>}
        </div>
      </div>
      <span className="profile-strip-edit">Edit profile</span>
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
  const [offlineDetail, setOfflineDetail] = useState(null);

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
      } catch (e) {
        if (alive) { setOfflineDetail(errorDetail(e)); setStatus("offline"); }
      }
    })();
    return () => { alive = false; };
  }, []);

  const offline = status === "offline";
  const unread = useUnread(user, status === "ready");
  const [organiser, setOrganiser] = useState(() => window.location.hash === "#organiser");
  useEffect(() => {
    const onHash = () => setOrganiser(window.location.hash === "#organiser");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const ctx = { user, profile, setProfile, config, profilesById, offline, unread };

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
              {offlineDetail && <span className="err-code">{offlineDetail}</span>}
            </div>
          )}
          {organiser ? (
            <OrganiserPage />
          ) : status === "onboarding" ? (
            <ProfileForm mode="welcome" onDone={(p, u) => {
              if (u) setUser(u);
              setProfile(p);
              setProfilesById((prev) => ({ ...prev, [p.id]: p }));
              setStatus("ready");
            }} />
          ) : (
            <>
              {page === "home" && <HomePage setPage={setPage} />}
              {page === "profile" && (
                <ProfileForm
                  mode="edit"
                  initial={profile}
                  onCancel={() => setPage("home")}
                  onDone={(p) => {
                    setProfile(p);
                    setProfilesById((prev) => ({ ...prev, [p.id]: p }));
                    setPage("home");
                  }}
                />
              )}
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
