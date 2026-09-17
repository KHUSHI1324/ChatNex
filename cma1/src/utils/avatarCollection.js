import { createAvatar } from '@dicebear/core';
import { lorelei, avataaars } from '@dicebear/collection';
import axios from 'axios';
import { logAvatarFallbackRoute, generateAiAvatarRoute } from './APIRoutes';

// Curated High-Quality Modern Vector Avatars (Human, Stylish, Clean Aesthetics)
// Uses DiceBear Lorelei, Adventurer & Notionist-inspired high-definition human SVG profiles

const generateSvgAvatar = ({
  id,
  gender = "male",
  skin = "#F5D0A9",
  hair = "#2C3E50",
  hairStyle = "short",
  bg = "#111b21",
  accent = "#00a884",
  glasses = false,
  beard = false,
  doctor = false,
  cyberpunk = false,
  expression = "smile",
  name = "Avatar",
}) => {
  const isFemale = gender === "female";

  // Different hair shapes
  let hairPath = "";
  if (isFemale) {
    if (hairStyle === "long") {
      hairPath = `
        <path d="M22 45 C20 20, 80 20, 78 45 C78 75, 75 88, 70 95 C65 85, 72 55, 68 45 C64 35, 36 35, 32 45 C28 55, 35 85, 30 95 C25 88, 22 75, 22 45 Z" fill="${hair}"/>
        <path d="M25 38 C32 18, 68 18, 75 38 C70 30, 30 30, 25 38 Z" fill="${hair}"/>
      `;
    } else if (hairStyle === "bun") {
      hairPath = `
        <circle cx="50" cy="18" r="14" fill="${hair}"/>
        <path d="M26 42 C26 24, 74 24, 74 42 C70 32, 30 32, 26 42 Z" fill="${hair}"/>
      `;
    } else {
      hairPath = `
        <path d="M25 42 C22 22, 78 22, 75 42 C68 30, 32 30, 25 42 Z" fill="${hair}"/>
        <path d="M23 42 C22 55, 26 68, 30 72 C28 60, 28 48, 30 42 Z" fill="${hair}"/>
        <path d="M77 42 C78 55, 74 68, 70 72 C72 60, 72 48, 70 42 Z" fill="${hair}"/>
      `;
    }
  } else {
    if (hairStyle === "curly") {
      hairPath = `
        <circle cx="35" cy="28" r="10" fill="${hair}"/>
        <circle cx="50" cy="24" r="11" fill="${hair}"/>
        <circle cx="65" cy="28" r="10" fill="${hair}"/>
        <circle cx="28" cy="38" r="8" fill="${hair}"/>
        <circle cx="72" cy="38" r="8" fill="${hair}"/>
        <path d="M28 42 C30 26, 70 26, 72 42 C65 34, 35 34, 28 42 Z" fill="${hair}"/>
      `;
    } else if (hairStyle === "slick") {
      hairPath = `
        <path d="M26 40 C28 18, 72 18, 74 40 C70 26, 30 26, 26 40 Z" fill="${hair}"/>
        <path d="M24 40 C22 48, 24 56, 27 58 C25 50, 26 44, 27 40 Z" fill="${hair}"/>
      `;
    } else {
      hairPath = `
        <path d="M25 40 C28 20, 72 20, 75 40 C68 30, 32 30, 25 40 Z" fill="${hair}"/>
      `;
    }
  }

  // Glasses or Cyberpunk Visor
  let eyewearSvg = "";
  if (cyberpunk) {
    eyewearSvg = `
      <rect x="28" y="44" width="44" height="10" rx="3" fill="#00f2fe" opacity="0.9" filter="drop-shadow(0 0 4px #00f2fe)"/>
      <line x1="28" y1="49" x2="72" y2="49" stroke="#ffffff" stroke-width="1.2"/>
    `;
  } else if (glasses) {
    eyewearSvg = `
      <circle cx="41" cy="48" r="7" fill="rgba(0,0,0,0.4)" stroke="#e9edef" stroke-width="2.5"/>
      <circle cx="59" cy="48" r="7" fill="rgba(0,0,0,0.4)" stroke="#e9edef" stroke-width="2.5"/>
      <line x1="48" y1="48" x2="52" y2="48" stroke="#e9edef" stroke-width="2.5"/>
      <line x1="28" y1="47" x2="34" y2="48" stroke="#e9edef" stroke-width="2"/>
      <line x1="66" y1="48" x2="72" y2="47" stroke="#e9edef" stroke-width="2"/>
    `;
  }

  // Beard
  const beardSvg = beard
    ? `
      <path d="M38 65 C42 75, 58 75, 62 65 C64 74, 58 84, 50 84 C42 84, 36 74, 38 65 Z" fill="${hair}" opacity="0.9"/>
      <path d="M44 63 C47 65, 53 65, 56 63" stroke="${hair}" stroke-width="2" fill="none" stroke-linecap="round"/>
    `
    : "";

  // Expression / Eyes & Mouth
  let mouthSvg = `<path d="M43 64 Q50 70 57 64" fill="none" stroke="#2c3e50" stroke-width="2.5" stroke-linecap="round"/>`;
  if (expression === "laugh") {
    mouthSvg = `<path d="M42 63 Q50 74 58 63 Z" fill="#2c3e50"/>`;
  } else if (expression === "cool") {
    mouthSvg = `<path d="M44 65 Q50 67 56 63" fill="none" stroke="#2c3e50" stroke-width="2.5" stroke-linecap="round"/>`;
  }

  // Doctor Attire & Stethoscope
  let clothingSvg = `
    <!-- Shoulders & Clothes -->
    <path d="M22 96 C24 78, 40 76, 50 76 C60 76, 76 78, 78 96 Z" fill="url(#shirtGrad_${id})"/>
    <path d="M42 76 L50 84 L58 76 Z" fill="${skin}"/>
  `;

  if (doctor) {
    clothingSvg = `
      <!-- Medical Teal Scrub -->
      <path d="M22 96 C24 78, 40 76, 50 76 C60 76, 76 78, 78 96 Z" fill="#00a884"/>
      <path d="M42 76 L50 84 L58 76 Z" fill="${skin}"/>
      <!-- White Doctor Coat Overcoat -->
      <path d="M22 96 C24 80, 36 78, 41 78 L38 96 Z" fill="#f8fafc"/>
      <path d="M78 96 C76 80, 64 78, 59 78 L62 96 Z" fill="#f8fafc"/>
      <!-- Stethoscope around neck -->
      <path d="M38 74 C34 84, 40 92, 46 95" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M62 74 C66 84, 60 92, 54 95" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <line x1="46" y1="95" x2="54" y2="95" stroke="#1e293b" stroke-width="2.5"/>
      <circle cx="50" cy="95.5" r="3.5" fill="#94a3b8" stroke="#1e293b" stroke-width="1.2"/>
    `;
  }

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="120" height="120">
    <defs>
      <radialGradient id="bgGrad_${id}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${bg}"/>
      </radialGradient>
      <linearGradient id="shirtGrad_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${accent}"/>
        <stop offset="100%" stop-color="#111b21"/>
      </linearGradient>
    </defs>
    <!-- Background Circle -->
    <rect width="100" height="100" rx="50" fill="url(#bgGrad_${id})"/>
    <circle cx="50" cy="50" r="48" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.4"/>
    
    <!-- Clothing -->
    ${clothingSvg}

    <!-- Head & Neck -->
    <rect x="44" y="60" width="12" height="18" rx="6" fill="${skin}"/>
    <ellipse cx="50" cy="50" rx="19" ry="22" fill="${skin}"/>
    
    <!-- Ears -->
    <circle cx="31" cy="50" r="4.5" fill="${skin}"/>
    <circle cx="69" cy="50" r="4.5" fill="${skin}"/>

    <!-- Eyes & Eyebrows -->
    <circle cx="42" cy="48" r="2.5" fill="#202c33"/>
    <circle cx="58" cy="48" r="2.5" fill="#202c33"/>
    <path d="M38 43 Q42 41 46 43" fill="none" stroke="${hair}" stroke-width="2" stroke-linecap="round"/>
    <path d="M54 43 Q58 41 62 43" fill="none" stroke="${hair}" stroke-width="2" stroke-linecap="round"/>

    <!-- Nose -->
    <path d="M50 49 L48 55 L52 55" fill="none" stroke="#d4a373" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Mouth -->
    ${mouthSvg}

    <!-- Eyewear (Glasses / Visor) -->
    ${eyewearSvg}

    <!-- Beard (if any) -->
    ${beardSvg}

    <!-- Hair -->
    ${hairPath}
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
};

