/* ══════════════════════════════════════════
   hud.js  —  HUD update helpers
══════════════════════════════════════════ */

const HUD = (() => {

  const $ = id => document.getElementById(id);

  return {

    show() {
      $('hud').classList.remove('hidden');
    },

    hide() {
      $('hud').classList.add('hidden');
    },

    updateVitals(hp, armor) {
      const hpPct    = Math.max(0, hp / 100);
      const armorPct = Math.max(0, armor / 100);
      $('hp-bar').style.width    = (hpPct    * 100) + '%';
      $('armor-bar').style.width = (armorPct * 100) + '%';
      $('hp-val').textContent    = Math.ceil(hp);
      $('armor-val').textContent = Math.ceil(armor);

      // Colour shift
      $('hp-bar').style.background = hp < 30
        ? 'linear-gradient(90deg, #880000, #cc0000)'
        : 'linear-gradient(90deg, #cc1122, #ff3344)';
    },

    updateAmmo(weaponState) {
      $('ammo-mag').textContent = weaponState.mag;
      $('ammo-res').textContent = weaponState.reserve;
      // Low ammo warning
      const pct = weaponState.mag / weaponState.def.magSize;
      $('ammo-mag').style.color = pct < 0.25 ? '#ff4444' : '#39ff14';
    },

    updateWeapon(wm) {
      $('weapon-name-hud').textContent = wm.current().def.name;
      [1,2,3].forEach(i => {
        const el = $('ws' + i);
        el.classList.toggle('active', wm.active === i);
      });
    },

    updateRound(round, score, enemyCount) {
      $('round-num').textContent   = round;
      $('score-hud').textContent   = score.toLocaleString() + ' PTS';
      $('enemy-count').textContent = enemyCount;
    },

    updateGrenades(count) {
      $('nade-count').textContent = count;
    },

    flashDamage() {
      const v = $('dmg-vignette');
      v.classList.add('flash');
      setTimeout(() => v.classList.remove('flash'), 200);
    },

    showHitMarker() {
      const hm = $('hit-marker');
      hm.classList.remove('hidden');
      hm.style.animation = 'none';
      // Reflow trick
      void hm.offsetWidth;
      hm.style.animation = 'hit-anim 0.3s forwards';
      setTimeout(() => hm.classList.add('hidden'), 300);
    },

    addKillFeed(name) {
      const kf   = $('kill-feed');
      const entry= document.createElement('div');
      entry.className = 'kf-entry';
      entry.textContent = '✕ ' + name + ' eliminated';
      kf.appendChild(entry);
      setTimeout(() => entry.remove(), 3000);
    },

    showRoundClear() {
      const el = $('round-clear');
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 3000);
    },

    showWaveStart(round) {
      const el = $('wave-start');
      el.textContent = `— ROUND ${round} —`;
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 2500);
    },

    showReload(show) {
      $('reload-msg').classList.toggle('hidden', !show);
    },

    updateMinimap(gameMap, playerPos, enemies) {
      gameMap.drawMinimap($('minimap'), playerPos, enemies);
    },

    showGameOver(rounds, kills, acc, score) {
      $('go-rounds').textContent = rounds;
      $('go-kills').textContent  = kills;
      $('go-acc').textContent    = acc + '%';
      $('go-score').textContent  = score.toLocaleString();
      $('game-over').classList.remove('hidden');
    },

    hideGameOver() {
      $('game-over').classList.add('hidden');
    },
  };
})();
