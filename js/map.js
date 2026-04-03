/* ══════════════════════════════════════════
   map.js  —  Level / World generation
══════════════════════════════════════════ */

// Grid: 1 = wall, 0 = floor, 2 = spawn zone (player), 3 = enemy spawn
const MAP_GRID = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,0,1,1,0,1,0,1,1,0,0,0,1,1,0,0,0,0,1],
  [1,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,1],
  [1,0,0,0,0,0,0,1,1,1,0,1,1,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,3,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,3,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,0,0,0,0,1],
  [1,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,1],
  [1,0,0,0,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const CELL  = 4;   // world units per cell
const WALL_H = 3;  // wall height
const ROWS  = MAP_GRID.length;
const COLS  = MAP_GRID[0].length;

class GameMap {
  constructor(scene) {
    this.scene = scene;
    this.walls = [];          // collision boxes [{minX,maxX,minZ,maxZ}]
    this.playerSpawn = null;
    this.enemySpawns = [];
    this._buildTextures();
    this._build();
  }

  // ── Procedural canvas textures ──────────────
  _buildTextures() {
    this.wallTex    = this._makeWallTexture();
    this.floorTex   = this._makeFloorTexture();
    this.ceilTex    = this._makeCeilTexture();
  }

  _makeWallTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#1a1e18';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#0d110b';
    g.lineWidth = 2;
    // brick pattern
    for (let row = 0; row < 8; row++) {
      const offset = (row % 2) * 16;
      for (let col = -1; col < 8; col++) {
        const x = col * 32 + offset;
        const y = row * 16;
        g.strokeRect(x + 1, y + 1, 30, 14);
      }
    }
    // subtle noise
    for (let i = 0; i < 400; i++) {
      const px = Math.random() * 128, py = Math.random() * 128;
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
      g.fillRect(px, py, 2, 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 0.75);
    return t;
  }

  _makeFloorTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#14180f';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#0a0e08';
    g.lineWidth = 1;
    for (let i = 0; i < 128; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(COLS * 0.5, ROWS * 0.5);
    return t;
  }

  _makeCeilTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#0d1010';
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(COLS * 0.5, ROWS * 0.5);
    return t;
  }

  // ── Build the level geometry ─────────────────
  _build() {
    const wallMat  = new THREE.MeshLambertMaterial({ map: this.wallTex });
    const floorMat = new THREE.MeshLambertMaterial({ map: this.floorTex });
    const ceilMat  = new THREE.MeshLambertMaterial({ map: this.ceilTex });

    // Floor
    const floorGeo = new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((COLS * CELL) / 2, 0, (ROWS * CELL) / 2);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL);
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set((COLS * CELL) / 2, WALL_H, (ROWS * CELL) / 2);
    this.scene.add(ceil);

    // Walls
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = MAP_GRID[row][col];
        const wx = col * CELL + CELL / 2;
        const wz = row * CELL + CELL / 2;

        if (cell === 1) {
          const geo = new THREE.BoxGeometry(CELL, WALL_H, CELL);
          const mesh = new THREE.Mesh(geo, wallMat);
          mesh.position.set(wx, WALL_H / 2, wz);
          mesh.castShadow    = true;
          mesh.receiveShadow = true;
          this.scene.add(mesh);
          // AABB for collision
          this.walls.push({
            minX: wx - CELL / 2, maxX: wx + CELL / 2,
            minZ: wz - CELL / 2, maxZ: wz + CELL / 2,
          });
        } else if (cell === 2) {
          this.playerSpawn = new THREE.Vector3(wx, 1.7, wz);
        } else if (cell === 3) {
          this.enemySpawns.push(new THREE.Vector3(wx, 0, wz));
        }

        // Cover object on some floor tiles
        if (cell === 0 && Math.random() < 0.04) {
          this._addCover(wx, wz, wallMat);
        }
      }
    }

    // Fallback spawns
    if (!this.playerSpawn) this.playerSpawn = new THREE.Vector3(CELL * 5, 1.7, CELL * 4);
    if (this.enemySpawns.length === 0) {
      this.enemySpawns.push(
        new THREE.Vector3(CELL * 20, 0, CELL * 4),
        new THREE.Vector3(CELL * 20, 0, CELL * 15),
        new THREE.Vector3(CELL * 2,  0, CELL * 15),
      );
    }

    // Lighting
    this._addLights();
  }

  _addCover(x, z, mat) {
    const h   = 0.5 + Math.random() * 0.8;
    const geo = new THREE.BoxGeometry(0.8, h, 0.8);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    this.scene.add(mesh);
    this.walls.push({
      minX: x - 0.5, maxX: x + 0.5,
      minZ: z - 0.5, maxZ: z + 0.5,
    });
  }

  _addLights() {
    // Ambient
    const amb = new THREE.AmbientLight(0x223322, 0.5);
    this.scene.add(amb);

    // Distributed point lights
    const lightPositions = [
      [3, 2], [10, 3], [18, 4], [5, 10], [12, 9], [20, 10],
      [4, 15], [11, 16], [19, 15],
    ];
    lightPositions.forEach(([col, row]) => {
      const light = new THREE.PointLight(0x88ff88, 0.8, 20);
      light.position.set(col * CELL, WALL_H - 0.3, row * CELL);
      this.scene.add(light);

      // Visible lamp
      const lampGeo = new THREE.SphereGeometry(0.12, 6, 6);
      const lampMat = new THREE.MeshBasicMaterial({ color: 0x99ff99 });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.copy(light.position);
      this.scene.add(lamp);
    });
  }

  // ── Collision helpers ────────────────────────
  resolveCollision(pos, radius = 0.4) {
    for (const w of this.walls) {
      const px = Math.max(w.minX, Math.min(pos.x, w.maxX));
      const pz = Math.max(w.minZ, Math.min(pos.z, w.maxZ));
      const dx = pos.x - px;
      const dz = pos.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < radius && dist > 0) {
        const push = (radius - dist) / dist;
        pos.x += dx * push;
        pos.z += dz * push;
      }
    }
    // World bounds
    const margin = radius + 0.1;
    pos.x = Math.max(margin, Math.min(COLS * CELL - margin, pos.x));
    pos.z = Math.max(margin, Math.min(ROWS * CELL - margin, pos.z));
  }

  isWall(x, z) {
    const col = Math.floor(x / CELL);
    const row = Math.floor(z / CELL);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
    return MAP_GRID[row][col] === 1;
  }

  // Build minimap image (call once)
  buildMinimapImage(canvas) {
    const ctx  = canvas.getContext('2d');
    const cw   = canvas.width / COLS;
    const ch   = canvas.height / ROWS;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const v = MAP_GRID[row][col];
        ctx.fillStyle = v === 1 ? '#2a4a2a' : '#0a120a';
        ctx.fillRect(col * cw, row * ch, cw, ch);
      }
    }
    this._minimapBase = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  drawMinimap(canvas, playerPos, enemies) {
    const ctx = canvas.getContext('2d');
    if (this._minimapBase) ctx.putImageData(this._minimapBase, 0, 0);
    const cw = canvas.width / COLS;
    const ch = canvas.height / ROWS;
    // Enemies
    ctx.fillStyle = '#ff3344';
    (enemies || []).forEach(e => {
      if (!e.dead) {
        const ex = (e.mesh.position.x / CELL) * cw;
        const ez = (e.mesh.position.z / CELL) * ch;
        ctx.fillRect(ex - 2, ez - 2, 4, 4);
      }
    });
    // Player
    ctx.fillStyle = '#39ff14';
    const px = (playerPos.x / CELL) * cw;
    const pz = (playerPos.z / CELL) * ch;
    ctx.fillRect(px - 3, pz - 3, 6, 6);
  }
}