export const MODERN_AVATARS = [
  // 1. Alex - Tech Guy with Glasses
  {
    id: "av_1",
    name: "Alex",
    category: "male",
    image: generateSvgAvatar({
      id: "1",
      gender: "male",
      skin: "#FDDFCA",
      hair: "#2C3E50",
      hairStyle: "short",
      accent: "#00a884",
      glasses: true,
      expression: "smile",
    }),
  },
  // 2. Sophia - Aesthetic Girl (Long Brown Hair)
  {
    id: "av_2",
    name: "Sophia",
    category: "female",
    image: generateSvgAvatar({
      id: "2",
      gender: "female",
      skin: "#FFE0BD",
      hair: "#795548",
      hairStyle: "long",
      accent: "#e91e63",
      expression: "smile",
    }),
  },
  // 3. Liam - Cool Dude with Beard
  {
    id: "av_3",
    name: "Liam",
    category: "male",
    image: generateSvgAvatar({
      id: "3",
      gender: "male",
      skin: "#E0AC69",
      hair: "#3E2723",
      hairStyle: "slick",
      accent: "#3498db",
      beard: true,
      expression: "cool",
    }),
  },
  // 4. Emma - Creative Bun Hair
  {
    id: "av_4",
    name: "Emma",
    category: "female",
    image: generateSvgAvatar({
      id: "4",
      gender: "female",
      skin: "#F1C27D",
      hair: "#1A1A1A",
      hairStyle: "bun",
      accent: "#9b59b6",
      glasses: true,
      expression: "smile",
    }),
  },
  // 5. Noah - Stylish Curly Hair
  {
    id: "av_5",
    name: "Noah",
    category: "male",
    image: generateSvgAvatar({
      id: "5",
      gender: "male",
      skin: "#FFDBAC",
      hair: "#D35400",
      hairStyle: "curly",
      accent: "#f39c12",
      expression: "laugh",
    }),
  },
  // 6. Olivia - Chic Bob Cut
  {
    id: "av_6",
    name: "Olivia",
    category: "female",
    image: generateSvgAvatar({
      id: "6",
      gender: "female",
      skin: "#FDDFCA",
      hair: "#2C3E50",
      hairStyle: "short",
      accent: "#1abc9c",
      expression: "smile",
    }),
  },
  // 7. Ethan - Professional Minimalist
  {
    id: "av_7",
    name: "Ethan",
    category: "male",
    image: generateSvgAvatar({
      id: "7",
      gender: "male",
      skin: "#C68642",
      hair: "#111b21",
      hairStyle: "short",
      accent: "#00a884",
      glasses: true,
      expression: "smile",
    }),
  },
  // 8. Ava - Vibrant Purple Style
  {
    id: "av_8",
    name: "Ava",
    category: "female",
    image: generateSvgAvatar({
      id: "8",
      gender: "female",
      skin: "#FFE0BD",
      hair: "#8e44ad",
      hairStyle: "long",
      accent: "#e056fd",
      expression: "laugh",
    }),
  },
  // 9. Lucas - Urban Streetstyle
  {
    id: "av_9",
    name: "Lucas",
    category: "male",
    image: generateSvgAvatar({
      id: "9",
      gender: "male",
      skin: "#8D5524",
      hair: "#1A1A1A",
      hairStyle: "slick",
      accent: "#e74c3c",
      beard: true,
      expression: "cool",
    }),
  },
  // 10. Mia - Cute Glasses & Bangs
  {
    id: "av_10",
    name: "Mia",
    category: "female",
    image: generateSvgAvatar({
      id: "10",
      gender: "female",
      skin: "#FFDBAC",
      hair: "#4A235A",
      hairStyle: "short",
      accent: "#ff7979",
      glasses: true,
      expression: "smile",
    }),
  },
  // 11. Daniel - Modern Developer
  {
    id: "av_11",
    name: "Daniel",
    category: "male",
    image: generateSvgAvatar({
      id: "11",
      gender: "male",
      skin: "#F1C27D",
      hair: "#2C3E50",
      hairStyle: "curly",
      accent: "#00d2d3",
      expression: "smile",
    }),
  },
  // 12. Zara - Golden Glam
  {
    id: "av_12",
    name: "Zara",
    category: "female",
    image: generateSvgAvatar({
      id: "12",
      gender: "female",
      skin: "#C68642",
      hair: "#D4AC0D",
      hairStyle: "long",
      accent: "#f1c40f",
      expression: "laugh",
    }),
  },
];

