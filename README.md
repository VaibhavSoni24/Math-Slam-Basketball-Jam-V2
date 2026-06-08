# Math Slam: Basketball Jam 🏀

Welcome to the repo for **Math Slam: Basketball Jam** — an educational arcade game built in Phaser 4, where fast math skills translate to deep three-pointers.

This document serves as the primary Workflow Documentation tracking how this game was conceptualized, built, and polished using an AI-assisted development pipeline. 

---

## 🎮 Play Now
**[Live Game →](https://vaibhavsoni24.github.io/Math-Slam-Basketball-Jam-V2/)**

## 🚀 AI-Assisted Development Workflow

Building this game required a highly parallelized workflow leveraging multiple AI models and specialized tools across different phases of the project. Here is the exact breakdown of the development process.

### Phase 1: Conceptualization & Game Design Document (GDD)
**Duration:** ~10 mins
**Tool Used:** Claude 3.5 Sonnet (Web App)

The initial idea was born out of a prompt to create an engaging, highly competitive educational game that didn't feel like a standard "ed-tech quiz". 

I fed Claude an initial prompt asking for an arcade-style mechanic:
> *"I want to build an educational math game for grades 2-6. It shouldn't feel like a quiz. I want a sports theme—basketball. Players solve math problems rapidly, and answering correctly triggers a physical arcade mechanic, like a power-bar stopping in a green zone to shoot a hoop. Output a complete Game Design Document (GDD)."*

Claude generated the comprehensive `Math_Slam_Basketball_Jam_GDD_v2.docx`, which served as the blueprint for the entire project.

### Phase 2: Parallel Tracks — Architecture & Asset Generation
To accelerate development, we split the workflow into two parallel tracks: **Track A** (Code Architecture) and **Track B** (Asset Generation).

#### Track A: Project Creation & Code Design
**Duration:** ~30 mins
**Tool Used:** Antigravity IDE (Powered by Claude 4.6 Sonnet)

Using the newly minted GDD, I passed the documentation into the Antigravity IDE as a "Skill File" constraint.
**Prompt to Antigravity:**
> *"Read the attached GDD and Game-Dev-SF.md completely. Understand the concept, research the latest Phaser 4 tech stack, and create the complete game specifically compatible for web. Structure it modularly with separate scenes."*

Antigravity generated the entire Phaser boilerplates, the `MathEngine.js` for dynamic problem generation, the `ShotMechanic.js` for the oscillating power bar, and the decoupled DOM-based `HudScene` and `MenuScene` architectures. 

#### Track B: Asset Generation Pipeline
**Duration:** ~30 mins(parallel to Track A)
**Tools Used:** Ludo AI, ChatGPT (DALL-E 3), Suno AI

While Antigravity built the engine, I handled the asset pipeline.
1. **Ludo AI (Initial Assets):** I used Ludo AI to generate the core sprites.
   - *Call:* `/generate sprite "Chibi anime-style basketball player, orange jersey, idle stance, pixel art, transparent background"`
   - *Call:* `/generate background "Indoor basketball court at night, dramatic lighting, pixel art style, 16:9"`
2. **ChatGPT (Fallback):** Midway through sprite generation, my Ludo AI credits ran out. I immediately pivoted to ChatGPT using DALL-E 3 with strict prompts to match the existing pixel-art style for the remaining assets (UI elements, `ball_glow`, `player_blue` opponent).
3. **Suno AI (Audio):** To give the game a premium arcade feel, I prompted Suno AI to generate the BGM:
   - *Prompt:* *"Upbeat 16-bit arcade sports music, high energy, pumping bass, looping, no vocals."*

### Phase 3: Integration & Debugging
**Duration:** ~20 mins
**Tools Used:** Manual Debugging + Gemini 3.1 Pro

Once the assets were dropped into the Antigravity-generated project, we entered the refinement phase. The initial integration had several UI alignment bugs (Phaser Canvas vs DOM overlay collisions) and game-loop race conditions.

I partnered with Gemini 3.1 Pro to squash the remaining bugs:
- Fixing the `court_bg` scaling letterbox issue using `Math.max()` dynamic scaling.
- Rewriting the HUD's flexbox alignment so `.menu-fullpage` centered perfectly on ultra-wide monitors.
- Squashing a race condition in `ShotMechanic.js` where overlapping `setInterval` timers caused the power bar to break the sound barrier.
- Refining the CPU opponent logic so Practice Mode had a realistic 5-second thinking delay.

---

## 🛠 Deployment & Testing Checklist

The project is currently configured to be hosted statically on **GitHub Pages**. 

### The "One Thing to Double-Check" Rule ✅
Before submitting or sharing the live link, we executed the final validation check:
> *"Open the playable link in an incognito window on both desktop and mobile. Make sure it loads without you being logged in anywhere, the game actually starts, and it doesn't throw any console errors on load."*

- **CORS / 404 Check:** `phaser.js` was migrated from a local `node_modules` import to the `cdn.jsdelivr.net` CDN to ensure it doesn't 404 when pushed to GitHub.
- **Asset Paths:** All asset paths in `BootScene` use strict relative paths (`assets/images/`, `assets/audio/`).
- **Responsive Canvas:** The Phaser scale manager is locked to `Phaser.Scale.FIT` to ensure flawless rendering on both Desktop and Mobile webviews.

---
*Documented by Vaibhav Soni — June 2026*
