/* ══════════════════════════════════════════
   main.js  —  Core engine & game states
══════════════════════════════════════════ */

// ── Global state ────────────────────────────
window.GAME_STATE = 'loading';
window.SETTINGS = {
  sensitivity: 1.2,
  volume:      0.6,
  difficulty:  'normal',
  fov:         75,
};

// ── Three.js core ────────────────────────────
const renderer = new THREE.WebGLRenderer({
  canvas:    document.getElementById('game-canvas'),
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);

const scene  = new THREE.Scene();
scene.fog    = new THREE.Fog(0x000000, 8, 36);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
scene.add(camera);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Game objects ─────────────────────────────
let gameMap     = null;
let player      = null;
let enemyMgr    = null;
let raycaster   = new THREE.Raycaster();

// ── State ────────────────────────────────────
let round       = 1;
let score       = 0;
let kills       = 0;
let _prevTime   = performance.now();
let _roundActive= false;
let _roundDelay = false;

// ── Difficulty multipliers ────────────────────
const DIFFICULTY = {
  easy:    { dmgMult: 0.5,  spawnMult: 0.7 },
  normal:  { dmgMult: 1.0,  spawnMult: 1.0 },
  hard:    { dmgMult: 1.5,  spawnMult: 1.3 },
  extreme: { dmgMult: 2.2,  spawnMult: 1.8 },
};

// ── Loading ───────────────────────────────────
function simulateLoad() {
  AudioSystem.init();
  let progress = 0;
  const steps = [
    'Initializing Engine...',
    'Loading Geometry...',
    'Building Textures...',
    'Compiling Shaders...',
    'Spawning World...',
    'Ready.',
  ];
  let step = 0;
  const bar = document.getElementById('load-bar');
  const txt = document.getElementById('load-status');

  const iv = setInterval(() => {
    progress += Math.random() * 22 + 10;
    if (progress >= 100) { progress = 100; clearInterval(iv); }
    bar.style.width  = progress + '%';
    txt.textContent  = steps[Math.min(step++, steps.length - 1)];
    if (progress >= 100) {
      setTimeout(showMainMenu, 400);
    }
  }, 250);
}

// ── Menu helpers ──────────────────────────────
const $ = id => document.getElementById(id);

function showMainMenu() {
  GAME_STATE = 'menu';
  $('loading-screen').style.display = 'none';
  $('main-menu').classList.remove('hidden');
  HUD.hide();
}

function hideAllScreens() {
  ['main-menu','settings-panel','controls-panel','pause-menu','game-over','lock-prompt']
    .forEach(id => $(id).classList.add('hidden'));
}

// ── Menu buttons ─────────────────────────────
$('btn-play').addEventListener('click', () => {
  AudioSystem.play('menuClick');
  startGame();
});
$('btn-settings').addEventListener('click', () => {
  AudioSystem.play('menuClick');
  $('main-menu').classList.add('hidden');
  $('settings-panel').classList.remove('hidden');
});
$('btn-controls').addEventListener('click', () => {
  AudioSystem.play('menuClick');
  $('main-menu').classList.add('hidden');
  $('controls-panel').classList.remove('hidden');
});
$('btn-settings-back').addEventListener('click', () => {
  $('settings-panel').classList.add('hidden');
  $('main-menu').classList.remove('hidden');
});
$('btn-controls-back').addEventListener('click', () => {
  $('controls-panel').classList.add('hidden');
  $('main-menu').classList.remove('hidden');
});
$('btn-resume').addEventListener('click', () => {
  AudioSystem.play('menuClick');
  resumeGame();
});
$('btn-restart').addEventListener('click', () => {
  AudioSystem.play('menuClick');
  restartGame();
});
$('btn-to-menu').addEventListener('click', () => {
  AudioSystem.play('menuClick');
  goToMenu();
});
$('btn-again').addEventListener('click', () => {
  AudioSystem.play('menuClick');
  restartGame();
});
$('btn-go-menu').addEventListener('click', () => {
  AudioSystem.play('menuClick');
  goToMenu();
});

// Settings sliders
$('s-sens').addEventListener('input', e => {
  SETTINGS.sensitivity = parseFloat(e.target.value);
  $('s-sens-val').textContent = SETTINGS.sensitivity.toFixed(1);
});
$('s-vol').addEventListener('input', e => {
  SETTINGS.volume = parseFloat(e.target.value);
  $('s-vol-val').textContent = SETTINGS.volume.toFixed(1);
  AudioSystem.setVolume(SETTINGS.volume);
});
$('s-diff').addEventListener('change', e => {
  SETTINGS.difficulty = e.target.value;
});
$('s-fov').addEventListener('input', e => {
  SETTINGS.fov = parseInt(e.target.value);
  $('s-fov-val').textContent = SETTINGS.fov + '°';
  if (camera) { camera.fov = SETTINGS.fov; camera.updateProjectionMatrix(); }
});

// Pause with ESC
document.addEventListener('keydown', e => {
  if (e.code === 'Escape' && GAME_STATE === 'playing') pauseGame();
  else if (e.code === 'Escape' && GAME_STATE === 'paused') resumeGame();
});

// ── Game lifecycle ────────────────────────────
function startGame() {
  hideAllScreens();

  // Clear previous
  while (scene.children.length) scene.remove(scene.children[0]);
  scene.add(camera);

  // Reset state
  round  = 1;
  score  = 0;
  kills  = 0;
  _prevTime   = performance.now();
  _roundActive = false;
  _roundDelay  = false;

  // Build world
  gameMap   = new GameMap(scene);
  gameMap.buildMinimapImage($('minimap'));

  player = new Player(scene, camera, gameMap);
  camera.position.copy(gameMap.playerSpawn);
  camera.fov = SETTINGS.fov;
  camera.updateProjectionMatrix();

  enemyMgr = new EnemyManager(scene, gameMap);

  // Register callbacks
  window.GAME_STATE      = 'playing';
  window.onPlayerDead    = handlePlayerDead;
  window.onGrenadeExplode= handleGrenadeExplode;

  HUD.show();
  HUD.updateVitals(player.hp, player.armor);
  HUD.updateRound(round, score, 0);
  HUD.updateGrenades(player.grenades);
  HUD.updateWeapon(player.weapons);
  HUD.updateAmmo(player.weapons.current());

  // Show lock prompt then auto-lock
  $('lock-prompt').classList.remove('hidden');
  setTimeout(() => {
    AudioSystem.resume();
    document.getElementById('game-canvas').requestPointerLock();
    startRound();
  }, 800);

  requestAnimationFrame(gameLoop);
}

function startRound() {
  _roundActive = true;
  enemyMgr.spawnWave(round);
  HUD.showWaveStart(round);
  AudioSystem.play('roundStart');
  HUD.updateRound(round, score, enemyMgr.getAlive().length);
}

function pauseGame() {
  GAME_STATE = 'paused';
  player?.unlock();
  $('pause-menu').classList.remove('hidden');
}
window.pauseGame = pauseGame;

function resumeGame() {
  GAME_STATE = 'playing';
  $('pause-menu').classList.add('hidden');
  $('lock-prompt').classList.remove('hidden');
  document.getElementById('game-canvas').requestPointerLock();
  _prevTime = performance.now();
}

function restartGame() {
  hideAllScreens();
  HUD.hideGameOver();
  startGame();
}

function goToMenu() {
  hideAllScreens();
  HUD.hide();
  HUD.hideGameOver();
  GAME_STATE = 'menu';
  player?.unlock();
  $('main-menu').classList.remove('hidden');
}

// ── Game Over ────────────────────────────────
function handlePlayerDead() {
  GAME_STATE = 'gameover';
  setTimeout(() => {
    HUD.showGameOver(round, kills, player.getAccuracy(), score);
  }, 1200);
}

// ── Grenade Explosion ─────────────────────────
function handleGrenadeExplode(pos) {
  // Damage nearby enemies
  const radius = 5;
  enemyMgr.enemies.forEach(e => {
    if (e.dead) return;
    const dist = e.mesh.position.distanceTo(pos);
    if (dist < radius) {
      const dmg = Math.round(80 * (1 - dist / radius));
      const killed = e.takeDamage(dmg);
      if (killed) {
        kills++;
        score += e.type.points * 2; // bonus for grenade
        HUD.addKillFeed(e.type.name);
      }
    }
  });

  // Explosion visual
  const geo = new THREE.SphereGeometry(0.3, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
  const ball= new THREE.Mesh(geo, mat);
  ball.position.copy(pos);
  scene.add(ball);
  let scale = 1;
  const grow = setInterval(() => {
    scale += 0.5;
    ball.scale.setScalar(scale);
    ball.material.opacity = 1 - scale / 10;
    ball.material.transparent = true;
    if (scale > 10) { clearInterval(grow); scene.remove(ball); }
  }, 30);

  // Light flash
  const fl = new THREE.PointLight(0xff6600, 5, 15);
  fl.position.copy(pos);
  scene.add(fl);
  setTimeout(() => scene.remove(fl), 300);
}

// ── Raycasting (shooting) ────────────────────
function processShots(hits) {
  if (!hits) return;
  hits.forEach(({ origin, direction }) => {
    raycaster.set(origin, direction);
    // Collect enemy meshes for raycasting
    const targets = [];
    enemyMgr.enemies.forEach(e => {
      if (!e.dead) e.mesh.traverse(c => { if (c.isMesh) targets.push(c); });
    });

    const intersects = raycaster.intersectObjects(targets, false);
    if (intersects.length > 0) {
      // Find which enemy was hit
      const hitMesh = intersects[0].object;
      let hitEnemy = null;
      enemyMgr.enemies.forEach(e => {
        if (!e.dead) {
          e.mesh.traverse(c => { if (c === hitMesh) hitEnemy = e; });
        }
      });
      if (hitEnemy) {
        const diff = DIFFICULTY[SETTINGS.difficulty];
        const w    = player.weapons.current();
        const dmg  = w.def.damage * (0.85 + Math.random() * 0.3);
        player.shotsHit++;
        const killed = hitEnemy.takeDamage(dmg);
        HUD.showHitMarker();
        if (killed) {
          kills++;
          score += hitEnemy.type.points;
          HUD.addKillFeed(hitEnemy.type.name);
          HUD.updateRound(round, score, enemyMgr.getAlive().length);
        }
      }
    }
  });
}

// ── Ammo pickup drops ────────────────────────
const pickups = [];
function spawnPickup(pos) {
  if (Math.random() > 0.4) return;
  const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  const m   = new THREE.Mesh(geo, mat);
  m.position.copy(pos);
  m.position.y = 0.15;
  scene.add(m);
  pickups.push({ mesh: m, life: 10, type: Math.random() < 0.3 ? 'health' : 'ammo' });
}

function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.life -= dt;
    p.mesh.rotation.y += dt * 2;
    if (player) {
      const dist = p.mesh.position.distanceTo(camera.position);
      if (dist < 1.2) {
        if (p.type === 'health') {
          player.heal(25);
        } else {
          [1,2,3].forEach(s => {
            player.weapons.weapons[s].addAmmo(Math.floor(player.weapons.weapons[s].def.magSize * 0.5));
          });
        }
        AudioSystem.play('pickup');
        HUD.updateAmmo(player.weapons.current());
        HUD.updateVitals(player.hp, player.armor);
        scene.remove(p.mesh);
        pickups.splice(i, 1);
        continue;
      }
    }
    if (p.life <= 0) {
      scene.remove(p.mesh);
      pickups.splice(i, 1);
    }
  }
}

