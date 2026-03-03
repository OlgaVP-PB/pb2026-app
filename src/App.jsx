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
  dates: "October 28–30, 2026",
  location: "Uppsala, Sweden",
  tagline: "From molecules to the biosphere",
};

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

// --- Speaker profiles database ---
const SPEAKERS = {
  "elena-vasquez": {
    id: "elena-vasquez",
    name: "Prof. Elena Vasquez",
    affiliation: "University of São Paulo, Brazil",
    photo: "https://api.dicebear.com/7.x/personas/svg?seed=Elena&backgroundColor=c0aede",
    bio: "Plant cell biologist specializing in drought stress signaling pathways. PI of the Tropical Crop Resilience Lab with 15 years of experience in molecular mechanisms of water stress adaptation in tropical crops.",
  },
  "henrik-berg": {
    id: "henrik-berg",
    name: "Dr. Henrik Berg",
    affiliation: "ETH Zürich, Switzerland",
    photo: "https://api.dicebear.com/7.x/personas/svg?seed=Henrik&backgroundColor=b6e3f4",
    bio: "Computational biologist developing machine learning tools for multi-omics data integration. Leads the BioScale group, building models that bridge molecular measurements to ecosystem-level predictions.",
  },
  "amara-osei": {
    id: "amara-osei",
    name: "Prof. Amara Osei",
    affiliation: "University of Ghana / WACCBIP",
    photo: "https://api.dicebear.com/7.x/personas/svg?seed=Amara&backgroundColor=ffd5dc",
    bio: "Geneticist and community engagement advocate working at the intersection of genomics, indigenous knowledge systems, and biodiversity conservation in West Africa. Co-chair of the African BioGenome Project ethics board.",
  },
  "yuki-tanaka": {
    id: "yuki-tanaka",
    name: "Prof. Yuki Tanaka",
    affiliation: "University of Tokyo, Japan",
    photo: "https://api.dicebear.com/7.x/personas/svg?seed=Yuki&backgroundColor=d1f4d1",
    bio: "Marine ecologist studying coral-microbiome interactions and their role in reef resilience. Pioneer in applying single-cell transcriptomics to environmental samples from the Pacific Ocean.",
  },
  "sarah-mitchell": {
    id: "sarah-mitchell",
    name: "Dr. Sarah Mitchell",
    affiliation: "Wellcome Trust, UK",
    photo: "https://api.dicebear.com/7.x/personas/svg?seed=Sarah&backgroundColor=ffe8b6",
    bio: "Science policy specialist and programme manager for climate and health research funding. Previously led strategic foresight at the European Research Council. Expert in translating research outcomes into policy recommendations.",
  },
  "lars-eriksson": {
    id: "lars-eriksson",
    name: "Prof. Lars Eriksson",
    affiliation: "Lund University, Sweden",
    photo: "https://api.dicebear.com/7.x/personas/svg?seed=Lars&backgroundColor=c0f0f0",
    bio: "Science communicator and professor of public understanding of science. Hosts the popular Swedish podcast 'Vetenskapsvärlden' and advises the European Commission on science engagement strategies.",
  },
  "ulf-landegren": {
    id: "ulf-landegren",
    name: "Prof. Ulf Landegren",
    affiliation: "Uppsala University, Sweden",
    photo: "https://api.dicebear.com/7.x/personas/svg?seed=Ulf&backgroundColor=b6c8f4",
    bio: "Professor of Molecular Medicine at Uppsala University. Inventor of groundbreaking molecular tools including the Padlock method and proximity ligation assays. Founder of 10 biotech companies including Olink Proteomics. Member of EMBO and the Royal Swedish Academy of Sciences.",
  },
  "isabelle-moreau": {
    id: "isabelle-moreau",
    name: "Dr. Isabelle Moreau",
    affiliation: "CNRS / Institut Pasteur, France",
    photo: "https://api.dicebear.com/7.x/personas/svg?seed=Isabelle&backgroundColor=e8d5f5",
    bio: "Evolutionary microbiologist investigating how microbial communities adapt to rapid environmental change. Leads a consortium studying soil microbiome shifts across European climate gradients.",
  },
};

