/* ══════════════════════════════════════════
   enemy.js  —  Enemy AI & spawning
══════════════════════════════════════════ */

const ENEMY_STATES = { PATROL: 'patrol', CHASE: 'chase', ATTACK: 'attack', DEAD: 'dead' };

const ENEMY_TYPES = {
  grunt: {
    id:       'grunt',
    name:     'Grunt',
    hp:       60,
    speed:    2.0,
    damage:   8,
    fireRate: 1800,
    bodyColor: 0x883322,
    headColor: 0xcc8855,
    points:   100,
    scale:    1,
  },
  heavy: {
    id:       'heavy',
    name:     'Heavy',
    hp:       180,
    speed:    1.2,
    damage:   18,
    fireRate: 2400,
    bodyColor: 0x442244,
    headColor: 0xcc9966,
    points:   250,
    scale:    1.3,
  },
  runner: {
    id:       'runner',
    name:     'Runner',
    hp:       35,
    speed:    3.8,
    damage:   5,
    fireRate: 3000,
    bodyColor: 0x224433,
    headColor: 0xaaaa66,
    points:   75,
    scale:    0.85,
  },
};

class Enemy {
  constructor(scene, type, position, gameMap) {
    this.scene    = scene;
    this.type     = ENEMY_TYPES[type] || ENEMY_TYPES.grunt;
    this.hp       = this.type.hp;
    this.maxHp    = this.type.hp;
    this.state    = ENEMY_STATES.PATROL;
    this.dead     = false;
    this.map      = gameMap;
    this._lastShot    = 0;
    this._patrolDir   = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    this._patrolTimer = 0;
    this._alertTimer  = 0;
    this._velocity    = new THREE.Vector3();

    this._buildMesh(position);
    this._buildHealthBar();
  }

  // ── Visual: humanoid body ──────────────────
  _buildMesh(position) {
    const s = this.type.scale;
    this.mesh = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.5 * s, 0.7 * s, 0.3 * s);
    const bodyMat = new THREE.MeshLambertMaterial({ color: this.type.bodyColor });
    const body    = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.35 * s;
    this.mesh.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.35 * s, 0.35 * s, 0.35 * s);
    const headMat = new THREE.MeshLambertMaterial({ color: this.type.headColor });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.88 * s;
    this.mesh.add(head);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.15 * s, 0.5 * s, 0.15 * s);
    const armMat = new THREE.MeshLambertMaterial({ color: this.type.bodyColor });
    ['L', 'R'].forEach((side, i) => {
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set((i === 0 ? -0.35 : 0.35) * s, 0.35 * s, 0);
      this.mesh.add(arm);
    });

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2 * s, 0.5 * s, 0.2 * s);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    [-0.15, 0.15].forEach(xOff => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(xOff * s, -0.25 * s, 0);
      this.mesh.add(leg);
    });

    // Eyes (red glow)
    const eyeGeo = new THREE.SphereGeometry(0.05 * s, 4, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    [-0.08, 0.08].forEach(xOff => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(xOff * s, 0.88 * s, 0.18 * s);
      this.mesh.add(eye);
    });

    this.mesh.position.copy(position);
    this.mesh.position.y = 0;
    this.scene.add(this.mesh);
  }

  _buildHealthBar() {
    // Use a sprite-like approach with canvas
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 10;
    this._hpCanvas = canvas;
    this._hpCtx    = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(0.8, 0.12);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    this._hpBarMesh = new THREE.Mesh(geo, mat);
    this._hpBarMesh.position.y = 1.3 * this.type.scale;
    this.mesh.add(this._hpBarMesh);
    this._updateHpBar();
  }

  _updateHpBar() {
    const ctx = this._hpCtx;
    const pct = this.hp / this.maxHp;
    ctx.clearRect(0, 0, 64, 10);
    ctx.fillStyle = '#440000';
    ctx.fillRect(0, 0, 64, 10);
    ctx.fillStyle = pct > 0.5 ? '#33ff33' : pct > 0.25 ? '#ffaa00' : '#ff2233';
    ctx.fillRect(0, 0, 64 * pct, 10);
    this._hpBarMesh.material.map.needsUpdate = true;
  }

  // ── AI Update ─────────────────────────────
  update(dt, playerPos, gameMap) {
    if (this.dead) return;

    // Always face camera
    this._hpBarMesh.lookAt(
      this._hpBarMesh.getWorldPosition(new THREE.Vector3()).add(
        new THREE.Vector3(0, 0, 1) // simplified; main.js handles camera lookat
      )
    );

    const myPos = this.mesh.position;
    const dx    = playerPos.x - myPos.x;
    const dz    = playerPos.z - myPos.z;
    const dist  = Math.sqrt(dx * dx + dz * dz);

    switch (this.state) {
      case ENEMY_STATES.PATROL:
        this._patrol(dt, gameMap);
        if (dist < 16 && this._hasLineOfSight(playerPos, gameMap)) {
          this.state = ENEMY_STATES.CHASE;
        }
        break;

      case ENEMY_STATES.CHASE:
        this._moveTo(playerPos, dt, gameMap);
        if (dist < 5) { this.state = ENEMY_STATES.ATTACK; }
        if (dist > 22 || !this._hasLineOfSight(playerPos, gameMap)) {
          this._alertTimer += dt;
          if (this._alertTimer > 3) { this._alertTimer = 0; this.state = ENEMY_STATES.PATROL; }
        } else { this._alertTimer = 0; }
        break;

      case ENEMY_STATES.ATTACK:
        this._attack(playerPos, dt, gameMap);
        if (dist > 8) { this.state = ENEMY_STATES.CHASE; }
        break;
    }

    // Bob animation
    this.mesh.position.y = Math.sin(Date.now() * 0.004) * 0.03;
  }

  _patrol(dt, gameMap) {
    this._patrolTimer -= dt;
    if (this._patrolTimer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      this._patrolDir.set(Math.cos(angle), 0, Math.sin(angle));
      this._patrolTimer = 1 + Math.random() * 2;
    }
    const speed   = this.type.speed * 0.4 * dt;
    const nextPos = this.mesh.position.clone();
    nextPos.x += this._patrolDir.x * speed;
    nextPos.z += this._patrolDir.z * speed;
    gameMap.resolveCollision(nextPos, 0.4);
    const moved = nextPos.distanceTo(this.mesh.position);
    if (moved < speed * 0.5) {
      this._patrolTimer = 0; // recalculate direction
    }
    this.mesh.position.copy(nextPos);
    if (this._patrolDir.length() > 0.01) {
      this.mesh.rotation.y = Math.atan2(this._patrolDir.x, this._patrolDir.z);
    }
  }

  _moveTo(target, dt, gameMap) {
    const dx = target.x - this.mesh.position.x;
    const dz = target.z - this.mesh.position.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.01) return;
    const speed = this.type.speed * dt;
    const nextPos = this.mesh.position.clone();
    nextPos.x += (dx / len) * speed;
    nextPos.z += (dz / len) * speed;
    gameMap.resolveCollision(nextPos, 0.4);
    this.mesh.position.copy(nextPos);
    this.mesh.rotation.y = Math.atan2(dx, dz);
  }

  _attack(playerPos, dt, gameMap) {
    // Strafe slightly
    const dx    = playerPos.x - this.mesh.position.x;
    const dz    = playerPos.z - this.mesh.position.z;
    const len   = Math.sqrt(dx * dx + dz * dz);
    const perp  = new THREE.Vector3(-dz / len, 0, dx / len);
    const strafe = Math.sin(Date.now() * 0.001) * this.type.speed * 0.5 * dt;
    const nextPos = this.mesh.position.clone();
    nextPos.x += perp.x * strafe;
    nextPos.z += perp.z * strafe;
    gameMap.resolveCollision(nextPos, 0.4);
    this.mesh.position.copy(nextPos);
    this.mesh.rotation.y = Math.atan2(dx, dz);

    // Shoot at player
    const now = Date.now();
    if (now - this._lastShot > this.type.fireRate) {
      this._lastShot = now;
      AudioSystem.play('enemyShoot');
      return this.type.damage * (0.6 + Math.random() * 0.8);  // return dmg to apply
    }
    return 0;
  }

  _hasLineOfSight(targetPos, gameMap) {
    // Simple raycast check: step along direction, check for walls
    const steps = 20;
    const from  = this.mesh.position;
    const dx    = (targetPos.x - from.x) / steps;
    const dz    = (targetPos.z - from.z) / steps;
    for (let i = 1; i < steps; i++) {
      if (gameMap.isWall(from.x + dx * i, from.z + dz * i)) return false;
    }
    return true;
  }

  takeDamage(amount) {
    if (this.dead) return false;
    this.hp -= amount;
    this._updateHpBar();
    AudioSystem.play('enemyHit');
    // Flash red
    this.mesh.traverse(c => {
      if (c.isMesh && c.material.color) {
        const orig = c.material.color.getHex();
        c.material.color.set(0xff4444);
        setTimeout(() => { if (!this.dead) c.material.color.setHex(orig); }, 100);
      }
    });
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.dead  = true;
    this.state = ENEMY_STATES.DEAD;
    AudioSystem.play('enemyDead');
    // Fall over
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.position.y = -0.3;
    // Fade and remove
    setTimeout(() => {
      this.scene.remove(this.mesh);
    }, 4000);
  }
}

