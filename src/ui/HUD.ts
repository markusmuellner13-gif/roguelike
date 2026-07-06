import { WEAPONS } from '../data/weapons';
import type { Simulation } from '../systems/Simulation';

let cachedWeaponSignature = '';

export function showHud(): void {
  const hud = document.getElementById('hud');
  if (hud) hud.hidden = false;
}

export function hideHud(): void {
  const hud = document.getElementById('hud');
  if (hud) hud.hidden = true;
}

export function updateHud(sim: Simulation, stageName: string): void {
  const hpFill = document.getElementById('hp-fill');
  const hpLabel = document.getElementById('hp-label');
  const xpFill = document.getElementById('xp-fill');
  const timer = document.getElementById('hud-timer');
  const stageEl = document.getElementById('hud-stage');
  const levelEl = document.getElementById('hud-level');
  const killsEl = document.getElementById('hud-kills');
  const chipsEl = document.getElementById('hud-chips');

  const p = sim.player;
  if (hpFill) hpFill.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
  if (hpLabel) hpLabel.textContent = `${Math.max(0, Math.ceil(p.hp))}/${Math.round(p.maxHp)}`;
  if (xpFill) xpFill.style.width = `${Math.min(100, (p.xp / p.xpToNext) * 100)}%`;
  if (timer) timer.textContent = formatTime(sim.elapsed);
  if (stageEl) stageEl.textContent = stageName;
  if (levelEl) levelEl.textContent = String(p.level);
  if (killsEl) killsEl.textContent = String(sim.kills);
  if (chipsEl) chipsEl.textContent = String(sim.chipsEarned);

  const signature = sim.weapons.map((w) => `${w.id}:${w.level}:${w.evolved}`).join(',');
  if (signature !== cachedWeaponSignature) {
    cachedWeaponSignature = signature;
    renderWeapons(sim);
  }
}

function renderWeapons(sim: Simulation): void {
  const container = document.getElementById('hud-weapons');
  if (!container) return;
  container.innerHTML = sim.weapons
    .map((w) => {
      const def = WEAPONS[w.id];
      return `<div class="hud-weapon ${w.evolved ? 'evolved' : ''}" title="${def.name}">${def.icon}<span class="hud-weapon__lvl">${w.level}</span></div>`;
    })
    .join('');
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
