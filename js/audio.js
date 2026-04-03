/* ══════════════════════════════════════════
   audio.js  —  Procedural sound system
   Web Audio API (no external files needed)
══════════════════════════════════════════ */

const AudioSystem = (() => {
  let ctx = null;
  let masterGain = null;
  let volume = 0.6;

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(ctx.destination);
    } catch(e) { console.warn('AudioContext not available'); }
  }

  function setVolume(v) {
    volume = v;
    if (masterGain) masterGain.gain.value = v;
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ── Core synth helpers ──────────────────────
  function noise(duration = 0.1, gain = 0.3) {
    if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src  = ctx.createBufferSource();
    const g    = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    src.buffer = buf;
    filt.type = 'bandpass'; filt.frequency.value = 3000; filt.Q.value = 0.5;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(filt); filt.connect(g); g.connect(masterGain);
    src.start();
  }

  function tone(freq, duration = 0.1, type = 'sine', gainVal = 0.2) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(gainVal, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g); g.connect(masterGain);
    osc.start(); osc.stop(ctx.currentTime + duration);
  }

  // ── Sound Effects ───────────────────────────

  const sounds = {

    pistolShot() {
      noise(0.05, 0.5);
      tone(120, 0.06, 'sawtooth', 0.3);
    },

    rifleShot() {
      noise(0.04, 0.8);
      tone(90, 0.04, 'sawtooth', 0.4);
      tone(200, 0.02, 'square',   0.15);
    },

    shotgunBlast() {
      noise(0.15, 1.2);
      tone(60, 0.12, 'sawtooth', 0.5);
      tone(150, 0.08, 'square',  0.2);
    },

    reload() {
      // Mag click + chamber
      setTimeout(() => tone(800, 0.05, 'square', 0.1), 0);
      setTimeout(() => tone(400, 0.08, 'square', 0.15), 200);
      setTimeout(() => { noise(0.05, 0.2); tone(600, 0.05, 'square', 0.1); }, 500);
    },

    dryFire() {
      tone(600, 0.05, 'square', 0.05);
    },

    enemyHit() {
      noise(0.06, 0.4);
      tone(300, 0.04, 'sawtooth', 0.15);
    },

    enemyDead() {
      noise(0.2, 0.5);
      tone(200, 0.15, 'sawtooth', 0.3);
      tone(100, 0.2,  'sine',     0.2);
    },

    playerHurt() {
      noise(0.12, 0.6);
      tone(150, 0.1, 'sawtooth', 0.25);
    },

    playerDead() {
      tone(200, 0.3, 'sawtooth', 0.4);
      tone(100, 0.5, 'sine',     0.3);
      noise(0.3, 0.5);
    },

    grenadeBounce() {
      tone(400, 0.04, 'square', 0.1);
    },

    grenadeExplode() {
      noise(0.4, 1.5);
      tone(50,  0.3, 'sine',     0.6);
      tone(100, 0.2, 'sawtooth', 0.4);
    },

    footstep() {
      noise(0.04, 0.15);
      tone(80, 0.03, 'sine', 0.06);
    },

    roundStart() {
      tone(440, 0.1, 'sine', 0.2);
      setTimeout(() => tone(550, 0.1, 'sine', 0.2), 150);
      setTimeout(() => tone(660, 0.2, 'sine', 0.3), 300);
    },

    roundClear() {
      [440, 550, 660, 880].forEach((f, i) => {
        setTimeout(() => tone(f, 0.15, 'sine', 0.3), i * 120);
      });
    },

    pickup() {
      tone(660, 0.08, 'sine', 0.15);
      setTimeout(() => tone(880, 0.08, 'sine', 0.15), 80);
    },

    menuClick() {
      tone(500, 0.06, 'square', 0.08);
    },

    enemyShoot() {
      noise(0.05, 0.5);
      tone(100, 0.05, 'sawtooth', 0.25);
    },

    jumpLand() {
      noise(0.08, 0.3);
      tone(60, 0.06, 'sine', 0.2);
    },
  };

  // Public API
  return {
    init, resume, setVolume,
    play(name) {
      if (!ctx) return;
      resume();
      if (sounds[name]) sounds[name]();
    }
  };
})();
