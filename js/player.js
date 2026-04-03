/* ══════════════════════════════════════════
   player.js  —  Player controller
══════════════════════════════════════════ */

class Player {
  constructor(scene, camera, gameMap) {
    this.scene    = scene;
    this.camera   = camera;
    this.map      = gameMap;

    // Stats
    this.hp       = 100;
    this.armor    = 0;
    this.maxHp    = 100;
    this.dead     = false;
    this.grenades = 2;

    // Movement
    this.speed    = 6;
    this.sprintMult = 1.6;
    this.crouchMult = 0.5;
    this.jumpForce  = 6;
    this.gravity    = -14;
    this._vy      = 0;
    this._onGround = true;
    this._isSprinting = false;
    this._isCrouching = false;

    // Weapon manager
    this.weapons  = new WeaponManager();
    this.weapons.buildMesh(scene, camera);

    // FP Controls
    this._euler   = new THREE.Euler(0, 0, 0, 'YXZ');
    this._isLocked= false;
    this._PI_2    = Math.PI / 2;

    // Input state
    this.keys     = {};
    this.mouseDown = { left: false, right: false };
    this._footTimer = 0;
    this._adsZoom   = false;

    // Stats tracking
    this.shotsFired  = 0;
    this.shotsHit    = 0;

    // Grenades in-flight
    this._grenades = [];

    this._initControls();
    this._initPointerLock();
  }

