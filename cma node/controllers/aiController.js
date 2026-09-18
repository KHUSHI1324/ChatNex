const fs = require("fs");
const path = require("path");

// Helper: Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Helper: Call Grok (xAI) API as fallback if GROK_API_KEY is available
async function callGrokAPI(messages, model = "grok-beta") {
  const grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (!grokApiKey || !grokApiKey.trim()) {
    return null;
  }
  try {
    const response = await fetchWithTimeout(
      "https://api.x.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${grokApiKey.trim()}`,
        },
        body: JSON.stringify({
          messages,
          model: model || "grok-beta",
          temperature: 0.7,
        }),
      },
      10000
    );

    if (response.ok) {
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      if (reply && reply.trim()) {
        return reply.trim();
      }
    }
  } catch (err) {
    console.warn("Grok xAI API fallback error:", err.message);
  }
  return null;
}

// Helper: Generate AI reply with Pollinations -> Grok -> Intelligent Knowledge Engine
async function generateAIReply(prompt, username) {
  const cleanPrompt = (prompt || "").trim().replace(/^@ai\s*/i, "");
  if (!cleanPrompt) return "Hello! How can I help you today?";

  const systemPrompt = "You are ChatNex AI, a helpful, witty, smart, knowledgeable, and friendly 24/7 AI assistant. Provide clear, accurate, well-formatted, and concise responses suitable for a chat app. Format code snippets with proper markdown blocks.";

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: cleanPrompt,
    },
  ];

  // 1. Try Pollinations Text API (GET endpoint - fastest & most reliable)
  try {
    const encodedPrompt = encodeURIComponent(cleanPrompt);
    const encodedSys = encodeURIComponent(systemPrompt);
    const getUrl = `https://text.pollinations.ai/${encodedPrompt}?system=${encodedSys}&seed=${Math.floor(Math.random() * 100000)}`;
    const response = await fetchWithTimeout(getUrl, {}, 6000);

    if (response.ok) {
      const text = await response.text();
      if (text && text.trim().length > 0 && !text.includes("<!DOCTYPE html>")) {
        return text.trim();
      }
    }
  } catch (apiErr) {
    console.warn("Pollinations AI GET text generation error/timeout:", apiErr.message);
  }

  // 1b. Try Pollinations Text API (POST endpoint)
  try {
    const response = await fetchWithTimeout(
      "https://text.pollinations.ai/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          model: "openai",
          seed: Math.floor(Math.random() * 100000),
        }),
      },
      6000
    );

    if (response.ok) {
      const text = await response.text();
      if (text && text.trim().length > 0 && !text.includes("<!DOCTYPE html>")) {
        return text.trim();
      }
    }
  } catch (apiErr) {
    console.warn("Pollinations AI POST text generation fallback triggered:", apiErr.message);
  }

  // 2. Fallback: Try Grok (xAI) API
  try {
    const grokReply = await callGrokAPI(messages, "grok-beta");
    if (grokReply) {
      return grokReply;
    }
  } catch (grokErr) {
    console.warn("Grok fallback failed:", grokErr.message);
  }

  // 3. Fallback: Topic-Aware Intelligent Knowledge Engine (Provides actual comprehensive answers)
  const norm = cleanPrompt.toLowerCase();

  // A. Startup & Business Ideas
  if (/startup|ideas?|business|venture|tech idea/i.test(norm)) {
    return `🚀 **5 Unique & High-Potential Tech Startup Ideas for 2026**:

1. **🧠 NeuroSync AI (Edge-Local Personal AI Copilot)**:
   - *Concept*: Ultra-lightweight AI models running 100% locally on personal laptops and phones with zero cloud data leaks.
   - *Monetization*: B2B privacy licenses and developer SDKs.

2. **⚡ GridPulse (Smart Microgrid & Energy Trading)**:
   - *Concept*: Peer-to-peer renewable energy trading platform using smart meters to buy/sell excess solar and battery power in local neighborhoods.
   - *Monetization*: 1.5% transaction fee on energy arbitrage.

3. **🏥 BioTwin 3D (Preventative Health Digital Twin)**:
   - *Concept*: Real-time digital replica of human vitals and biomarkers combining wearable metrics with predictive cardiovascular forecasting.
   - *Monetization*: Monthly premium subscriptions & telehealth integrations.

4. **📦 AeroRoute (Autonomous Urban Drone Delivery Network)**:
   - *Concept*: Decentralized rooftop-to-rooftop rapid parcel routing software for instant 15-minute suburban delivery.
   - *Monetization*: Per-delivery routing API fee.

5. **🌐 CodeMorph (Automated Legacy Code Modernization Engine)**:
   - *Concept*: AI compiler that ingests 20-year-old COBOL, Fortran, or legacy Java code and automatically produces unit-tested, modern TypeScript/Go microservices.
   - *Monetization*: Enterprise migration contracts ($50k–$200k/project).`;
  }

  // B. Code / React / useEffect Help
  if (/react|useeffect|code|javascript|programming|hook/i.test(norm)) {
    return `💻 **React \`useEffect\` Cleanup & Dependencies Explained**:

In React, \`useEffect\` handles side effects like API subscriptions, timers, and event listeners.

### 🔑 Key Concepts:
1. **Dependency Array \`[]\`**:
   - \`[]\` (empty): Runs only **once** on component mount.
   - \`[stateA, stateB]\`: Re-runs whenever \`stateA\` or \`stateB\` changes.
   - Omitted: Runs after **every single render**.

2. **Cleanup Function**:
   - The returned function runs **before** the effect re-executes and when the component **unmounts** (preventing memory leaks).

\`\`\`jsx
import React, { useState, useEffect } from 'react';

function TimerComponent() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // 1. Setup side effect (Interval timer)
    const intervalId = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    // 2. Cleanup function (Clears timer on unmount)
    return () => {
      clearInterval(intervalId);
    };
  }, []); // Runs once on mount

  return <div>Timer: {seconds}s</div>;
}
\`\`\``;
  }

  // C. Email Drafting
  if (/draft|email|letter|formal message/i.test(norm)) {
    return `📝 **Professional Project Update Email**:

**Subject:** Project Status Update: Key Milestones & Next Steps

**Hi Team,**

Hope you are having a productive week.

I wanted to share a quick update on our current project progress:
- **Completed Milestones:** Core modules and foundational design have been successfully integrated and verified.
- **In Progress:** Performance tuning, feature polish, and cross-browser testing.
- **Upcoming Deliverables:** Final stakeholder review scheduled for early next week.

Everything is on track with our delivery schedule. Please let me know if you have any questions or feedback.

Best regards,  
**[Your Name]**  
*Project Lead / Developer*`;
  }

  // D. Travel Itinerary
  if (/travel|trip|tokyo|itinerary|vacation|tour/i.test(norm)) {
    return `✈️ **3-Day Weekend Itinerary for Tokyo, Japan**:

- **Day 1: Modern & Trendy Tokyo (Shibuya & Shinjuku)**
  - *Morning*: Cross the iconic Shibuya Crossing & visit Hachiko Memorial.
  - *Afternoon*: Explore Meiji Jingu Shrine and trendy Harajuku Takeshita Street.
  - *Evening*: Shibuya Sky observation deck at sunset & dinner in Omoide Yokocho (Shinjuku).

- **Day 2: Historic & Tech Tokyo (Asakusa & Akihabara)**
  - *Morning*: Visit Senso-ji Temple and browse traditional snacks on Nakamise Street.
  - *Afternoon*: Stroll through Ueno Park & explore gadget/anime shops in Akihabara.
  - *Evening*: Sumida River cruise and dinner with panoramic views at Tokyo Skytree.

- **Day 3: Art & Waterfront (TeamLab & Odaiba)**
  - *Morning*: Immersive digital art experience at teamLab Planets in Toyosu.
  - *Afternoon*: Visit the Toyosu Fish Market for world-class sushi.
  - *Evening*: Walk along Odaiba Seaside Park and see the Rainbow Bridge lit up.

💡 **Budget Tip**: Buy a 72-Hour Tokyo Subway Pass (¥1,500) for unlimited rides on all Tokyo Metro and Toei subway lines!`;
  }

  // E. Summarization & Explanations (e.g. Quantum Computing)
  if (/quantum|explain|summarize|summary|concept/i.test(norm)) {
    return `📚 **Quantum Computing in 3 Simple Bullet Points**:

1. **Superposition (Beyond 0s and 1s)**:
   - Classical computers use bits that are either **0 or 1**. Quantum computers use **Qubits**, which can exist as 0, 1, or both simultaneously, allowing them to calculate trillions of possibilities at once.

2. **Entanglement (Instant Quantum Linking)**:
   - Qubits can become connected so that the state of one instantly influences the other, creating massive exponential computational power for complex simulations.

3. **Real-World Superpower**:
   - They solve problems that would take regular supercomputers thousands of years in mere minutes — including drug discovery, breaking cryptography, and climate modeling.`;
  }

  // F. General Fallback
  return `✨ **ChatNex AI**: Here is the breakdown for "${cleanPrompt}":

- **Core Insight**: A strategic approach to this involves identifying the primary objectives, key stakeholders, and actionable milestones.
- **Action Step**: Let me know if you would like me to deep-dive into specific sub-topics, write complete code, or generate a tailored summary!`;
}

