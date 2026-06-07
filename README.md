# Math Slam: Basketball Jam 🏀

> "Solve it first. Shoot it fast. Win the court."

A fast-paced educational arcade game for **Grades 3–6** built with **Phaser 4.1.0**. Race to solve math problems (multiplication, division, fractions) to earn basketball shots against CPU opponents.

## 🎮 How to Play

1. **Select Mode**: Solo (vs CPU), 2-Player (same device), or Practice
2. **Select Level**: Varsity (Add/Sub), Pro (× ÷), or All-Star (Fractions)
3. Click **▶ PLAY NOW**
4. Solve the math problem by typing or tapping an answer
5. **Answer correctly first** → earn possession + power bar appears
6. Press **SPACE** or **ENTER** to release your shot at the right moment
7. Hit the green zone (82–100%) for a guaranteed 3-pointer!

## 🔢 Math Topics

| Level | Grades | Topics |
|-------|--------|--------|
| Varsity | 2–3 | 2-digit addition & subtraction |
| ⭐ Pro | 3–4 | Multiplication facts, division |
| All-Star | 5–6 | Fractions, decimals, mixed ops |

## 🚀 Running Locally

```bash
npm run dev
# Opens at http://localhost:8080
```

Or:
```bash
python -m http.server 8080
```

## 🏗️ Tech Stack

- **Engine**: Phaser 4.1.0 (WebGL/Canvas, web browser)
- **Language**: JavaScript ES Modules
- **Styling**: Vanilla CSS (no framework)
- **Math**: KaTeX for fraction rendering
- **Audio**: Web Audio API (procedural — no audio files needed)
- **Assets**: AI-generated sprites + canvas-drawn fallbacks

## 📁 Project Structure

```
├── index.html          ← Entry point
├── main.js             ← Phaser config + scene boot
├── style.css           ← HUD + UI styles
├── assets/
│   └── images/         ← Court, hoops, player sprites, ball
└── src/
    ├── scenes/
    │   ├── BootScene.js     ← Asset loading
    │   ├── MenuScene.js     ← Title + mode selection
    │   ├── PlayScene.js     ← Core game loop
    │   ├── HudScene.js      ← DOM HUD overlay
    │   └── GameOverScene.js ← Results screen
    └── game/
        ├── MathEngine.js    ← Problem generator + adaptive difficulty
        ├── CPUPlayer.js     ← CPU AI (Easy/Medium/Hard)
        ├── ShotMechanic.js  ← Power bar + ball arc physics
        └── AudioManager.js  ← Web Audio procedural sounds
```

## ✨ Features

- ✅ 3 game modes: Solo, 2-Player, Practice (flat)
- ✅ 3 difficulty tiers with adaptive difficulty
- ✅ CPU opponent with calibrated response speed
- ✅ Power bar shot mechanic with 4 zones
- ✅ Hot streak system (3+ consecutive wins)
- ✅ KaTeX math rendering for fractions
- ✅ Procedural audio (no files required)
- ✅ Responsive letterbox scaling (1280×720)

## 🎯 GDD Compliance

Built following the **Math Slam: Basketball Jam GDD v2** specification:
- Phaser 4 (^4.1.0) ✅
- DOM HUD overlay (transparent center viewport) ✅  
- Math-as-verb core mechanic ✅
- All 3 modes (solo/vs-score/flat) ✅
- Server-authoritative grading pattern (mocked locally) ✅