// Generate ultra-reliable vector avatar using local DiceBear package (0 network calls needed)
export const generateDiceBearAvatar = (seed = 'ChatNexUser', styleType = 'lorelei') => {
  try {
    const cleanSeed = String(seed || 'ChatNexUser').trim();
    const style = styleType === 'avataaars' ? avataaars : lorelei;
    const avatar = createAvatar(style, {
      seed: cleanSeed,
      size: 128,
    });
    return avatar.toDataUri();
  } catch (err) {
    console.warn('Error generating DiceBear avatar, using default SVG:', err);
    return DEFAULT_FALLBACK_AVATAR;
  }
};

// Default static placeholder avatar (absolute safety net)
export const DEFAULT_FALLBACK_AVATAR = `data:image/svg+xml;base64,${btoa(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="128" height="128">
    <circle cx="50" cy="50" r="48" fill="#182229" stroke="#00a884" stroke-width="2"/>
    <circle cx="50" cy="38" r="18" fill="#00a884" opacity="0.85"/>
    <path d="M22 84 C24 64, 76 64, 78 84 Z" fill="#00a884" opacity="0.85"/>
  </svg>`
)}`;

// Report Pollinations fallback to backend log silently
const reportFallbackToBackend = async (seed, reason, prompt) => {
  try {
    if (logAvatarFallbackRoute) {
      fetch(logAvatarFallbackRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed, reason, prompt }),
      }).catch(() => {});
    }
  } catch (e) {}
};

// AI Avatar Generator: Backend AI Engine (Pollinations FLUX/SD) -> Direct Fetch -> DiceBear (Lorelei) -> Default Safe Avatar
export const generateCustomAiAvatar = async (prompt = "", style = "3d avatar", userSeed = "") => {
  const cleanPrompt = (prompt || "stylish avatar").trim();
  const effectiveSeed = userSeed || cleanPrompt || `user_${Date.now()}`;

  // 1. Primary Method: Call Node Backend AI Generator (Zero CORS blocks, direct GPU response)
  try {
    if (generateAiAvatarRoute) {
      const response = await axios.post(
        generateAiAvatarRoute,
        {
          prompt: cleanPrompt,
          style,
          seed: effectiveSeed,
        },
        { timeout: 16000 }
      );

      if (response.data?.status && response.data.image) {
        return response.data.image;
      }
    }
  } catch (backendErr) {
    console.warn('[AI Avatar Generator] Backend AI proxy error:', backendErr?.message);
  }

  // 2. Secondary Client Direct Fetch (if backend proxy not reachable)
  const enhancedPrompt = `${cleanPrompt}, ${style} style, clean avatar profile picture, high resolution headshot, centered, vivid colors`;
  const randomSeed = Math.floor(Math.random() * 100000);
  const aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=256&height=256&nologo=true&seed=${randomSeed}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(aiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 500) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result && typeof reader.result === 'string' && reader.result.startsWith('data:image/')) {
              resolve(reader.result);
            } else {
              reportFallbackToBackend(effectiveSeed, 'Invalid image data returned', cleanPrompt);
              resolve(generateDiceBearAvatar(effectiveSeed));
            }
          };
          reader.onerror = () => {
            reportFallbackToBackend(effectiveSeed, 'FileReader error', cleanPrompt);
            resolve(generateDiceBearAvatar(effectiveSeed));
          };
          reader.readAsDataURL(blob);
        });
      }
    }
    reportFallbackToBackend(effectiveSeed, `HTTP ${res.status || 'invalid'}`, cleanPrompt);
  } catch (e) {
    const isTimeout = e?.name === 'AbortError' || String(e).includes('abort');
    const reason = isTimeout ? 'Timeout (>12s)' : (e?.message || 'Network error');
    console.warn('[AI Avatar Generator] Client fetch fallback:', reason);
    reportFallbackToBackend(effectiveSeed, reason, cleanPrompt);
  }

  // 3. Ultra-Reliable Semantic Vector Fallback (matches prompt attributes: doctor, glasses, girl, cyberpunk, etc.)
  try {
    return generateSemanticAvatar(cleanPrompt);
  } catch (err) {
    try {
      return generateDiceBearAvatar(effectiveSeed);
    } catch (e) {
      return DEFAULT_FALLBACK_AVATAR;
    }
  }
};

export const generateSemanticAvatar = (prompt = "") => {
  const norm = (prompt || "avatar").trim().toLowerCase();

  const isDoctor = /doctor|nurse|medic|hospital|surgeon|dr\b/i.test(norm);
  const isCyberpunk = /cyber|robot|neon|futur/i.test(norm);
  const hasGlasses = /glass|sunglass|shades|spectacles|nerd/i.test(norm);
  const hasBeard = /beard|mustache|stubble/i.test(norm);
  const isFemale = /girl|woman|female|she|queen|lady|cute/i.test(norm);

  const hairStyle = /curly/i.test(norm)
    ? "curly"
    : /bun/i.test(norm)
    ? "bun"
    : /long/i.test(norm)
    ? "long"
    : /slick/i.test(norm)
    ? "slick"
    : isFemale
    ? "long"
    : "short";

  let accent = "#00a884";
  if (/purple|violet/i.test(norm)) accent = "#9b59b6";
  else if (/red|crimson/i.test(norm)) accent = "#e74c3c";
  else if (/blue|cyan/i.test(norm)) accent = "#3498db";
  else if (/gold|yellow/i.test(norm)) accent = "#f1c40f";
  else if (/pink/i.test(norm)) accent = "#e91e63";

  return generateSvgAvatar({
    id: `sem_${Date.now()}`,
    gender: isFemale ? "female" : "male",
    skin: "#FDDFCA",
    hair: isFemale ? "#795548" : "#2C3E50",
    hairStyle,
    accent,
    glasses: hasGlasses,
    beard: hasBeard,
    doctor: isDoctor,
    cyberpunk: isCyberpunk,
    expression: "smile",
    name: prompt.slice(0, 15) || "Avatar",
  });
};

export const fallbackProceduralAvatar = (prompt = "") => {
  return generateSemanticAvatar(prompt);
};