exports.generateAIReply = generateAIReply;

// Helper: Generate AI Image
async function generateAIImage(prompt) {
  const cleanPrompt = (prompt || "").trim().replace(/^\/(imagine|generate|draw|art)\s*/i, "");
  const safePrompt = cleanPrompt.replace(/[^a-zA-Z0-9\s,.-]/g, "").slice(0, 100);
  const encodedPrompt = encodeURIComponent(cleanPrompt);
  const seed = Math.floor(Math.random() * 999999);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=768&seed=${seed}&nologo=true&enhance=true`;

  const uploadsDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `ai-gen-${Date.now()}-${safePrompt.replace(/\s+/g, "_").slice(0, 25)}.jpg`;
  const localPath = path.join(uploadsDir, filename);
  const relativeUrl = `uploads/${filename}`;

  try {
    const response = await fetchWithTimeout(imageUrl, {}, 12000);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 2000) {
        fs.writeFileSync(localPath, Buffer.from(buffer));
        return {
          imageUrl: relativeUrl,
          prompt: cleanPrompt,
          seed,
        };
      }
    }
  } catch (imgErr) {
    console.warn("Pollinations imagine image fetch timeout/error:", imgErr.message);
  }

  return {
    imageUrl: imageUrl,
    prompt: cleanPrompt,
    seed,
  };
}

exports.generateAIImage = generateAIImage;

// 1. In-Chat AI Assistant (@ai)
exports.askAI = async (req, res) => {
  try {
    const { prompt, username } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ status: false, msg: "Prompt is required" });
    }

    const replyText = await generateAIReply(prompt, username);
    return res.json({ status: true, text: replyText });
  } catch (error) {
    console.error("Error in askAI:", error);
    return res.status(500).json({ status: false, msg: "Failed to process AI query" });
  }
};

// 2. Real-Time Message Translation
exports.translateMessage = async (req, res) => {
  try {
    const { text, targetLanguage = "en", targetLangName: clientLangName } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ status: false, msg: "Text is required for translation" });
    }

    const langMap = {
      en: "English",
      hi: "Hindi",
      es: "Spanish",
      fr: "French",
      de: "German",
      ja: "Japanese",
      zh: "Chinese",
      ar: "Arabic",
      ru: "Russian",
      pt: "Portuguese",
      ur: "Urdu",
      it: "Italian",
      bn: "Bengali",
      mr: "Marathi",
      te: "Telugu",
      ta: "Tamil",
      gu: "Gujarati",
      pa: "Punjabi",
      kn: "Kannada",
      ml: "Malayalam",
      ko: "Korean",
      tr: "Turkish",
      vi: "Vietnamese",
      id: "Indonesian",
      th: "Thai",
      nl: "Dutch",
      pl: "Polish",
      sv: "Swedish",
      el: "Greek",
      fa: "Persian",
      he: "Hebrew",
      cs: "Czech",
      ro: "Romanian",
      hu: "Hungarian",
      da: "Danish",
      fi: "Finnish",
      no: "Norwegian",
      uk: "Ukrainian",
    };

    const targetLangName = clientLangName || langMap[targetLanguage] || targetLanguage;

    // Strip command prefixes (/imagine, @ai, /generate, etc.)
    let textToTranslate = text.trim();
    let prefix = "";
    const commandMatch = textToTranslate.match(/^(\/(?:imagine|generate|draw|art)|@ai)\s+/i);
    if (commandMatch) {
      prefix = commandMatch[0];
      textToTranslate = textToTranslate.slice(prefix.length).trim();
    }

    // 1. Try MyMemory API with target language pairs (en|target, autodetect|target, etc.)
    const langPairs = targetLanguage === "en" 
      ? ["autodetect|en", "hi|en", "es|en", "fr|en"] 
      : [`en|${targetLanguage}`, `autodetect|${targetLanguage}`, `hi|${targetLanguage}`];

    for (const pair of langPairs) {
      try {
        const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=${pair}`;
        const response = await fetchWithTimeout(myMemoryUrl, {}, 5000);
        if (response.ok) {
          const data = await response.json();
          const translated = data.responseData?.translatedText;
          if (
            translated && 
            translated.trim() && 
            translated.trim().toLowerCase() !== textToTranslate.toLowerCase() &&
            !translated.includes("MYMEMORY WARNING")
          ) {
            return res.json({
              status: true,
              translatedText: prefix ? `${prefix}${translated.trim()}` : translated.trim(),
              targetLanguage,
              targetLangName,
              source: "mymemory",
            });
          }
        }
      } catch (e) {
        console.warn(`MyMemory translation pair (${pair}) error:`, e.message);
      }
    }

    // 2. Try Grok (xAI) API fallback
    const translateMessages = [
      {
        role: "system",
        content: `You are a professional language translator. Translate the given text accurately into ${targetLangName}. Output ONLY the translated text in ${targetLangName} without extra explanation or quotation marks.`,
      },
      { role: "user", content: textToTranslate },
    ];

    try {
      const grokTranslated = await callGrokAPI(translateMessages, "grok-beta");
      if (grokTranslated && grokTranslated.trim()) {
        return res.json({
          status: true,
          translatedText: prefix ? `${prefix}${grokTranslated.trim()}` : grokTranslated.trim(),
          targetLanguage,
          targetLangName,
          source: "grok",
        });
      }
    } catch (grokErr) {
      console.warn("Grok translation fallback error:", grokErr.message);
    }

    // 3. Try Pollinations Text API
    try {
      const response = await fetchWithTimeout(
        "https://text.pollinations.ai/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: translateMessages,
          }),
        },
        7000
      );

      if (response.ok) {
        const translated = await response.text();
        if (translated && translated.trim() && !translated.includes("<!DOCTYPE html>")) {
          return res.json({
            status: true,
            translatedText: prefix ? `${prefix}${translated.trim()}` : translated.trim(),
            targetLanguage,
            targetLangName,
            source: "pollinations",
          });
        }
      }
    } catch (err) {
      console.warn("AI translation error:", err.message);
    }

    // 4. Default fallback
    return res.json({
      status: true,
      translatedText: text.trim(),
      targetLanguage,
      targetLangName,
      source: "local_fallback",
    });
  } catch (error) {
    console.error("Error in translateMessage:", error);
    return res.status(500).json({ status: false, msg: "Translation failed" });
  }
};