  // ── Pointer Lock ──────────────────────────
  _initPointerLock() {
    const canvas = document.getElementById('game-canvas');
    document.addEventListener('pointerlockchange', () => {
      this._isLocked = (document.pointerLockElement === canvas);
      if (this._isLocked) {
        document.getElementById('lock-prompt').classList.add('hidden');
      } else {
        // Only show prompt if game is running, not paused
        if (window.GAME_STATE === 'playing') {
          window.pauseGame && window.pauseGame();
        }
      }
    });

    canvas.addEventListener('click', () => {
      if (!this._isLocked && window.GAME_STATE === 'playing') {
        AudioSystem.resume();
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('mousemove', e => {
      if (!this._isLocked) return;
      const sens = (window.SETTINGS?.sensitivity || 1.2) * 0.001;
      this._euler.setFromQuaternion(this.camera.quaternion);
      this._euler.y -= e.movementX * sens;
      this._euler.x -= e.movementY * sens;
      this._euler.x  = Math.max(-this._PI_2 * 0.9, Math.min(this._PI_2 * 0.9, this._euler.x));
      this.camera.quaternion.setFromEuler(this._euler);
    });

    document.addEventListener('mousedown', e => {
      if (e.button === 0) this.mouseDown.left  = true;
      if (e.button === 2) this.mouseDown.right = true;
    });
    document.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouseDown.left  = false;
      if (e.button === 2) this.mouseDown.right = false;
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  // ── Keyboard ──────────────────────────────
  _initControls() {
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;

      if (!this._isLocked) return;

      // Weapon switch
      if (e.code === 'Digit1') this._switchWeapon(1);
      if (e.code === 'Digit2') this._switchWeapon(2);
      if (e.code === 'Digit3') this._switchWeapon(3);

      // Reload
      if (e.code === 'KeyR') {
        this.weapons.current().reload(() => {
          document.getElementById('reload-msg').classList.add('hidden');
          HUD.updateAmmo(this.weapons.current());
        });
        document.getElementById('reload-msg').classList.remove('hidden');
      }

      // Grenade
      if (e.code === 'KeyG') this._throwGrenade();

      // Jump
      if (e.code === 'Space' && this._onGround) {
        this._vy      = this.jumpForce;
        this._onGround = false;
      }
    });

    document.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  }

  _switchWeapon(slot) {
    this.weapons.switchTo(slot, this.scene, this.camera);
    HUD.updateWeapon(this.weapons);
    HUD.updateAmmo(this.weapons.current());
  }

  // ── Update loop ───────────────────────────
  update(dt) {
    if (this.dead || !this._isLocked) return;

    this._isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    this._isCrouching = this.keys['ControlLeft'] || this.keys['ControlRight'];

    // Camera height based on stance
    const targetY = this._isCrouching ? 0.9 : 1.7;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.2;

    // Movement
    const moveSpeed = this.speed
      * (this._isSprinting ? this.sprintMult : 1)
      * (this._isCrouching ? this.crouchMult : 1)
      * dt;

    const dir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    dir.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  dir.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  dir.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dir.x += 1;

    if (dir.length() > 0) {
      dir.normalize().applyEuler(new THREE.Euler(0, this._euler.y, 0));
      this.camera.position.x += dir.x * moveSpeed;
      this.camera.position.z += dir.z * moveSpeed;
      // Collision
      this.map.resolveCollision(this.camera.position, 0.4);

      // Footstep sounds
      this._footTimer -= dt;
      if (this._footTimer <= 0) {
        AudioSystem.play('footstep');
        this._footTimer = this._isSprinting ? 0.25 : 0.4;
      }

      // Head bob
      const bob = Math.sin(Date.now() * (this._isSprinting ? 0.015 : 0.01)) * 0.03;
      this.camera.position.y += bob;
    }

    // Gravity / jump
    this._vy += this.gravity * dt;
    this.camera.position.y += this._vy * dt;
    if (this.camera.position.y <= (this._isCrouching ? 0.9 : 1.7)) {
      this.camera.position.y = this._isCrouching ? 0.9 : 1.7;
      this._vy    = 0;
      this._onGround = true;
    }

    // Shooting
    const w = this.weapons.current();
    const canShoot = this.mouseDown.left && !w.reloading;
    if (canShoot && (w.def.auto || this._justClicked)) {
      this._tryShoot();
    }

    // ADS
    const wantAds = this.mouseDown.right;
    if (wantAds !== this._adsZoom) {
      this._adsZoom = wantAds;
      this.camera.fov = wantAds ? (window.SETTINGS?.fov || 75) * 0.6 : (window.SETTINGS?.fov || 75);
      this.camera.updateProjectionMatrix();
      document.body.classList.toggle('ads', wantAds);
    }

    // Update grenades
    this._updateGrenades(dt);
  }

  _tryShoot() {
    const w = this.weapons.current();
    if (!w.canFire()) {
      if (w.mag === 0) {
        document.getElementById('reload-msg').classList.remove('hidden');
        w.reload(() => {
          document.getElementById('reload-msg').classList.add('hidden');
          HUD.updateAmmo(w);
        });
      }
      return null;
    }
    w.fire();
    this.weapons.recoilAnim();
    this.shotsFired++;
    HUD.updateAmmo(w);

    // Camera kick
    this._euler.x -= 0.015 * (w.def.pellets > 1 ? 3 : 1);
    this.camera.quaternion.setFromEuler(this._euler);

    // Cast rays for each pellet
    const hits = [];
    for (let p = 0; p < w.def.pellets; p++) {
      const spread = w.def.spread;
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * spread * 2,
        (Math.random() - 0.5) * spread * 2,
        -1
      );
      direction.applyQuaternion(this.camera.quaternion);
      hits.push({ origin: this.camera.position.clone(), direction });
    }
    return hits;
  }

  shoot() { return this._tryShoot(); }

  takeDamage(amount) {
    if (this.dead) return;
    let remaining = amount;
    if (this.armor > 0) {
      const blocked = Math.min(this.armor, remaining * 0.6);
      this.armor   -= blocked;
      remaining    -= blocked;
    }
    this.hp = Math.max(0, this.hp - remaining);
    AudioSystem.play('playerHurt');
    HUD.flashDamage();
    HUD.updateVitals(this.hp, this.armor);

    document.body.classList.toggle('low-hp', this.hp < 30);

    if (this.hp <= 0) this._die();
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    HUD.updateVitals(this.hp, this.armor);
  }

  addArmor(amount) {
    this.armor = Math.min(100, this.armor + amount);
    HUD.updateVitals(this.hp, this.armor);
  }

  _die() {
    this.dead = true;
    AudioSystem.play('playerDead');
    document.body.classList.remove('low-hp');
    window.onPlayerDead && window.onPlayerDead();
  }

  _throwGrenade() {
    if (this.grenades <= 0) return;
    this.grenades--;
    HUD.updateGrenades(this.grenades);

    const geo  = new THREE.SphereGeometry(0.12, 6, 6);
    const mat  = new THREE.MeshLambertMaterial({ color: 0x334422 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(this.camera.position);

    const dir  = new THREE.Vector3(0, 0.2, -1).applyQuaternion(this.camera.quaternion).normalize();
    const vel  = dir.multiplyScalar(12);
    vel.y += 3;

    this.scene.add(mesh);
    this._grenades.push({ mesh, vel, timer: 2.5, bounces: 0 });
    AudioSystem.play('grenadeBounce');
  }

  _updateGrenades(dt) {
    this._grenades = this._grenades.filter(g => {
      g.timer -= dt;
      g.vel.y += -10 * dt;
      g.mesh.position.x += g.vel.x * dt;
      g.mesh.position.y += g.vel.y * dt;
      g.mesh.position.z += g.vel.z * dt;

      // Floor bounce
      if (g.mesh.position.y < 0.12) {
        g.mesh.position.y = 0.12;
        g.vel.y *= -0.4;
        g.vel.x *= 0.7;
        g.vel.z *= 0.7;
        g.bounces++;
        if (g.bounces > 0) AudioSystem.play('grenadeBounce');
      }

      if (g.timer <= 0) {
        // EXPLODE
        this.scene.remove(g.mesh);
        AudioSystem.play('grenadeExplode');
        window.onGrenadeExplode && window.onGrenadeExplode(g.mesh.position.clone());
        return false;
      }
      return true;
    });
  }

  lock()   { document.getElementById('game-canvas').requestPointerLock(); }
  unlock() { document.exitPointerLock(); }
  isLocked() { return this._isLocked; }

  getAccuracy() {
    if (this.shotsFired === 0) return 0;
    return Math.round((this.shotsHit / this.shotsFired) * 100);
  }
}
