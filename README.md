# 🎮 ZONE OF WAR

> A browser-based First-Person Shooter inspired by Call of Duty — built entirely with Three.js, no game engine required.

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![Three.js](https://img.shields.io/badge/Three.js-r128-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Play Now
**[▶ Live Demo →](https://YOUR_USERNAME.github.io/zone-of-war)**

---

## ✨ Features

- **Fully 3D first-person gameplay** powered by Three.js WebGL
- **Wave-based survival mode** — fight through endless rounds of enemies
- **3 unique weapons**: M9 Pistol · M4A1 Assault Rifle · M870 Shotgun
- **3 enemy types**: Grunt · Heavy · Runner — with increasing difficulty per round
- **Full enemy AI**: patrol, chase, and attack states with line-of-sight detection
- **Grenade system** with physics and area-of-effect damage
- **Procedural sound** via Web Audio API — no audio files needed
- **Live minimap** showing player and enemies
- **Ammo & health pickups** dropped by defeated enemies
- **Dynamic HUD**: health, armor, ammo, kill feed, round counter, score
- **ADS (Aim Down Sights)** with FOV zoom
- **Sprint, Crouch, Jump** mechanics
- **4 difficulty levels**: Recruit → Soldier → Veteran → Legend
- **Settings panel**: sensitivity, volume, FOV, difficulty
- **Zero external assets** — everything generated at runtime

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| `W A S D` | Move |
| `Mouse` | Look |
| `Left Click` | Shoot |
| `Right Click` | Aim Down Sights |
| `R` | Reload |
| `1 / 2 / 3` | Switch Weapon |
| `Shift` | Sprint |
| `Ctrl` | Crouch |
| `Space` | Jump |
| `G` | Throw Grenade |
| `Esc` | Pause |

---

## 📁 Project Structure

```
zone-of-war/
├── index.html          # Game entry point & UI overlays
├── css/
│   └── style.css       # Military dark theme
├── js/
│   ├── audio.js        # Web Audio API sound engine
│   ├── weapon.js       # Weapon definitions & fire logic
│   ├── map.js          # Grid-based level generation
│   ├── enemy.js        # Enemy AI & spawning
│   ├── player.js       # FPS controller & physics
│   ├── hud.js          # HUD update helpers
│   └── main.js         # Core loop, states, raycasting
└── README.md
```

---

## 🛠️ Run Locally

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/zone-of-war.git
cd zone-of-war

# Option 1: Python simple server
python3 -m http.server 8080

# Option 2: Node.js
npx serve .

# Option 3: VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

Then open **http://localhost:8080**

---

## 🌐 Free Deployment Options

### ✅ GitHub Pages (Recommended — easiest)
1. Push code to GitHub
2. Go to **Settings → Pages**
3. Source: **main branch / root**
4. Your game is live at `https://USERNAME.github.io/zone-of-war`

### ✅ Netlify (Drag & Drop)
1. Go to [netlify.com](https://netlify.com)
2. Drag the project folder onto the deploy zone
3. Instant live URL — no setup needed

### ✅ Vercel
```bash
npm i -g vercel
vercel
```

### ✅ Cloudflare Pages
1. Connect your GitHub repo at [pages.cloudflare.com](https://pages.cloudflare.com)
2. Build command: *(leave empty)*
3. Output directory: `/`

---

## 🔧 Customization

**Add a new weapon** — edit `js/weapon.js`:
```javascript
sniper: {
  id: 'sniper', name: 'AWP SNIPER',
  slot: 4, damage: 120, fireRate: 1800,
  magSize: 5, reserveMax: 25, reloadTime: 3000,
  spread: 0.003, pellets: 1, auto: false,
  sound: 'rifleShot', color: 0x445566,
}
```

**Add a new map** — edit the `MAP_GRID` array in `js/map.js`  
(1 = wall, 0 = floor, 2 = player spawn, 3 = enemy spawn)

**Tweak enemy types** — edit `ENEMY_TYPES` in `js/enemy.js`

---

## 📦 GitHub Setup

```bash
git init
git add .
git commit -m "🎮 Initial commit — Zone of War"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zone-of-war.git
git push -u origin main
```

---

## 📄 License
MIT — free to use, modify, and distribute.
