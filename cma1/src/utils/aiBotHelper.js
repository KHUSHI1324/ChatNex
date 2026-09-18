// ChatNex AI Dedicated Bot Constant & Starter Suggestions
export const CHATNEX_AI_BOT_ID = "chatnex_ai_bot";

// Ultra-Modern Futuristic Glowing Cyberpunk AI Vector Avatar
export const CHATNEX_AI_DEFAULT_AVATAR = `data:image/svg+xml;base64,${btoa(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d16"/>
        <stop offset="50%" stop-color="#062e26"/>
        <stop offset="100%" stop-color="#19173d"/>
      </linearGradient>
      <linearGradient id="ringG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00a884"/>
        <stop offset="50%" stop-color="#00d2d3"/>
        <stop offset="100%" stop-color="#818cf8"/>
      </linearGradient>
      <linearGradient id="helmG" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>

    <!-- Background Sphere -->
    <rect width="120" height="120" rx="60" fill="url(#bgG)"/>
    
    <!-- Outer Aura Ring -->
    <circle cx="60" cy="60" r="54" fill="none" stroke="url(#ringG)" stroke-width="2.5" opacity="0.9"/>
    
    <!-- Floating Sparkles / Neural Points -->
    <circle cx="28" cy="32" r="1.8" fill="#38bdf8" filter="url(#glow)"/>
    <circle cx="92" cy="36" r="2.2" fill="#00a884" filter="url(#glow)"/>
    <circle cx="24" cy="86" r="2" fill="#818cf8" filter="url(#glow)"/>
    <circle cx="96" cy="82" r="1.8" fill="#38bdf8" filter="url(#glow)"/>

    <!-- Robot / AI Cyber Torso -->
    <path d="M34 114 C36 92, 48 88, 60 88 C72 88, 84 92, 86 114 Z" fill="url(#helmG)" stroke="url(#ringG)" stroke-width="1.5"/>
    <!-- Core Energy Crystal on Chest -->
    <polygon points="60,94 65,101 60,108 55,101" fill="#00f2fe" filter="url(#glow)"/>

    <!-- AI Robot Head / Helmet -->
    <rect x="36" y="32" width="48" height="48" rx="22" fill="url(#helmG)" stroke="url(#ringG)" stroke-width="2"/>

    <!-- Cyber Ears / Antennas -->
    <rect x="29" y="46" width="7" height="20" rx="3.5" fill="#00a884" filter="url(#glow)"/>
    <rect x="84" y="46" width="7" height="20" rx="3.5" fill="#38bdf8" filter="url(#glow)"/>
    <!-- Top Sensor -->
    <path d="M58 24 L62 24 L61 32 L59 32 Z" fill="#38bdf8"/>
    <circle cx="60" cy="21" r="3.5" fill="#00f2fe" filter="url(#glow)"/>

    <!-- Holographic Glowing Visor / Eyes -->
    <rect x="42" y="44" width="36" height="18" rx="9" fill="#06121e" stroke="rgba(0,242,254,0.7)" stroke-width="1.2"/>
    <ellipse cx="50" cy="53" rx="4.5" ry="5" fill="#00f2fe" filter="url(#glow)"/>
    <ellipse cx="70" cy="53" rx="4.5" ry="5" fill="#00f2fe" filter="url(#glow)"/>
    <!-- Glowing Eye pupils -->
    <circle cx="50.5" cy="52" r="2" fill="#ffffff"/>
    <circle cx="70.5" cy="52" r="2" fill="#ffffff"/>

    <!-- Smile / Voice Resonance Wave -->
    <path d="M51 70 Q60 76 69 70" fill="none" stroke="#00a884" stroke-width="2.5" stroke-linecap="round" filter="url(#glow)"/>
  </svg>`
)}`;

export const CHATNEX_AI_BOT = {
  _id: CHATNEX_AI_BOT_ID,
  username: "ChatNex AI",
  name: "ChatNex AI",
  isAiBot: true,
  email: "ai@chatnex.internal",
  avtarImage: CHATNEX_AI_DEFAULT_AVATAR,
  statusMessage: "✨ 24/7 AI Superpower Assistant • GPT-4 & Grok Powered",
};

export const AI_STARTER_PROMPTS = [
  {
    icon: "🎨",
    title: "Generate Image",
    prompt: "/imagine futuristic cyberpunk city in rain with neon reflections",
    desc: "Create AI art with /imagine",
  },
  {
    icon: "💡",
    title: "Brainstorm Ideas",
    prompt: "Give me 5 unique, creative tech startup ideas for 2026",
    desc: "Get instant brainstorm ideas",
  },
  {
    icon: "📝",
    title: "Draft an Email",
    prompt: "Draft a polite and professional project update email for my team",
    desc: "Write polished emails & letters",
  },
  {
    icon: "💻",
    title: "Explain Code",
    prompt: "Explain how React useEffect cleanup and dependency array work with simple examples",
    desc: "Coding help & debugging",
  },
  {
    icon: "✈️",
    title: "Travel Plan",
    prompt: "Create a 3-day weekend itinerary for a trip to Tokyo with budget tips",
    desc: "Plan trips & itineraries",
  },
  {
    icon: "📚",
    title: "Summarize Topic",
    prompt: "Explain Quantum Computing in 3 simple bullet points for beginners",
    desc: "Quick explanations & summaries",
  },
];