// ── Main game loop ────────────────────────────
function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  if (GAME_STATE !== 'playing') {
    renderer.render(scene, camera);
    return;
  }

  const dt = Math.min((now - _prevTime) / 1000, 0.05); // cap at 50ms
  _prevTime = now;

  // Player update
  if (player && !player.dead) {
    player.update(dt);

    // Handle shooting
    if (player.mouseDown.left) {
      const hits = player.shoot();
      if (hits) processShots(hits);
    }
  }

  // Enemy update + damage to player
  if (enemyMgr && _roundActive) {
    const totalDmg = enemyMgr.update(dt, camera.position);
    if (totalDmg > 0 && player && !player.dead) {
      const diff = DIFFICULTY[SETTINGS.difficulty];
      player.takeDamage(totalDmg * diff.dmgMult);
    }

    // Check round clear
    if (enemyMgr.allDead() && !_roundDelay) {
      _roundDelay = true;
      _roundActive = false;
      AudioSystem.play('roundClear');
      HUD.showRoundClear();
      // Drop pickups from defeated enemies
      enemyMgr.enemies.forEach(e => spawnPickup(e.mesh.position.clone()));

      setTimeout(() => {
        round++;
        _roundDelay = false;
        startRound();
      }, 5000);
    }

    // Update minimap
    HUD.updateMinimap(gameMap, camera.position, enemyMgr.enemies);
    HUD.updateRound(round, score, enemyMgr.getAlive().length);
  }

  // Pickup update
  updatePickups(dt);

  renderer.render(scene, camera);
}

// ── Boot ─────────────────────────────────────
simulateLoad();