// ── EnemyManager ──────────────────────────────
class EnemyManager {
  constructor(scene, gameMap) {
    this.scene   = scene;
    this.map     = gameMap;
    this.enemies = [];
  }

  spawnWave(round) {
    const count = 3 + round * 2;
    const spawns = this.map.enemySpawns;
    for (let i = 0; i < count; i++) {
      const spawnPos = spawns[i % spawns.length].clone();
      // Randomize spawn position slightly
      spawnPos.x += (Math.random() - 0.5) * CELL * 2;
      spawnPos.z += (Math.random() - 0.5) * CELL * 2;
      // Pick enemy type based on round
      let type = 'grunt';
      if (round >= 3 && Math.random() < 0.2)  type = 'runner';
      if (round >= 5 && Math.random() < 0.15) type = 'heavy';
      if (round >= 8 && Math.random() < 0.3)  type = 'runner';

      this.enemies.push(new Enemy(this.scene, type, spawnPos, this.map));
    }
  }

  update(dt, playerPos) {
    let totalDmg = 0;
    this.enemies.forEach(e => {
      if (!e.dead) {
        const dmg = e._attack ? 0 : 0; // handled inside update
        e.update(dt, playerPos, this.map);
        // Check if in attack range and fired this frame
        if (e.state === ENEMY_STATES.ATTACK) {
          const dist = e.mesh.position.distanceTo(playerPos);
          if (dist < 6) {
            const now = Date.now();
            if (now - e._lastShot > e.type.fireRate) {
              e._lastShot = now;
              AudioSystem.play('enemyShoot');
              totalDmg += e.type.damage * (0.6 + Math.random() * 0.8);
            }
          }
        }
      }
    });
    return totalDmg;
  }

  getAlive() { return this.enemies.filter(e => !e.dead); }
  allDead()  { return this.enemies.every(e => e.dead); }

  clear() {
    this.enemies.forEach(e => {
      if (!e.dead) e.die();
    });
    this.enemies = [];
  }
}
