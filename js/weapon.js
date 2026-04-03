/* ══════════════════════════════════════════
   weapon.js  —  Weapons, stats, fire logic
══════════════════════════════════════════ */

const WEAPONS = {

  pistol: {
    id: 'pistol',
    name: 'M9 PISTOL',
    slot: 1,
    damage: 35,
    fireRate: 350,        // ms between shots
    magSize: 15,
    reserveMax: 90,
    reloadTime: 1600,
    spread: 0.012,
    pellets: 1,
    auto: false,
    sound: 'pistolShot',
    color: 0x888888,
  },

  rifle: {
    id: 'rifle',
    name: 'M4A1 ASSAULT RIFLE',
    slot: 2,
    damage: 28,
    fireRate: 100,
    magSize: 30,
    reserveMax: 180,
    reloadTime: 2200,
    spread: 0.022,
    pellets: 1,
    auto: true,
    sound: 'rifleShot',
    color: 0x556655,
  },

  shotgun: {
    id: 'shotgun',
    name: 'M870 SHOTGUN',
    slot: 3,
    damage: 18,
    fireRate: 800,
    magSize: 8,
    reserveMax: 48,
    reloadTime: 2600,
    spread: 0.10,
    pellets: 8,
    auto: false,
    sound: 'shotgunBlast',
    color: 0x886644,
  },
};

// ── WeaponState – tracks runtime ammo / reload state ─────────
class WeaponState {
  constructor(def) {
    this.def     = def;
    this.mag     = def.magSize;
    this.reserve = def.reserveMax;
    this.reloading = false;
    this._lastShot = 0;
    this._reloadTimer = null;
  }

  canFire() {
    return (
      !this.reloading &&
      this.mag > 0 &&
      (Date.now() - this._lastShot) >= this.def.fireRate
    );
  }

  fire(callback) {
    if (!this.canFire()) {
      if (this.mag === 0) {
        AudioSystem.play('dryFire');
        this.reload(callback);
      }
      return false;
    }
    this.mag--;
    this._lastShot = Date.now();
    AudioSystem.play(this.def.sound);
    return true;
  }

  reload(onDone) {
    if (this.reloading) return;
    if (this.reserve <= 0 || this.mag === this.def.magSize) return;
    this.reloading = true;
    AudioSystem.play('reload');
    this._reloadTimer = setTimeout(() => {
      const needed  = this.def.magSize - this.mag;
      const taken   = Math.min(needed, this.reserve);
      this.mag     += taken;
      this.reserve -= taken;
      this.reloading = false;
      if (onDone) onDone();
    }, this.def.reloadTime);
  }

  cancelReload() {
    if (this._reloadTimer) {
      clearTimeout(this._reloadTimer);
      this._reloadTimer = null;
      this.reloading = false;
    }
  }

  addAmmo(amount) {
    this.reserve = Math.min(this.def.reserveMax, this.reserve + amount);
  }
}

// ── WeaponManager – manages all weapon slots ─────────────────
class WeaponManager {
  constructor() {
    this.weapons = {
      1: new WeaponState(WEAPONS.pistol),
      2: new WeaponState(WEAPONS.rifle),
      3: new WeaponState(WEAPONS.shotgun),
    };
    this.active = 1;
    this.mesh = null; // Three.js mesh visible to player
  }

  current() { return this.weapons[this.active]; }

  switchTo(slot, scene, camera) {
    if (!this.weapons[slot]) return;
    if (this.active === slot) return;
    this.weapons[this.active].cancelReload();
    this.active = slot;
    this._updateMesh(scene, camera);
  }

  // Build a simple gun mesh visible in FP view
  buildMesh(scene, camera) {
    if (this.mesh) { camera.remove(this.mesh); this.mesh.geometry?.dispose(); }

    const def  = this.current().def;
    const geo  = new THREE.BoxGeometry(0.08, 0.06, 0.4);
    const mat  = new THREE.MeshLambertMaterial({ color: def.color });
    this.mesh  = new THREE.Mesh(geo, mat);

    // Position in front of camera (right side, lower)
    this.mesh.position.set(0.22, -0.14, -0.38);
    this.mesh.rotation.y = 0.06;
    camera.add(this.mesh);
  }

  _updateMesh(scene, camera) { this.buildMesh(scene, camera); }

  // Animate recoil
  recoilAnim() {
    if (!this.mesh) return;
    this.mesh.position.z += 0.05;
    this.mesh.rotation.x -= 0.08;
    setTimeout(() => {
      if (!this.mesh) return;
      this.mesh.position.z -= 0.05;
      this.mesh.rotation.x += 0.08;
    }, 80);
  }
}