// --- Placeholder schedule data ---
const SCHEDULE = [
  {
    day: 1,
    date: "October 28",
    title: "Foundations & Pitch Slam",
    sessions: [
      { time: "08:30", title: "Registration & Coffee", type: "break" },
      { time: "09:00", title: "Opening & Welcome", type: "plenary", speaker: "Organizing Committee" },
      {
        time: "09:30",
        title: "Knowledge Gaps in Molecular Life Sciences for Climate Resilience",
        type: "session",
        speaker: "Prof. Elena Vasquez",
        speakerId: "elena-vasquez",
        abstract: "Climate change is reshaping ecosystems at a pace that challenges our molecular understanding of biological adaptation. This session will map the critical knowledge gaps where molecular life sciences can contribute to climate resilience - from cellular stress responses in non-model organisms to the largely unexplored molecular basis of ecosystem tipping points. We will examine where current tools fall short and identify the most promising frontiers for discovery.",
      },
      { time: "11:00", title: "Coffee Break", type: "break" },
      {
        time: "11:30",
        title: "Tools, Data, and Technology for Scaling Up",
        type: "session",
        speaker: "Dr. Henrik Berg",
        speakerId: "henrik-berg",
        abstract: "Bridging molecular observations to ecosystem predictions requires new computational frameworks. This session explores cutting-edge tools - from multi-omics integration platforms to AI-driven ecological models - that enable researchers to work across biological scales. We will discuss practical challenges of data standardization, open-access infrastructure, and the technology gaps that currently prevent effective cross-scale research.",
      },
      { time: "12:30", title: "Lunch", type: "break" },
      { time: "14:00", title: "🎤 PITCH SLAM", type: "pitch", speaker: "All registered pitchers" },
      { time: "16:00", title: "Coffee & Networking", type: "break" },
      {
        time: "16:30",
        title: "Building Research Communities Across Disciplines and Borders",
        type: "session",
        speaker: "Dr. Isabelle Moreau",
        speakerId: "isabelle-moreau",
        abstract: "Planetary biology requires collaboration models that go beyond traditional departmental boundaries. Drawing on experiences from European microbiome consortia and global biodiversity networks, this session addresses practical strategies for building lasting cross-disciplinary research communities - including shared vocabularies, joint training programs, and infrastructure for equitable North-South partnerships.",
      },
      { time: "18:00", title: "Welcome Reception & Mingle", type: "social" },
    ],
  },
  {
    day: 2,
    date: "October 29",
    title: "Deep Dives & Collaboration",
    sessions: [
      {
        time: "09:00",
        title: "Funding and Prioritizing Climate-Related Life Science Research",
        type: "session",
        speaker: "Dr. Sarah Mitchell",
        speakerId: "sarah-mitchell",
        abstract: "As climate impacts accelerate, how should research funders prioritize investments in molecular life sciences? This session brings together funding agency perspectives with researcher experiences to discuss strategic priorities, the challenges of funding truly interdisciplinary work, and emerging models for rapid-response research funding in the face of environmental crises.",
      },
      { time: "10:30", title: "Coffee & Pitch Team Meetups", type: "break" },
      {
        time: "11:00",
        title: "Ethics, Indigenous Knowledge, and Responsible Innovation",
        type: "session",
        speaker: "Prof. Amara Osei",
        speakerId: "amara-osei",
        abstract: "Advancing planetary biology responsibly means engaging with the communities most affected by environmental change. This session examines ethical frameworks for integrating indigenous and local ecological knowledge with molecular approaches, ensuring benefit-sharing in biodiversity research, and building research partnerships that respect sovereignty and self-determination of indigenous populations worldwide.",
      },
      { time: "12:30", title: "Lunch & Pitch Team Working Time", type: "break" },
      {
        time: "14:00",
        title: "From Evidence to Action",
        type: "session",
        speaker: "Panel Discussion",
        abstract: "A panel bringing together researchers, policymakers, and practitioners to discuss how molecular life science evidence can inform environmental policy. From eDNA monitoring programs to cellular biomarkers of ecosystem health - what does it take to move scientific findings from publications to policy frameworks and on-the-ground conservation action?",
      },
      { time: "15:30", title: "Coffee & Pitch Team Meetups", type: "break" },
      {
        time: "16:00",
        title: "Public Engagement and Science Communication",
        type: "session",
        speaker: "Prof. Lars Eriksson",
        speakerId: "lars-eriksson",
        abstract: "Planetary biology has extraordinary stories to tell - from the molecular drama inside a single cell under heat stress to the vast networks connecting forest ecosystems. This session explores effective strategies for communicating complex, cross-scale science to diverse audiences, building public trust, and inspiring the next generation of interdisciplinary scientists.",
      },
      { time: "18:30", title: "Conference Dinner", type: "social" },
    ],
  },
  {
    day: 3,
    date: "October 30",
    title: "Synthesis & Pitch Finals",
    sessions: [
      { time: "09:00", title: "Voices from the Table: Key Takeaways", type: "plenary", speaker: "Session Chairs" },
      { time: "10:00", title: "Coffee Break", type: "break" },
      {
        time: "10:30",
        title: "From Research to Business and Innovation",
        type: "session",
        speaker: "Prof. Ulf Landegren",
        speakerId: "ulf-landegren",
        abstract: "How do breakthrough discoveries in molecular life sciences become companies, products, and societal impact? In this round table discussion, chaired by Prof. Ulf Landegren - founder of Olink Proteomics and nine other biotech ventures - participants will explore the journey from lab bench to market, discuss the unique challenges of commercializing interdisciplinary research, and identify opportunities for turning planetary biology innovations into sustainable businesses.",
      },
      { time: "12:00", title: "Lunch & Final Pitch Preparations", type: "break" },
      { time: "13:30", title: "🏆 PITCH FINALS - Team Presentations", type: "pitch", speaker: "Formed Teams (5 min each)" },
      {
        time: "15:30",
        title: "Funders React - Investing in Planetary Biology",
        type: "session",
        speaker: "Funder Panel",
        abstract: "Following the pitch finals, a panel of research funders and innovation investors react to the newly formed team proposals. What excites them? What would they fund? This frank and open discussion gives teams direct feedback and connects promising ideas with potential funding pathways.",
      },
      { time: "16:30", title: "Closing Remarks & Next Steps", type: "plenary", speaker: "Organizing Committee" },
      { time: "17:00", title: "Farewell Mingle", type: "social" },
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
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&display=swap');

  :root {
    --bg-deep: #0a1628;
    --bg-card: #111d33;
    --bg-card-hover: #162541;
    --bg-surface: #1a2d4a;
    --accent-green: #34d399;
    --accent-green-dim: #059669;
    --accent-teal: #2dd4bf;
    --accent-amber: #fbbf24;
    --accent-rose: #fb7185;
    --accent-blue: #60a5fa;
    --text-primary: #e8edf5;
    --text-secondary: #8899b4;
    --text-dim: #5a6d8a;
    --border: #1e3354;
    --border-light: #264060;
    --font-display: 'Fraunces', Georgia, serif;
    --font-body: 'DM Sans', -apple-system, sans-serif;
    --radius: 14px;
    --radius-sm: 8px;
    --shadow-card: 0 4px 24px rgba(0,0,0,0.3);
    --shadow-glow: 0 0 30px rgba(52,211,153,0.08);
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
    background: rgba(10, 22, 40, 0.92);
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
    color: var(--accent-green);
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
    text-align: center;
    padding: 32px 12px 24px;
    position: relative;
  }

  .hero-orb {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, var(--accent-teal), var(--accent-green-dim), #064e3b);
    margin: 0 auto 24px;
    box-shadow: 0 0 60px rgba(52,211,153,0.2), 0 0 120px rgba(45,212,191,0.08);
    animation: pulse-orb 4s ease-in-out infinite;
  }

  @keyframes pulse-orb {
    0%, 100% { transform: scale(1); box-shadow: 0 0 60px rgba(52,211,153,0.2); }
    50% { transform: scale(1.05); box-shadow: 0 0 80px rgba(52,211,153,0.3); }
  }

  .hero-title {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.25;
    margin-bottom: 8px;
    background: linear-gradient(135deg, var(--text-primary), var(--accent-teal));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-meta {
    font-size: 14px;
    color: var(--accent-green);
    font-weight: 500;
    margin-bottom: 4px;
  }

  .hero-location {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .hero-tagline {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 15px;
    color: var(--text-dim);
    margin-top: 16px;
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

  .ql-green .quick-link-icon { background: rgba(52,211,153,0.12); color: var(--accent-green); }
  .ql-blue .quick-link-icon { background: rgba(96,165,250,0.12); color: var(--accent-blue); }
  .ql-amber .quick-link-icon { background: rgba(251,191,36,0.12); color: var(--accent-amber); }
  .ql-rose .quick-link-icon { background: rgba(251,113,133,0.12); color: var(--accent-rose); }
  .ql-teal .quick-link-icon { background: rgba(45,212,191,0.12); color: var(--accent-teal); }

  /* --- Pitch Slam Feature Banner --- */
  .pitch-banner {
    background: linear-gradient(135deg, #0f2a1a, #132e3d);
    border: 1px solid rgba(52,211,153,0.2);
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
    background: radial-gradient(circle, rgba(52,211,153,0.06), transparent);
  }

  .pitch-banner:hover {
    border-color: rgba(52,211,153,0.35);
  }

  .pitch-banner-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent-green);
    margin-bottom: 8px;
  }

  .pitch-banner h3 {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--text-primary);
  }

  .pitch-banner p {
    font-size: 13px;
    color: var(--text-secondary);
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

  .badge-pitch { background: rgba(251,191,36,0.15); color: var(--accent-amber); }
  .badge-session { background: rgba(96,165,250,0.1); color: var(--accent-blue); }
  .badge-plenary { background: rgba(52,211,153,0.1); color: var(--accent-green); }
  .badge-social { background: rgba(251,113,133,0.1); color: var(--accent-rose); }
  .badge-break { background: rgba(90,109,138,0.15); color: var(--text-dim); }

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
    background: rgba(52,211,153,0.1);
    border-color: rgba(52,211,153,0.25);
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
    background: rgba(52,211,153,0.08);
    color: var(--accent-green);
    border: 1px solid rgba(52,211,153,0.15);
  }

  .pitch-tag.looking-for {
    background: rgba(96,165,250,0.08);
    color: var(--accent-blue);
    border-color: rgba(96,165,250,0.15);
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
    background: rgba(52,211,153,0.12);
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
    background: rgba(96,165,250,0.12);
    border-color: rgba(96,165,250,0.3);
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

  .chat-avatar.team { background: rgba(251,191,36,0.12); color: var(--accent-amber); }
  .chat-avatar.direct { background: rgba(96,165,250,0.12); color: var(--accent-blue); }

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
    background: rgba(0,0,0,0.7);
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
    background: rgba(96,165,250,0.06);
    border: 1px solid rgba(96,165,250,0.12);
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
`;

// ============================================================
// COMPONENTS
// ============================================================

// --- Navigation ---
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
        <div className="hero-orb" />
        <h1 className="hero-title">{CONFERENCE.name}</h1>
        <div className="hero-meta">{CONFERENCE.dates}</div>
        <div className="hero-location">{CONFERENCE.location}</div>
        <div className="hero-tagline">{CONFERENCE.tagline}</div>
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
          Submit your cross-disciplinary project idea, form teams during the conference,
          and pitch your collaboration to funders on Day 3.
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
        <h1>Schedule</h1>
      </div>

      <div className="day-tabs">
        {SCHEDULE.map((d) => (
          <button
            key={d.day}
            className={`day-tab ${activeDay === d.day ? "active" : ""}`}
            onClick={() => setActiveDay(d.day)}
          >
            Day {d.day} · {d.date}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 8, fontSize: 15, fontWeight: 600, fontFamily: "var(--font-display)", color: "var(--accent-teal)" }}>
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
                  style={s.abstract ? { cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--border-light)", textUnderlineOffset: 3, textDecorationThickness: 1 } : {}}
                  onClick={() => s.abstract && setActiveAbstract(s)}
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

      {/* Speaker Profile Modal */}
      {activeSpeaker && (
        <div className="modal-overlay" onClick={() => setActiveSpeaker(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
              <img
                src={activeSpeaker.photo}
                alt={activeSpeaker.name}
                style={{ width: 64, height: 64, borderRadius: 16, background: "var(--bg-surface)", border: "2px solid var(--border)" }}
              />
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
              {activeSpeaker.bio}
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
              {activeAbstract.abstract}
            </div>
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
        <div style={{ marginTop: 12, padding: 14, background: "rgba(52,211,153,0.06)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(52,211,153,0.12)" }}>
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
function InfoPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Practical Info</h1>
      </div>

      <div className="info-card">
        <h3>📍 Venue</h3>
        <p>
          Uppsala, Sweden<br />
          Exact venue to be announced.
        </p>
      </div>

      <div className="info-card">
        <h3>📅 Dates</h3>
        <p>
          October 28-30, 2026<br />
          Day 1: Foundations & Pitch Slam<br />
          Day 2: Deep Dives & Collaboration<br />
          Day 3: Synthesis & Pitch Finals
        </p>
      </div>

      <div className="info-card">
        <h3>📶 WiFi</h3>
        <p>
          Network and password will be displayed at the venue.
          Eduroam is available for university participants.
        </p>
      </div>

      <div className="info-card">
        <h3>🍽 Meals</h3>
        <p>
          Coffee breaks, lunch, and the welcome reception on Day 1 are included.
          Conference dinner on Day 2 - details to follow.
        </p>
      </div>

      <div className="info-card">
        <h3>🚂 Getting to Uppsala</h3>
        <p>
          Uppsala is approximately 40 minutes by train from Stockholm Arlanda Airport
          and 40 minutes from Stockholm Central Station.
          Direct trains run frequently.
        </p>
      </div>

      <div className="info-card">
        <h3>🎤 Pitch Slam - How It Works</h3>
        <p>
          1. Submit your project idea before or during registration<br />
          2. Present a 2-minute pitch on Day 1<br />
          3. Other participants join your team via this app<br />
          4. Brainstorm during coffee breaks and mingles (Days 1-3)<br />
          5. Present your team's developed idea on Day 3 (5 min)<br />
          6. Funders react and discuss next steps
        </p>
      </div>

      <div className="info-card">
        <h3>🔒 Data & Privacy</h3>
        <p>
          This app collects minimal personal data. No email addresses or phone numbers
          are stored. Chat profiles are self-created with the level of anonymity you choose.
          All user data and messages will be permanently deleted 30 days after the conference
          (November 30, 2026). Exchange contact details directly with collaborators during the event.
        </p>
      </div>

      <div className="info-card">
        <h3>📧 Contact</h3>
        <p>
          For questions about the conference, contact the organizing committee at
          the address provided in your registration confirmation.
        </p>
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