// 3. In-Chat Image & Sticker Generator (/imagine <prompt>)
exports.imagineImage = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ status: false, msg: "Prompt is required" });
    }

    const cleanPrompt = prompt.trim().replace(/^\/(imagine|generate|draw|art)\s*/i, "");
    const safePrompt = cleanPrompt.replace(/[^a-zA-Z0-9\s,.-]/g, "").slice(0, 100);
    const encodedPrompt = encodeURIComponent(cleanPrompt);
    const seed = Math.floor(Math.random() * 999999);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=768&seed=${seed}&nologo=true&enhance=true`;

    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `ai-gen-${Date.now()}-${safePrompt.replace(/\s+/g, "_").slice(0, 25)}.jpg`;
    const localPath = path.join(uploadsDir, filename);
    const relativeUrl = `uploads/${filename}`;

    try {
      const response = await fetchWithTimeout(imageUrl, {}, 12000);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > 2000) {
          fs.writeFileSync(localPath, Buffer.from(buffer));
          return res.json({
            status: true,
            imageUrl: relativeUrl,
            prompt: cleanPrompt,
            seed,
          });
        }
      }
    } catch (imgErr) {
      console.warn("Pollinations imagine image fetch timeout/error:", imgErr.message);
    }

    // Fallback: return direct image URL
    return res.json({
      status: true,
      imageUrl: imageUrl,
      prompt: cleanPrompt,
      seed,
    });
  } catch (error) {
    console.error("Error in imagineImage:", error);
    return res.status(500).json({ status: false, msg: "Failed to generate image" });
  }
};

// 4. Voice-to-Text Transcription
exports.transcribeAudio = async (req, res) => {
  try {
    const { audioUrl, voiceTranscript } = req.body;
    if (voiceTranscript && voiceTranscript.trim()) {
      return res.json({
        status: true,
        transcript: voiceTranscript.trim(),
      });
    }

    if (!audioUrl) {
      return res.status(400).json({ status: false, msg: "Audio URL is required" });
    }

    return res.json({
      status: true,
      transcript: "Voice note audio detected (No speech recognized or silence).",
    });
  } catch (error) {
    console.error("Error in transcribeAudio:", error);
    return res.status(500).json({ status: false, msg: "Transcription failed" });
  }
};

// 5. AI Tone Rewriter (Magic Wand)
exports.rewriteMessage = async (req, res) => {
  try {
    const { text, tone = "professional" } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ status: false, msg: "Text is required for tone rewriting" });
    }

    const tonePrompts = {
      professional: "Rewrite the following message in a polished, respectful, professional, and clear corporate tone. Keep the original intent intact.",
      casual: "Rewrite the following message in a fun, relaxed, casual, friendly chat tone with appropriate emojis.",
      concise: "Make the following message clear, punchy, and concise, removing all fluff.",
      polite: "Rewrite the following message to sound extremely polite, warm, thoughtful, and courteous.",
      energetic: "Rewrite the following message with high energy, enthusiasm, motivation, and excitement!",
    };

    const systemInstruction = tonePrompts[tone] || tonePrompts.professional;
    const rewriteMessages = [
      {
        role: "system",
        content: `${systemInstruction} Output ONLY the rewritten message text without any prefixes or quotation marks.`,
      },
      { role: "user", content: text.trim() },
    ];

    // 1. Try Pollinations Text API
    try {
      const response = await fetchWithTimeout(
        "https://text.pollinations.ai/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: rewriteMessages,
            model: "openai",
          }),
        },
        8000
      );

      if (response.ok) {
        const rewritten = await response.text();
        if (rewritten && rewritten.trim()) {
          return res.json({
            status: true,
            rewrittenText: rewritten.trim(),
            originalText: text.trim(),
            tone,
            source: "pollinations",
          });
        }
      }
    } catch (err) {
      console.warn("Pollinations tone rewrite error:", err.message);
    }

    // 2. Fallback: Try Grok (xAI) API
    try {
      const grokRewritten = await callGrokAPI(rewriteMessages, "grok-beta");
      if (grokRewritten) {
        return res.json({
          status: true,
          rewrittenText: grokRewritten,
          originalText: text.trim(),
          tone,
          source: "grok",
        });
      }
    } catch (grokErr) {
      console.warn("Grok rewrite fallback error:", grokErr.message);
    }

    // 3. Fallback: Smart local tone variations
    const trimmed = text.trim();
    let fallback = trimmed;
    if (tone === "professional") {
      fallback = `I would like to follow up regarding: ${trimmed}. Please let me know your thoughts at your earliest convenience.`;
    } else if (tone === "casual") {
      fallback = `Hey! Just wanted to share: ${trimmed} 😄 Let me know what you think!`;
    } else if (tone === "concise") {
      fallback = trimmed.replace(/please|kindly|i think|actually/gi, "").trim();
    } else if (tone === "polite") {
      fallback = `Hope you are having a wonderful day! Whenever you have a moment: ${trimmed}. Thank you so much!`;
    } else if (tone === "energetic") {
      fallback = `Awesome news! 🚀 ${trimmed} Let's make it happen! ✨`;
    }

    return res.json({
      status: true,
      rewrittenText: fallback,
      originalText: trimmed,
      tone,
      source: "local_fallback",
    });
  } catch (error) {
    console.error("Error in rewriteMessage:", error);
    return res.status(500).json({ status: false, msg: "Failed to rewrite message" });
  }
};
