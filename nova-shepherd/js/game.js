// Nova Shepherd — main game
(() => {
  'use strict';
  const { UPG, META, SKINS, ENEMY } = DATA;
  const $ = id => document.getElementById(id);
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const STEP = 1 / 60;
  const MOON_CAP = 10;

  // ---------------------------------------------------------------- save
  const SAVE_KEY = 'novashepherd_save_v1';
  const defaultSave = () => ({
    dust: 0, meta: {}, skin: 'sol', skins: { sol: true },
    settings: { sfx: true, music: true, shake: true },
    stats: { best: 0, bestKills: 0, bestLvl: 0, runs: 0, bosses: 0, kills: 0 },
    tutorial: false,
  });
  let save = defaultSave();
  function loadSave() {
    const raw = CG.getItem(SAVE_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw), def = defaultSave();
      save = Object.assign(def, d);
      save.settings = Object.assign(defaultSave().settings, d.settings || {});
      save.stats = Object.assign(defaultSave().stats, d.stats || {});
      save.meta = d.meta || {};
      save.skins = Object.assign({ sol: true }, d.skins || {});
      if (!SKINS.find(s => s.id === save.skin)) save.skin = 'sol';
    } catch (e) { save = defaultSave(); }
  }
  function persist() { CG.setItem(SAVE_KEY, JSON.stringify(save)); }
  const metaLv = id => save.meta[id] | 0;
  const skin = () => SKINS.find(s => s.id === save.skin) || SKINS[0];

  // ---------------------------------------------------------------- canvas
  const cv = $('game'), ctx = cv.getContext('2d', { alpha: false });
  let W = 0, H = 0, DPR = 1, SCALE = 1, UI = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.max(1, Math.round(W * DPR)); cv.height = Math.max(1, Math.round(H * DPR));
    SCALE = clamp(Math.min(W, H) / 580, 0.6, 2.4);
    UI = clamp(Math.min(W, H) / 640, 0.7, 1.7);
  }
  window.addEventListener('resize', resize);
  resize();

  // colour helpers + cached glow sprites
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const rgba = (h, a) => { const c = hexRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  const glowCache = new Map();
  function glow(color) {
    let c = glowCache.get(color);
    if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, rgba(color, 0.9)); gr.addColorStop(0.25, rgba(color, 0.35)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    glowCache.set(color, c); return c;
  }
  // background tiles
  function makeStarTile(size, count, maxR, alpha, tint) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    for (let i = 0; i < count; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = Math.random() * maxR + 0.4;
      const col = Math.random() < 0.2 ? tint : '#ffffff';
      g.globalAlpha = alpha * rand(0.35, 1);
      g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      if (r > maxR * 0.75) { g.globalAlpha = alpha * 0.25; g.drawImage(glow(col), x - r * 5, y - r * 5, r * 10, r * 10); }
    }
    return c;
  }
  function makeNebulaTile(size) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    const cols = ['#3a1c78', '#12306e', '#5a1850', '#0f4a5a'];
    for (let i = 0; i < 9; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = rand(size * 0.15, size * 0.4), col = pick(cols);
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const gr = g.createRadialGradient(x + ox * size, y + oy * size, 0, x + ox * size, y + oy * size, r);
        gr.addColorStop(0, rgba(col, 0.22)); gr.addColorStop(1, rgba(col, 0));
        g.fillStyle = gr; g.fillRect(0, 0, size, size);
      }
    }
    return c;
  }
  const BG = [
    { tile: makeNebulaTile(1024), p: 0.06 },
    { tile: makeStarTile(512, 160, 0.9, 0.55, '#9fb6ff'), p: 0.15 },
    { tile: makeStarTile(640, 70, 1.4, 0.8, '#ffd9a0'), p: 0.35 },
    { tile: makeStarTile(900, 22, 2.2, 0.9, '#b9a0ff'), p: 0.65 },
  ];

  // ---------------------------------------------------------------- input
  const keys = {};
  const mouse = { down: false, x: 0, y: 0 };
  const joy = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  let lastInputTouch = false;
  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys[e.code] = true; lastInputTouch = false;
    onKey(e);
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; joy.active = false; if (G.state === 'play') pause(); });
  window.addEventListener('wheel', e => {
    const sc = e.target.closest && e.target.closest('.scroll');
    if (sc) sc.scrollTop += e.deltaY;
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') { mouse.down = e.button === 0 || mouse.down; mouse.x = e.clientX; mouse.y = e.clientY; lastInputTouch = false; }
    else if (!joy.active) { joy.active = true; joy.id = e.pointerId; joy.ox = joy.x = e.clientX; joy.oy = joy.y = e.clientY; lastInputTouch = true; }
    try { cv.setPointerCapture(e.pointerId); } catch (_) { }
  });
  cv.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; }
    else if (joy.active && e.pointerId === joy.id) {
      joy.x = e.clientX; joy.y = e.clientY;
      const max = 55 * UI, dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy);
      if (d > max) { joy.ox = joy.x - dx / d * max; joy.oy = joy.y - dy / d * max; }
    }
  });
  const endPtr = e => {
    if (e.pointerType === 'mouse') mouse.down = false;
    else if (e.pointerId === joy.id) joy.active = false;
  };
  cv.addEventListener('pointerup', endPtr);
  cv.addEventListener('pointercancel', endPtr);
  function moveInput() {
    let x = 0, y = 0;
    if (keys.KeyW || keys.ArrowUp || keys.KeyZ) y -= 1;
    if (keys.KeyS || keys.ArrowDown) y += 1;
    if (keys.KeyA || keys.ArrowLeft || keys.KeyQ) x -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    if (x || y) { const d = Math.hypot(x, y); return [x / d, y / d]; }
    if (joy.active) {
      const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy), max = 55 * UI;
      if (d < max * 0.12) return [0, 0];
      const m = Math.min(1, d / max); return [dx / d * m, dy / d * m];
    }
    if (mouse.down && run) {
      const sx = (run.p.x - cam.x) * SCALE + W / 2, sy = (run.p.y - cam.y) * SCALE + H / 2;
      const dx = mouse.x - sx, dy = mouse.y - sy, d = Math.hypot(dx, dy);
      if (d < 6) return [0, 0];
      const m = Math.min(1, d / (70 * UI)); return [dx / d * m, dy / d * m];
    }
    return [0, 0];
  }

  // ---------------------------------------------------------------- state
  const G = { state: 'loading', real: 0, shake: 0, slow: 0, banner: null, runsThisSession: 0, mobile: false, hint: '' };
  const cam = { x: 0, y: 0 };
  let run = null;
  let eid = 0;
  const grid = new Map(), CELL = 80;

  function needFor(l) { return Math.floor(5 + l * 3.4 + Math.pow(l, 1.5)); }

  function newRun() {
    run = {
      t: 0, p: { x: 0, y: 0, vx: 0, vy: 0, r: 13, inv: 1.2 },
      moons: 3 + metaLv('moons'), ang: 0, ang2: 0, up: {}, st: null, mpos: [],
      enemies: [], bullets: [], gems: [], loose: [], parts: [], rings: [], texts: [], booms: [],
      xp: 0, lvl: 1, need: needFor(1), pending: 0, kills: 0, bossKills: 0, bossTier: 0,
      spawnAcc: 0, nextElite: 60, nextBoss: 180, nextSwarm: 45, boss: null,
      rerolls: metaLv('reroll'), flareT: 2.5, shield: 0, shieldT: 0, dawnUsed: false,
      combo: 0, comboT: 0, dead: false, deathT: 0, lostOnce: false, cards: [], doubled: false, earned: 0,
    };
    recompute();
    cam.x = 0; cam.y = 0;
  }
  function recompute() {
    const u = run.up;
    run.st = {
      dmg: 10 * (1 + 0.25 * (u.mass | 0)) * (1 + 0.1 * metaLv('power')),
      moonR: 10.5 * (1 + 0.08 * (u.mass | 0)),
      spin: 3.4 * (1 + 0.16 * (u.spin | 0)),
      orbit: 60 * (1 + 0.15 * (u.reach | 0)),
      speed: 215 * (1 + 0.1 * (u.swift | 0)) * (1 + 0.05 * metaLv('swift')),
      magnet: 70 * (1 + 0.45 * (u.magnet | 0)) * (1 + 0.15 * metaLv('grav')),
      outer: u.outer | 0, flare: u.flare | 0, shatter: u.shatter | 0, tidal: u.tidal | 0,
      aegis: u.aegis | 0, chill: u.chill | 0, xpMul: 1 + 0.08 * metaLv('wisdom'),
    };
    if (run.st.aegis && run.shield === 0 && run.shieldT <= 0) run.shieldT = 1;
  }
  function viewR() { return 0.5 * Math.hypot(W, H) / SCALE; }

  // ---------------------------------------------------------------- spawning
  function spawnEnemy(type, x, y, o = {}) {
    const d = ENEMY[type], t = run.t;
    const hpMul = 1 + t / 60 * 0.45 + Math.pow(t / 200, 2.4);
    const elite = !!o.elite;
    const e = {
      type, x, y, vx: 0, vy: 0, kx: 0, ky: 0,
      r: d.r * (elite ? 1.6 : 1) * (o.scale || 1),
      hp: d.hp * hpMul * (elite ? 9 : 1) * (o.hpMul || 1),
      spd: d.spd * (o.spdMul || 1) * (1 + Math.min(t / 600, 0.35) + Math.max(0, t - 360) / 500) * (elite ? 0.85 : 1),
      xp: d.xp * (elite ? 12 : 1) * (o.xpMul || 1), color: d.color, shape: d.shape, mass: d.mass * (elite ? 4 : 1) * (o.scale || 1),
      elite, flash: 0, slowT: 0, rot: rand(0, TAU), st: 0, stT: rand(0.5, 1.5), dx: 0, dy: 0,
      fire: rand(1.2, 2.6), summon: 6, mh: {}, id: ++eid, tier: 0, age: 0,
    };
    e.maxHp = e.hp;
    run.enemies.push(e);
    return e;
  }
  function edgePos(extra = 40) {
    const p = run.p, sp = Math.hypot(p.vx, p.vy);
    let a = rand(0, TAU);
    if (sp > 40 && Math.random() < 0.55) a = Math.atan2(p.vy, p.vx) + rand(-1, 1);
    const R = viewR() + extra;
    return [p.x + Math.cos(a) * R, p.y + Math.sin(a) * R];
  }
  function pickType(t) {
    const w = [['mote', 10]];
    if (t > 45) w.push(['dart', 2 + t / 60]);
    if (t > 70) w.push(['splitter', 2 + t / 100]);
    if (t > 105) w.push(['brute', 1.2 + t / 140]);
    if (t > 140 && run.enemies.filter(x => x.type === 'spitter').length < 18) w.push(['spitter', Math.min(2.6, 1.4 + t / 300)]);
    let s = 0; for (const x of w) s += x[1];
    let r = Math.random() * s;
    for (const x of w) { r -= x[1]; if (r <= 0) return x[0]; }
    return 'mote';
  }
  function director(dt) {
    const t = run.t;
    const cap0 = G.mobile ? 170 : 240;
    let rate = 0.75 + t * 0.028 + Math.pow(t / 120, 1.6) * 0.9;
    const capBoost = Math.min(80, Math.max(0, t - 300) / 6);
    if (run.boss) rate *= 0.45;
    run.spawnAcc += rate * dt;
    while (run.spawnAcc >= 1) {
      run.spawnAcc -= 1;
      if (run.enemies.length >= cap0 + capBoost) continue;
      const [x, y] = edgePos(); spawnEnemy(pickType(t), x, y);
    }
    if (!run.introWave && t >= 2.5) {
      run.introWave = true;
      const off = rand(0, TAU);
      for (let i = 0; i < 7; i++) { const a = off + i * TAU / 7, R = viewR() * 0.75; spawnEnemy('mote', run.p.x + Math.cos(a) * R, run.p.y + Math.sin(a) * R, { spdMul: 0.8 }); }
    }
    if (!run.darkWarned && t >= 300) { run.darkWarned = true; banner('THE DARK DEEPENS', '#ff9ab0', 2.6, 'From now on, hits may shatter moons'); }
    if (t >= run.nextSwarm) {
      run.nextSwarm = t + rand(48, 62);
      const n = Math.min(44, 10 + Math.floor(t / 10)), R = viewR() + 30, off = rand(0, TAU);
      for (let i = 0; i < n; i++) {
        const a = off + i * TAU / n;
        spawnEnemy(t > 150 && i % 4 === 0 ? 'dart' : 'mote', run.p.x + Math.cos(a) * R, run.p.y + Math.sin(a) * R, { spdMul: 1.1 });
      }
      banner('SWARM INCOMING', '#b06cff', 1.6);
    }
    if (t >= run.nextElite) {
      run.nextElite = t + Math.max(18, rand(40, 52) - t / 30);
      const types = ['mote', 'dart', 'splitter', 'brute'].filter(k => k === 'mote' || pickTypeUnlocked(k, t));
      const [x, y] = edgePos(); spawnEnemy(pick(types), x, y, { elite: true });
    }
    if (t >= run.nextBoss && !run.boss) {
      run.bossTier++;
      const [x, y] = edgePos(80);
      const b = spawnEnemy('boss', x, y);
      b.hp = b.maxHp = 2600 * (1 + (run.bossTier - 1) * 1.6) * (1 + run.t / 600);
      b.tier = run.bossTier; b.fire = 3; b.summon = 6; b.xp = 60 * run.bossTier;
      run.boss = b;
      banner('AN ECLIPSE APPROACHES', '#ff4060', 2.6);
      SFX.S.warn(); G.shake = Math.max(G.shake, 6);
    }
  }
  function pickTypeUnlocked(k, t) { return { dart: 45, splitter: 70, brute: 105, spitter: 140 }[k] < t; }

  // ---------------------------------------------------------------- fx
  const PMAX = () => G.mobile ? 500 : 900;
  function part(x, y, vx, vy, life, size, color, drag = 3, kind = 0) {
    if (run.parts.length >= PMAX()) run.parts.shift();
    run.parts.push({ x, y, vx, vy, life, max: life, size, color, drag, kind });
  }
  function burst(x, y, color, n, spd = 220, size = 3, life = 0.5) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(0.3, 1) * spd;
      part(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.6, 1) * life, rand(0.6, 1.3) * size, color, 3.5, Math.random() < 0.6 ? 0 : 1);
    }
  }
  function ring(x, y, max, color, life = 0.45, width = 4) { run.rings.push({ x, y, r: 4, max, color, life, maxLife: life, width }); }
  function ftext(x, y, txt, color = '#fff', size = 14, life = 0.7) {
    if (run.texts.length > 60) run.texts.shift();
    run.texts.push({ x, y, txt, color, size, life, max: life, vy: -50 });
  }
  function banner(txt, color, dur = 1.8, sub = '') { G.banner = { txt, color, t: dur, max: dur, sub }; }
  function shake(v) { if (save.settings.shake) G.shake = Math.max(G.shake, v); }

  // ---------------------------------------------------------------- combat
  function damage(e, dmg, fromX, fromY, kb = 1) {
    if (e.hp <= 0) return;
    e.hp -= dmg; e.flash = 0.08;
    if (kb > 0 && e.type !== 'boss') {
      let dx = e.x - fromX, dy = e.y - fromY; const d = Math.hypot(dx, dy) || 1;
      const k = 190 * kb / e.mass / (1 + run.t / 240); e.kx += dx / d * k; e.ky += dy / d * k;
    }
    if (e.elite || e.type === 'boss' || e.type === 'brute') ftext(e.x + rand(-6, 6), e.y - e.r, Math.round(dmg).toString(), e.elite || e.type === 'boss' ? '#ffd35c' : '#ffffff', 12 + Math.min(10, dmg / 6));
    if (e.hp <= 0) kill(e);
  }
  function kill(e, depth = 0) {
    e.dead = true;
    run.kills++;
    const big = e.elite || e.type === 'boss' || e.type === 'brute';
    burst(e.x, e.y, e.color, big ? 34 : 12, big ? 320 : 200, big ? 4 : 3, big ? 0.8 : 0.45);
    ring(e.x, e.y, e.r * 2.2, e.color, 0.3, 3);
    SFX.S.kill(rand(0.85, 1.25));
    if (e.type === 'boss') return bossDown(e);
    // drops
    dropGem(e.x, e.y, e.xp);
    if (e.elite) {
      if (run.moons < 8 || Math.random() < 0.35) dropPick(e.x + 14, e.y, 'moon');
      if (Math.random() < 0.5) dropPick(e.x - 14, e.y, 'vac');
      shake(6); ring(e.x, e.y, 90, '#ffd35c', 0.5, 5);
    } else if (Math.random() < 0.0035) dropPick(e.x, e.y, 'vac');
    if (e.type === 'splitter') {
      for (let i = 0; i < 3; i++) {
        const a = i * TAU / 3 + rand(-0.3, 0.3);
        const c = spawnEnemy('mote', e.x + Math.cos(a) * 10, e.y + Math.sin(a) * 10, { scale: 0.8, hpMul: 0.6, xpMul: 0.5 });
        c.kx = Math.cos(a) * 200; c.ky = Math.sin(a) * 200;
      }
    }
    if (run.st.shatter && depth === 0) run.booms.push({ x: e.x, y: e.y, r: 42 + 14 * run.st.shatter, dmg: 7 * run.st.shatter * (1 + 0.1 * metaLv('power')) });
  }
  function bossDown(e) {
    run.boss = null; run.bossKills++;
    run.nextBoss = run.t + 170;
    shake(18); G.slow = 0.5;
    SFX.S.bossDie(); CG.happytime();
    for (let i = 0; i < 4; i++) ring(e.x, e.y, 120 + i * 70, i % 2 ? '#ffd35c' : '#ff4060', 0.6 + i * 0.15, 6);
    burst(e.x, e.y, '#ffd35c', 60, 420, 5, 1.1);
    burst(e.x, e.y, '#ff4060', 40, 300, 4, 0.9);
    for (let i = 0; i < 24; i++) dropGem(e.x + rand(-60, 60), e.y + rand(-60, 60), Math.ceil(e.xp / 24) + 2);
    dropPick(e.x, e.y - 20, 'moon'); dropPick(e.x - 20, e.y + 10, 'vac');
    banner('ECLIPSE BROKEN', '#ffd35c', 2.2, '+' + (60 * e.tier) + ' bonus stardust');
  }
  function dropGem(x, y, v) {
    const gs = run.gems;
    if (gs.length > 380) { const g = gs[(Math.random() * gs.length) | 0]; if (!g.kind) { g.v += v; return; } }
    gs.push({ x, y, vx: rand(-40, 40), vy: rand(-40, 40), v, kind: '', mag: false, sp: 0, age: 0 });
  }
  function dropPick(x, y, kind) { run.gems.push({ x, y, vx: rand(-60, 60), vy: rand(-60, 60), v: 0, kind, mag: false, sp: 0, age: 0 }); }

  function pushBack(radius, force) {
    const p = run.p;
    for (const e of run.enemies) {
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < radius && e.type !== 'boss') { const k = force * (1 - d / radius) / Math.sqrt(e.mass); e.kx += dx / d * k; e.ky += dy / d * k; }
    }
  }
  function hurt(src) {
    const p = run.p;
    if (p.inv > 0 || run.dead) return;
    if (run.shield > 0) {
      run.shield = 0; run.shieldT = 16 - 3 * run.st.aegis; p.inv = 0.8;
      SFX.S.shield(); ring(p.x, p.y, 110, '#6cf0ff', 0.4, 5); pushBack(150, 520); shake(5);
      ftext(p.x, p.y - 30, 'BLOCKED', '#6cf0ff', 16);
      return;
    }
    run.hurts = (run.hurts | 0) + 1;
    if (run.moons > 0) {
      run.moons--;
      const a = Math.atan2(p.y - src.y, p.x - src.x) + rand(-0.8, 0.8);
      // Late in a run, the dark grows: hits can shatter a moon outright.
      const shatterChance = clamp((run.t - 300) / 700, 0, 0.75);
      if (Math.random() < shatterChance) {
        burst(p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, '#dfe7ff', 26, 300, 3, 0.7);
        ftext(p.x, p.y - 34, 'MOON SHATTERED', '#ff9ab0', 16, 1);
      } else {
        run.loose.push({ x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, t: 0, life: 4 + run.st.tidal * 1.5 });
      }
      p.inv = 1.3; G.slow = 0.12; shake(11);
      SFX.S.hurt(); burst(p.x, p.y, '#ff6080', 22, 260, 3, 0.5); ring(p.x, p.y, 90, '#ff6080', 0.35, 4);
      pushBack(150, 560);
      if (!run.lostOnce) { run.lostOnce = true; banner('A MOON BROKE LOOSE!', '#ffffff', 2.2, 'Grab it before it fades'); }
      return;
    }
    if (metaLv('dawn') && !run.dawnUsed) {
      run.dawnUsed = true; run.moons = 2; p.inv = 2.5;
      SFX.S.revive(); shake(14); G.slow = 0.4;
      for (let i = 0; i < 3; i++) ring(p.x, p.y, 200 + i * 80, '#ff9a3c', 0.6 + i * 0.1, 6);
      for (const e of run.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 300) damage(e, e.type === 'boss' ? 200 : 9999, p.x, p.y, 2); }
      banner('SECOND DAWN', '#ff9a3c', 2.2, 'Your light returns');
      return;
    }
    die();
  }
  function die() {
    const p = run.p;
    run.dead = true; run.deathT = 1.7;
    SFX.S.die(); shake(20); G.slow = 0.6;
    burst(p.x, p.y, skin().color, 70, 420, 5, 1.2);
    burst(p.x, p.y, '#ffffff', 30, 250, 3, 0.8);
    for (let i = 0; i < 3; i++) ring(p.x, p.y, 120 + i * 90, skin().color, 0.7 + i * 0.2, 6);
    run.loose.length = 0;
    joy.active = false;
  }
  function flare() {
    const p = run.p, l = run.st.flare, R = 105 + l * 32, dmg = (12 + l * 9) * (1 + 0.1 * metaLv('power'));
    ring(p.x, p.y, R, skin().color, 0.45, 7); ring(p.x, p.y, R * 0.7, '#ffffff', 0.3, 3);
    SFX.S.flare();
    for (const e of run.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < R + e.r) damage(e, dmg, p.x, p.y, 1.5);
    }
  }

  // ---------------------------------------------------------------- update
  function buildGrid() {
    grid.clear();
    for (const e of run.enemies) {
      const k = (Math.floor(e.x / CELL) + 32768) * 65536 + (Math.floor(e.y / CELL) + 32768);
      let c = grid.get(k); if (!c) { c = []; grid.set(k, c); } c.push(e);
    }
  }
  function query(x, y, r, fn) {
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const c = grid.get((cx + 32768) * 65536 + (cy + 32768));
      if (c) for (let i = 0; i < c.length; i++) fn(c[i]);
    }
  }
  function computeMoons() {
    const st = run.st, p = run.p, out = run.mpos; out.length = 0;
    if (run.dead) return out;
    const n = run.moons, R = st.orbit + Math.max(0, n - 5) * 5;
    for (let i = 0; i < n; i++) { const a = run.ang + i * TAU / n; out.push({ x: p.x + Math.cos(a) * R, y: p.y + Math.sin(a) * R, r: st.moonR, a, R, id: i, outer: false }); }
    const R2 = R * 1.7 + 24;
    for (let j = 0; j < st.outer; j++) { const a = run.ang2 + j * TAU / st.outer; out.push({ x: p.x + Math.cos(a) * R2, y: p.y + Math.sin(a) * R2, r: st.moonR * 1.25, a, R: R2, id: 100 + j, outer: true }); }
    return out;
  }

  function update(dt) {
    const p = run.p, st = run.st;
    run.t += run.dead ? 0 : dt;
    // player movement
    if (!run.dead) {
      const [ix, iy] = moveInput();
      const tx = ix * st.speed, ty = iy * st.speed, k = 1 - Math.exp(-dt * 12);
      p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.inv = Math.max(0, p.inv - dt);
      run.ang += st.spin * dt; run.ang2 -= st.spin * 0.62 * dt;
      // trail sparkle
      if (Math.random() < 0.5) part(p.x + rand(-5, 5), p.y + rand(-5, 5), -p.vx * 0.2 + rand(-20, 20), -p.vy * 0.2 + rand(-20, 20), 0.5, 2.2, skin().color, 2, 1);
      director(dt);
      // timers
      if (st.flare) { run.flareT -= dt; if (run.flareT <= 0) { run.flareT = 5.4 - st.flare * 0.75; flare(); } }
      if (st.aegis && run.shield === 0) { run.shieldT -= dt; if (run.shieldT <= 0) { run.shield = 1; ring(p.x, p.y, 40, '#6cf0ff', 0.3, 3); } }
      if (run.comboT > 0) { run.comboT -= dt; if (run.comboT <= 0) run.combo = 0; }
    }
    const moons = computeMoons();

    // enemies
    const vr = viewR(), despawn = vr * 1.9;
    for (const e of run.enemies) {
      e.age += dt;
      if (e.flash > 0) e.flash -= dt;
      let slow = 1; if (e.slowT > 0) { e.slowT -= dt; slow = 1 - 0.18 * st.chill; }
      let dx = p.x - e.x, dy = p.y - e.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      let tvx = dx * e.spd * slow, tvy = dy * e.spd * slow, acc = 3;
      if (run.dead) { tvx = -dx * 40; tvy = -dy * 40; }
      else if (e.type === 'dart') {
        e.stT -= dt;
        if (e.st === 0) { if (d < 300 && e.stT <= 0) { e.st = 1; e.stT = 0.6; } }
        else if (e.st === 1) { tvx = tvy = 0; acc = 8; e.dx = dx; e.dy = dy; if (e.stT <= 0) { e.st = 2; e.stT = 0.5; } }
        else if (e.st === 2) { tvx = e.dx * 440 * slow; tvy = e.dy * 440 * slow; acc = 14; if (e.stT <= 0) { e.st = 3; e.stT = 0.8; } }
        else { tvx *= 0.3; tvy *= 0.3; if (e.stT <= 0) { e.st = 0; e.stT = rand(0.6, 1.4); } }
      } else if (e.type === 'spitter') {
        if (d < 230) { tvx = -dx * e.spd; tvy = -dy * e.spd; }
        else if (d < 330) { tvx = -dy * e.spd * 0.7; tvy = dx * e.spd * 0.7; }
        e.fire -= dt;
        if (e.fire <= 0 && d < 520) {
          e.fire = rand(2.4, 3.2) / (1 + run.t / 600);
          run.bullets.push({ x: e.x, y: e.y, vx: dx * 170, vy: dy * 170, r: 6, life: 5 });
          e.flash = 0.12; SFX.S.shoot();
        }
      } else if (e.type === 'boss') {
        e.rot += dt * 0.4;
        e.fire -= dt;
        if (e.fire <= 0) {
          e.fire = Math.max(2.4, 4.2 - e.tier * 0.4);
          const n = 14 + e.tier * 4, off = rand(0, TAU), sp = 130 + e.tier * 15;
          for (let i = 0; i < n; i++) { const a = off + i * TAU / n; run.bullets.push({ x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 7, life: 6 }); }
          SFX.S.shoot(); ring(e.x, e.y, e.r * 1.6, '#ff4060', 0.35, 4);
        }
        e.summon -= dt;
        if (e.summon <= 0 && run.enemies.length < 260) {
          e.summon = 7.5; const n = 4 + e.tier * 2;
          for (let i = 0; i < n; i++) { const a = rand(0, TAU); spawnEnemy(e.tier > 1 && i % 2 ? 'dart' : 'mote', e.x + Math.cos(a) * e.r * 1.4, e.y + Math.sin(a) * e.r * 1.4); }
        }
      }
      const k = 1 - Math.exp(-dt * acc);
      e.vx += (tvx - e.vx) * k; e.vy += (tvy - e.vy) * k;
      e.x += (e.vx + e.kx) * dt; e.y += (e.vy + e.ky) * dt;
      const kd = Math.exp(-dt * 7); e.kx *= kd; e.ky *= kd;
      if (e.type !== 'boss') e.rot += dt * (e.type === 'mote' ? 2 : 0.8);
      if (d > despawn && e.type !== 'boss' && !run.dead) {
        if (e.elite) { const a = rand(0, TAU); e.x = p.x + Math.cos(a) * (vr + 30); e.y = p.y + Math.sin(a) * (vr + 30); }
        else { const [x, y] = edgePos(); e.x = x; e.y = y; }
      }
      // contact with player
      if (!run.dead && d < e.r + p.r * 0.75) hurt(e);
    }

    buildGrid();
    // separation (cheap, same cell)
    for (const c of grid.values()) {
      if (c.length < 2) continue;
      for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
        const a = c[i], b = c[j], dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 0.01) {
          const d = Math.sqrt(d2), o = (rr - d) * 0.5, nx = dx / d, ny = dy / d, ma = a.mass / (a.mass + b.mass);
          a.x -= nx * o * (1 - ma); a.y -= ny * o * (1 - ma); b.x += nx * o * ma; b.y += ny * o * ma;
        }
      }
    }

    // moons vs enemies
    for (const m of moons) {
      query(m.x, m.y, m.r + 60, e => {
        if (e.dead) return;
        const rr = m.r + e.r, dx = e.x - m.x, dy = e.y - m.y;
        if (dx * dx + dy * dy > rr * rr) return;
        const last = e.mh[m.id] || -9;
        if (run.t - last < 0.22) return;
        e.mh[m.id] = run.t;
        const dmg = st.dmg * (m.outer ? 1.2 : 1) * rand(0.9, 1.1);
        if (st.chill) e.slowT = 1.4;
        SFX.S.hit(rand(0.9, 1.2));
        for (let i = 0; i < 4; i++) part(m.x + dx * 0.5, m.y + dy * 0.5, rand(-160, 160), rand(-160, 160), 0.25, 2.5, '#ffffff', 5, 0);
        damage(e, dmg, p.x, p.y, 1);
      });
    }
    // remnant explosions
    if (run.booms.length) {
      const bs = run.booms; run.booms = [];
      for (const b of bs) {
        ring(b.x, b.y, b.r, '#ff7a9c', 0.3, 4); burst(b.x, b.y, '#ff7a9c', 8, 160, 3, 0.35); SFX.S.boom();
        query(b.x, b.y, b.r + 30, e => { if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < b.r + e.r) { e.hp -= b.dmg; e.flash = 0.08; if (e.hp <= 0) kill(e, 1); } });
      }
    }
    if (run.enemies.some(e => e.dead)) run.enemies = run.enemies.filter(e => !e.dead);

    // bullets
    for (const b of run.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) continue;
      for (const m of moons) {
        const dx = b.x - m.x, dy = b.y - m.y, rr = b.r + m.r + 2;
        if (dx * dx + dy * dy < rr * rr) { b.life = 0; burst(b.x, b.y, '#ff7ad9', 6, 140, 2.5, 0.25); SFX.S.block(); break; }
      }
      if (b.life > 0 && !run.dead) {
        const dx = b.x - p.x, dy = b.y - p.y, rr = b.r + p.r * 0.7;
        if (dx * dx + dy * dy < rr * rr) { b.life = 0; hurt(b); }
      }
    }
    run.bullets = run.bullets.filter(b => b.life > 0);

    // gems & pickups
    const mag = st.magnet;
    for (const g of run.gems) {
      g.age += dt;
      const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
      if (!run.dead && (g.mag || d < mag || (g.kind && d < mag * 1.3))) g.mag = true;
      if (g.mag && !run.dead) {
        g.sp = Math.min(900, g.sp + 1400 * dt);
        g.vx = dx / d * g.sp; g.vy = dy / d * g.sp;
        if (d < p.r + 10) { collect(g); g.dead = true; }
      } else { const k = Math.exp(-dt * 3); g.vx *= k; g.vy *= k; }
      g.x += g.vx * dt; g.y += g.vy * dt;
      if (!g.mag && d > vr * 3) g.dead = true;
    }
    if (run.gems.some(g => g.dead)) run.gems = run.gems.filter(g => !g.dead);

    // loose moons
    for (const l of run.loose) {
      l.t += dt;
      const dx = p.x - l.x, dy = p.y - l.y, d = Math.hypot(dx, dy) || 1;
      if (st.tidal && l.t > 0.7 && d < 140 + st.tidal * 60) { const s = 80 + st.tidal * 70; l.vx = lerp(l.vx, dx / d * s, 1 - Math.exp(-dt * 3)); l.vy = lerp(l.vy, dy / d * s, 1 - Math.exp(-dt * 3)); }
      else { const k = Math.exp(-dt * 2.2); l.vx *= k; l.vy *= k; }
      l.x += l.vx * dt; l.y += l.vy * dt;
      if (l.t > 0.35 && d < p.r + 22 + st.tidal * 10) {
        l.dead = true; run.moons = Math.min(MOON_CAP, run.moons + 1);
        SFX.S.moonBack(); ring(p.x, p.y, 60, '#dfe7ff', 0.3, 3); ftext(p.x, p.y - 30, 'MOON RECOVERED', '#dfe7ff', 15, 0.9);
      } else if (l.t > l.life) { l.dead = true; burst(l.x, l.y, '#8a93b8', 14, 120, 2.5, 0.6); }
    }
    if (run.loose.some(l => l.dead)) run.loose = run.loose.filter(l => !l.dead);

    // particles / rings / texts
    for (const q of run.parts) { q.life -= dt; const k = Math.exp(-dt * q.drag); q.vx *= k; q.vy *= k; q.x += q.vx * dt; q.y += q.vy * dt; }
    run.parts = run.parts.filter(q => q.life > 0);
    for (const r of run.rings) { r.life -= dt; r.r = lerp(r.r, r.max, 1 - Math.exp(-dt * 10)); }
    run.rings = run.rings.filter(r => r.life > 0);
    for (const t of run.texts) { t.life -= dt; t.y += t.vy * dt; t.vy *= Math.exp(-dt * 3); }
    run.texts = run.texts.filter(t => t.life > 0);

    // level ups
    while (run.xp >= run.need) { run.xp -= run.need; run.lvl++; run.need = needFor(run.lvl); run.pending++; }
    if (run.pending > 0 && !run.dead && G.state === 'play') {
      SFX.S.levelup(); ring(p.x, p.y, 140, '#ffd35c', 0.5, 5); burst(p.x, p.y, '#ffd35c', 24, 260, 3, 0.6);
      openLevelUp();
    }
  }
  function collect(g) {
    const p = run.p;
    if (g.kind === 'moon') {
      run.moons = Math.min(MOON_CAP, run.moons + 1);
      SFX.S.moonBack(); ring(p.x, p.y, 70, '#dfe7ff', 0.35, 4); ftext(p.x, p.y - 30, '+1 MOON', '#dfe7ff', 17, 1);
    } else if (g.kind === 'vac') {
      for (const o of run.gems) o.mag = true;
      SFX.S.pick(); ring(p.x, p.y, viewR(), '#7fe3ff', 0.6, 6); ftext(p.x, p.y - 30, 'STAR MAGNET', '#7fe3ff', 17, 1);
    } else {
      run.xp += g.v * run.st.xpMul;
      run.combo++; run.comboT = 0.5;
      SFX.S.gem(run.combo);
    }
  }

  // ---------------------------------------------------------------- render
  function drawTiles(tile, p) {
    const s = tile.width, ox = cam.x * SCALE * DPR * p, oy = cam.y * SCALE * DPR * p;
    const x0 = -(((ox % s) + s) % s), y0 = -(((oy % s) + s) % s);
    for (let x = x0; x < cv.width; x += s) for (let y = y0; y < cv.height; y += s) ctx.drawImage(tile, x, y);
  }
  function drawShape(e) {
    const r = e.r;
    ctx.beginPath();
    switch (e.shape) {
      case 'spike': for (let i = 0; i < 14; i++) { const a = e.rot + i * TAU / 14, rr = i % 2 ? r * 0.6 : r * 1.1; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } break;
      case 'tri': { const a = Math.atan2(e.vy, e.vx); for (let i = 0; i < 3; i++) { const b = a + i * TAU / 3; const rr = i === 0 ? r * 1.35 : r; ctx.lineTo(Math.cos(b) * rr, Math.sin(b) * rr); } break; }
      case 'diamond': for (let i = 0; i < 4; i++) { const a = e.rot + i * TAU / 4; ctx.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2); } break;
      case 'hex': for (let i = 0; i < 6; i++) { const a = e.rot + i * TAU / 6; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } break;
      default: ctx.arc(0, 0, r, 0, TAU);
    }
    ctx.closePath();
  }
  function drawEnemy(e) {
    ctx.save(); ctx.translate(e.x, e.y);
    if (e.type === 'boss') { drawBoss(e); ctx.restore(); return; }
    const warn = e.type === 'dart' && e.st === 1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.45; const gr = e.r * 2.6; ctx.drawImage(glow(e.color), -gr, -gr, gr * 2, gr * 2);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    drawShape(e);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : warn ? rgba('#ffffff', 0.5 + 0.5 * Math.sin(e.stT * 40)) : rgba(e.color, 0.28);
    ctx.fill();
    ctx.lineWidth = e.elite ? 3.5 : 2.4; ctx.strokeStyle = e.color; ctx.stroke();
    if (e.shape === 'eye') { const a = Math.atan2(run.p.y - e.y, run.p.x - e.x); ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(Math.cos(a) * e.r * 0.4, Math.sin(a) * e.r * 0.4, e.r * 0.38, 0, TAU); ctx.fill(); }
    if (e.shape === 'diamond') { ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = -e.rot * 2 + i * TAU / 4; ctx.lineTo(Math.cos(a) * e.r * 0.5, Math.sin(a) * e.r * 0.5); } ctx.closePath(); ctx.fillStyle = e.color; ctx.fill(); }
    if (e.shape === 'hex' || e.shape === 'spike') { ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(0, 0, e.r * 0.25, 0, TAU); ctx.fill(); }
    if (e.elite) {
      ctx.rotate(run.t * 1.5); ctx.setLineDash([6, 6]); ctx.strokeStyle = '#ffd35c'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, e.r * 1.45, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    if ((e.elite || e.type === 'brute') && e.hp < e.maxHp) {
      const w = e.r * 2; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - w / 2, e.y + e.r * 1.5, w, 4);
      ctx.fillStyle = e.elite ? '#ffd35c' : e.color; ctx.fillRect(e.x - w / 2, e.y + e.r * 1.5, w * Math.max(0, e.hp / e.maxHp), 4);
    }
  }
  function drawBoss(e) {
    const r = e.r, pulse = 1 + Math.sin(run.t * 4) * 0.05;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.8; const gr = r * 3.2 * pulse; ctx.drawImage(glow('#ff4060'), -gr, -gr, gr * 2, gr * 2);
    ctx.globalAlpha = 0.5; ctx.drawImage(glow('#ff9a3c'), -r * 1.8, -r * 1.8, r * 3.6, r * 3.6);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // corona spikes
    ctx.save(); ctx.rotate(e.rot);
    ctx.fillStyle = '#ff4060';
    ctx.beginPath();
    for (let i = 0; i < 24; i++) { const a = i * TAU / 24, rr = i % 2 ? r * 1.05 : r * 1.32 * pulse; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = e.flash > 0 ? '#ffe0e6' : '#07020c';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffb0c0'; ctx.lineWidth = 3; ctx.stroke();
    // eye
    const a = Math.atan2(run.p.y - e.y, run.p.x - e.x);
    ctx.fillStyle = '#ff4060'; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35, r * 0.22, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.07, 0, TAU); ctx.fill();
  }
  function drawMoon(x, y, r, a, tint, faded) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = faded ? 0.25 : 0.5;
    ctx.drawImage(glow(tint), x - r * 3, y - r * 3, r * 6, r * 6);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = faded ? 0.6 : 1;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#d8def5'); g.addColorStop(1, '#8a93b8');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(90,100,140,.45)';
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, r * 0.25, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + Math.cos(a + 2) * r * 0.45, y + Math.sin(a + 2) * r * 0.45, r * 0.15, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function drawStar(x, y, r, t, sk, alpha = 1) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.85 * alpha; const gr = r * 6 * (1 + Math.sin(t * 3) * 0.06); ctx.drawImage(glow(sk.color), x - gr, y - gr, gr * 2, gr * 2);
    ctx.fillStyle = rgba(sk.color, 0.5 * alpha);
    for (let i = 0; i < 4; i++) {
      const a = t * 0.8 + i * TAU / 4, L = r * (2.6 + Math.sin(t * 5 + i) * 0.4);
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
      ctx.lineTo(x + Math.cos(a + 0.18) * r, y + Math.sin(a + 0.18) * r); ctx.lineTo(x + Math.cos(a - 0.18) * r, y + Math.sin(a - 0.18) * r); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, sk.core); g.addColorStop(1, sk.color);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05061a'; ctx.fillRect(0, 0, cv.width, cv.height);
    let sx = 0, sy = 0;
    if (G.shake > 0.1) { sx = rand(-1, 1) * G.shake; sy = rand(-1, 1) * G.shake; }
    const cx = cam.x + sx / SCALE, cy = cam.y + sy / SCALE;
    for (const l of BG) drawTiles(l.tile, l.p);
    const k = DPR * SCALE;
    ctx.setTransform(k, 0, 0, k, cv.width / 2 - cx * k, cv.height / 2 - cy * k);
    if (run && ['play', 'levelup', 'paused', 'over', 'ad'].includes(G.state)) drawWorld(cx, cy);
    else drawMenuScene();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (run && ['play', 'levelup', 'paused'].includes(G.state)) drawHUD();
  }
  function drawWorld(cx, cy) {
    const hw = W / 2 / SCALE + 80, hh = H / 2 / SCALE + 80;
    const vis = (x, y) => x > cx - hw && x < cx + hw && y > cy - hh && y < cy + hh;
    const p = run.p, sk = skin();
    // gems
    for (const g of run.gems) {
      if (!vis(g.x, g.y)) continue;
      if (g.kind) {
        const pulse = 1 + Math.sin(G.real * 6) * 0.15;
        if (g.kind === 'moon') drawMoon(g.x, g.y, 10 * pulse, G.real, '#ffffff');
        else { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow('#7fe3ff'), g.x - 24 * pulse, g.y - 24 * pulse, 48 * pulse, 48 * pulse); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, g.y, 9, 0.4, TAU - 0.4); ctx.stroke(); }
        continue;
      }
      const col = g.v >= 10 ? '#ffd35c' : g.v >= 3 ? '#6dff9e' : '#6cc8ff', s = g.v >= 10 ? 7 : g.v >= 3 ? 5.5 : 4.2;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.drawImage(glow(col), g.x - s * 3, g.y - s * 3, s * 6, s * 6);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(g.x, g.y - s); ctx.lineTo(g.x + s * 0.7, g.y); ctx.lineTo(g.x, g.y + s); ctx.lineTo(g.x - s * 0.7, g.y); ctx.closePath(); ctx.fill();
    }
    // loose moons
    for (const l of run.loose) {
      const left = l.life - l.t, blink = left < 1.6 ? (Math.sin(G.real * 25) > 0) : true;
      ctx.strokeStyle = rgba('#dfe7ff', 0.35); ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(l.x, l.y, 16 + Math.sin(G.real * 8) * 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      // fade ring
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(l.x, l.y, 21, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(left / l.life, 0, 1)); ctx.stroke();
      if (blink) drawMoon(l.x, l.y, run.st.moonR, G.real * 3, sk.color);
    }
    // enemies
    for (const e of run.enemies) if (vis(e.x, e.y) || e.type === 'boss') drawEnemy(e);
    // bullets
    ctx.globalCompositeOperation = 'lighter';
    for (const b of run.bullets) { if (!vis(b.x, b.y)) continue; ctx.drawImage(glow('#ff3d8b'), b.x - b.r * 3, b.y - b.r * 3, b.r * 6, b.r * 6); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffd0e4';
    for (const b of run.bullets) { if (!vis(b.x, b.y)) continue; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.6, 0, TAU); ctx.fill(); }
    // player + moons
    if (!run.dead) {
      const moons = run.mpos;
      const R = moons.length ? moons[0].R : run.st.orbit;
      ctx.strokeStyle = rgba(sk.color, 0.12); ctx.lineWidth = 1.5;
      if (run.moons) { ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.stroke(); }
      // trails
      ctx.globalCompositeOperation = 'lighter';
      for (const m of moons) {
        const dir = m.outer ? 1 : -1;
        for (let i = 1; i <= 6; i++) {
          const a = m.a + dir * i * 0.11, x = p.x + Math.cos(a) * m.R, y = p.y + Math.sin(a) * m.R;
          ctx.globalAlpha = 0.22 * (1 - i / 7); ctx.fillStyle = sk.color;
          ctx.beginPath(); ctx.arc(x, y, m.r * (1 - i * 0.1), 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (const m of moons) drawMoon(m.x, m.y, m.r, m.a, m.outer ? '#ffe08a' : sk.color);
      const blink = p.inv > 0 && Math.sin(G.real * 30) > 0 ? 0.35 : 1;
      drawStar(p.x, p.y, p.r, G.real, sk, blink);
      if (run.shield) {
        ctx.strokeStyle = rgba('#6cf0ff', 0.8); ctx.lineWidth = 2.5; ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = G.real + i * TAU / 6; ctx.lineTo(p.x + Math.cos(a) * 26, p.y + Math.sin(a) * 26); }
        ctx.closePath(); ctx.stroke();
      }
    }
    // particles
    ctx.globalCompositeOperation = 'lighter';
    for (const q of run.parts) {
      if (!vis(q.x, q.y)) continue;
      ctx.globalAlpha = clamp(q.life / q.max, 0, 1); ctx.fillStyle = q.color;
      if (q.kind === 0) { const s = q.size; ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s); }
      else { ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.5 + 0.5 * q.life / q.max), 0, TAU); ctx.fill(); }
    }
    for (const r of run.rings) {
      ctx.globalAlpha = clamp(r.life / r.maxLife, 0, 1); ctx.strokeStyle = r.color; ctx.lineWidth = r.width * (r.life / r.maxLife) + 0.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // texts
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of run.texts) {
      ctx.globalAlpha = clamp(t.life / t.max * 1.5, 0, 1);
      ctx.font = `700 ${t.size}px Fredoka, sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(5,6,26,.8)'; ctx.strokeText(t.txt, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
  function drawMenuScene() {
    // decorative star with orbiting moons
    const t = G.real, sk = skin();
    cam.x += 0.4; cam.y = Math.sin(t * 0.1) * 40;
    const x = cam.x, y = cam.y + (H / SCALE) * 0.02;
    const R = 150;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = rgba(sk.color, 0.12); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, R * 1.9, R * 1.25, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 0.5; for (let i = 0; i < 4; i++) { const a = t * 0.7 + i * TAU / 4; drawMoon(x + Math.cos(a) * R * 1.9, y + Math.sin(a) * R * 1.25, 11, a, sk.color, true); } ctx.globalAlpha = 1;
    drawStar(x, y, 22, t, sk, 0.35);
  }
  function fmtTime(s) { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function drawHUD() {
    const u = UI, p = run.p;
    ctx.textBaseline = 'middle';
    // XP bar
    const bh = 7 * u;
    ctx.fillStyle = 'rgba(10,12,40,.7)'; ctx.fillRect(0, 0, W, bh);
    const gr = ctx.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#6cc8ff'); gr.addColorStop(1, '#9effd5');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W * clamp(run.xp / run.need, 0, 1), bh);
    // timer
    ctx.textAlign = 'center'; ctx.font = `700 ${26 * u}px Fredoka, sans-serif`;
    ctx.lineWidth = 4 * u; ctx.strokeStyle = 'rgba(5,6,26,.7)';
    ctx.strokeText(fmtTime(run.t), W / 2, bh + 22 * u); ctx.fillStyle = '#ffffff'; ctx.fillText(fmtTime(run.t), W / 2, bh + 22 * u);
    // level + kills
    ctx.textAlign = 'left'; ctx.font = `700 ${16 * u}px Fredoka, sans-serif`;
    const lx = 12 * u + (window.visualViewport ? 0 : 0);
    ctx.fillStyle = '#9effd5'; ctx.fillText('LV ' + run.lvl, lx, bh + 18 * u);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = `600 ${13 * u}px Fredoka, sans-serif`; ctx.fillText(run.kills + ' defeated', lx, bh + 38 * u);
    // moons
    const my = bh + 62 * u, sk = skin();
    const n = run.moons;
    if (n === 0) {
      ctx.fillStyle = `rgba(255,96,128,${0.6 + 0.4 * Math.sin(G.real * 8)})`; ctx.font = `700 ${14 * u}px Fredoka, sans-serif`;
      ctx.fillText('NO MOONS - NEXT HIT IS FATAL', lx, my);
    } else {
      const show = Math.min(n, 10);
      for (let i = 0; i < show; i++) { const x = lx + 8 * u + i * 19 * u; ctx.fillStyle = '#dfe7ff'; ctx.beginPath(); ctx.arc(x, my, 7 * u, 0, TAU); ctx.fill(); ctx.fillStyle = rgba(sk.color, 0.5); ctx.beginPath(); ctx.arc(x + 2 * u, my - 2 * u, 2.2 * u, 0, TAU); ctx.fill(); }
      if (n > 10) { ctx.fillStyle = '#dfe7ff'; ctx.font = `700 ${13 * u}px Fredoka, sans-serif`; ctx.fillText('+' + (n - 10), lx + 8 * u + 10 * 19 * u - 4 * u, my); }
    }
    if (run.st.aegis) {
      const x = lx + 8 * u, y = my + 22 * u;
      ctx.strokeStyle = run.shield ? '#6cf0ff' : 'rgba(108,240,255,.3)'; ctx.lineWidth = 2 * u; ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; ctx.lineTo(x + Math.cos(a) * 7 * u, y + Math.sin(a) * 7 * u); } ctx.closePath(); ctx.stroke();
      if (!run.shield) { ctx.fillStyle = 'rgba(108,240,255,.7)'; ctx.font = `600 ${11 * u}px Fredoka, sans-serif`; ctx.fillText(Math.ceil(run.shieldT) + 's', x + 14 * u, y); }
    }
    // boss bar
    if (run.boss) {
      const b = run.boss, bw = Math.min(W * 0.6, 480 * u), bx = W / 2 - bw / 2, by = bh + 46 * u;
      ctx.fillStyle = 'rgba(10,4,20,.75)'; ctx.fillRect(bx, by, bw, 10 * u);
      ctx.fillStyle = '#ff4060'; ctx.fillRect(bx, by, bw * clamp(b.hp / b.maxHp, 0, 1), 10 * u);
      ctx.strokeStyle = '#ffb0c0'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, 10 * u);
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffb0c0'; ctx.font = `700 ${12 * u}px Fredoka, sans-serif`;
      ctx.fillText('ECLIPSE ' + ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][Math.min(7, b.tier - 1)], W / 2, by + 22 * u);
      // offscreen arrow
      const sx = (b.x - cam.x) * SCALE + W / 2, sy = (b.y - cam.y) * SCALE + H / 2;
      if (sx < 0 || sx > W || sy < 0 || sy > H) {
        const a = Math.atan2(sy - H / 2, sx - W / 2), ax = clamp(sx, 30 * u, W - 30 * u), ay = clamp(sy, 90 * u, H - 30 * u);
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(a); ctx.fillStyle = '#ff4060';
        ctx.beginPath(); ctx.moveTo(14 * u, 0); ctx.lineTo(-8 * u, -9 * u); ctx.lineTo(-8 * u, 9 * u); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    // loose moon arrows
    for (const l of run.loose) {
      const sx = (l.x - cam.x) * SCALE + W / 2, sy = (l.y - cam.y) * SCALE + H / 2;
      if (sx < 0 || sx > W || sy < 0 || sy > H) {
        const a = Math.atan2(sy - H / 2, sx - W / 2), ax = clamp(sx, 24 * u, W - 24 * u), ay = clamp(sy, 24 * u, H - 24 * u);
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(a); ctx.fillStyle = '#dfe7ff';
        ctx.beginPath(); ctx.moveTo(12 * u, 0); ctx.lineTo(-6 * u, -7 * u); ctx.lineTo(-6 * u, 7 * u); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    // danger vignette
    if (n === 0 && !run.dead && !run.shield) {
      const a = 0.25 + 0.15 * Math.sin(G.real * 6);
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(255,40,80,0)'); vg.addColorStop(1, `rgba(255,40,80,${a})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    // banner
    if (G.banner) {
      const b = G.banner, f = b.t / b.max, a = clamp(Math.min(f * 4, (1 - f) * 8), 0, 1);
      ctx.globalAlpha = a; ctx.textAlign = 'center';
      const s = 1 + (1 - Math.min(1, (1 - f) * 8)) * 0.3;
      ctx.font = `700 ${30 * u * s}px Fredoka, sans-serif`;
      ctx.lineWidth = 6 * u; ctx.strokeStyle = 'rgba(5,6,26,.75)';
      ctx.strokeText(b.txt, W / 2, H * 0.28); ctx.fillStyle = b.color; ctx.fillText(b.txt, W / 2, H * 0.28);
      if (b.sub) { ctx.font = `600 ${15 * u}px Fredoka, sans-serif`; ctx.lineWidth = 4 * u; ctx.strokeText(b.sub, W / 2, H * 0.28 + 30 * u); ctx.fillStyle = '#ffffff'; ctx.fillText(b.sub, W / 2, H * 0.28 + 30 * u); }
      ctx.globalAlpha = 1;
    }
    // tutorial hint
    if (G.hint) {
      ctx.textAlign = 'center'; ctx.font = `600 ${16 * u}px Fredoka, sans-serif`;
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(G.real * 3);
      ctx.lineWidth = 4 * u; ctx.strokeStyle = 'rgba(5,6,26,.8)'; ctx.strokeText(G.hint, W / 2, H - 46 * u);
      ctx.fillStyle = '#ffffff'; ctx.fillText(G.hint, W / 2, H - 46 * u); ctx.globalAlpha = 1;
    }
    // joystick
    if (joy.active && G.state === 'play') {
      ctx.globalAlpha = 0.35; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 55 * u, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(joy.x, joy.y, 22 * u, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  function updateHint() {
    if (save.tutorial || !run) { G.hint = ''; return; }
    const t = run.t;
    const touch = G.mobile || lastInputTouch;
    if (run.loose.length) G.hint = 'Touch the loose moon to take it back!';
    else if (t < 6) G.hint = touch ? 'Drag anywhere to move' : 'Move with WASD / arrow keys, or hold the mouse';
    else if (t < 13) G.hint = 'Your orbiting moons smash anything they touch';
    else if (t < 20) G.hint = 'Collect crystals to level up';
    else if (t < 27) G.hint = 'Each hit knocks a moon loose. No moons left = game over';
    else G.hint = '';
  }

  // ---------------------------------------------------------------- loop
  let last = performance.now(), acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;
    G.real += dt;
    if (G.state === 'play' && run) {
      let ts = 1;
      if (G.slow > 0) { G.slow -= dt; ts = 0.3; }
      if (run.dead) {
        ts = Math.min(ts, 0.45); run.deathT -= dt;
        if (run.deathT <= 0) gameOver();
      }
      acc += dt * ts;
      let n = 0;
      while (acc >= STEP && n < 6) { update(STEP); acc -= STEP; n++; if (G.state !== 'play') { acc = 0; break; } }
      if (n >= 6) acc = 0;
      const k = 1 - Math.exp(-dt * 8);
      cam.x += (run.p.x - cam.x) * k; cam.y += (run.p.y - cam.y) * k;
      if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
      updateHint();
    }
    G.shake = Math.max(0, G.shake - dt * 40);
    render();
  }

  // ---------------------------------------------------------------- UI / flow
  const screens = [...document.querySelectorAll('.screen')];
  function show(id) { screens.forEach(s => s.classList.toggle('show', s.id === id)); $('b-pause').classList.toggle('show', id === null && G.state === 'play'); }
  let toastT = 0;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
  function bind(id, fn) { $(id).addEventListener('click', e => { SFX.ensure(); SFX.S.click(); fn(e); }); }

  function goMenu() {
    G.state = 'menu'; run = null; CG.gameplayStop(); SFX.setIntensity(0);
    const s = save.stats;
    $('menu-stats').innerHTML = s.runs ? `Best ${fmtTime(s.best)} &middot; Level ${s.bestLvl} &middot; <span class="dust">&#10023; ${save.dust}</span>` : `<span class="dust">&#10023; ${save.dust} stardust</span>`;
    show('s-menu');
  }
  async function startRun() {
    if (G.runsThisSession > 0 && CG.ready) {
      G.state = 'ad'; show('s-ad');
      await CG.requestAd('midgame');
    }
    G.runsThisSession++;
    newRun();
    G.state = 'play'; G.banner = null; G.slow = 0; acc = 0;
    show(null);
    SFX.setIntensity(1);
    CG.gameplayStart();
  }
  function pause() {
    if (G.state !== 'play' || !run || run.dead) return;
    G.state = 'paused'; CG.gameplayStop();
    const b = $('pause-build'); b.innerHTML = '';
    const ups = Object.entries(run.up);
    if (!ups.length) b.innerHTML = '<span>No upgrades yet</span>';
    for (const [id, l] of ups) { const u = UPG.find(x => x.id === id); if (u) b.insertAdjacentHTML('beforeend', `<span>${u.name} ${l}</span>`); }
    renderToggles($('pause-settings'));
    show('s-pause');
  }
  function resume() {
    if (G.state !== 'paused') return;
    G.state = 'play'; show(null); CG.gameplayStart(); last = performance.now();
  }
  // ----- level up
  function rollCards() {
    const avail = UPG.filter(u => (run.up[u.id] | 0) < u.max);
    const weighted = avail.map(u => ({ u, w: u.id === 'moon' ? (run.moons < 3 ? 3 : 1.3) : (run.up[u.id] ? 1.3 : 1) }));
    const out = [];
    while (out.length < 3 && weighted.length) {
      let s = 0; for (const x of weighted) s += x.w;
      let r = Math.random() * s, i = 0;
      for (; i < weighted.length; i++) { r -= weighted[i].w; if (r <= 0) break; }
      i = Math.min(i, weighted.length - 1);
      out.push(weighted[i].u); weighted.splice(i, 1);
    }
    while (out.length < 3) {
      const extra = [{ id: '_dust', name: 'Stardust Cache', icon: '✷', color: '#ffe08a', max: 99, desc: () => '+25 stardust, banked right away.' },
        { id: '_moon', name: 'Wandering Moon', icon: '●', color: '#dfe7ff', max: 99, desc: () => '+1 moon.' }];
      out.push(extra[out.length % 2]);
      if (out.length === 3 && out[1] === out[2]) out[2] = extra[0];
    }
    run.cards = out;
  }
  function openLevelUp() {
    G.state = 'levelup'; CG.gameplayStop();
    joy.active = false; mouse.down = false;
    rollCards(); renderCards();
    show('s-levelup');
  }
  function renderCards() {
    const c = $('cards'); c.innerHTML = '';
    run.cards.forEach((u, i) => {
      const l = run.up[u.id] | 0;
      const el = document.createElement('button'); el.className = 'card';
      el.innerHTML = `<div class="ic" style="background:${u.color};box-shadow:0 0 1em ${u.color}">${u.icon}</div>
        <div><b>${u.name}</b><br>${u.id[0] === '_' ? '' : l === 0 ? '<span class="new">NEW</span>' : `<span class="lv">Lv ${l} &rarr; ${l + 1}</span>`}</div>
        <small>${u.desc(l)}</small><span class="key">[${i + 1}]</span>`;
      el.addEventListener('click', () => { SFX.S.pick(); chooseCard(i); });
      c.appendChild(el);
    });
    const rb = $('b-reroll');
    rb.style.display = run.rerolls > 0 ? '' : 'none';
    rb.textContent = `Reroll (${run.rerolls})`;
    $('lvl-hint').textContent = run.pending > 1 ? `Choose one (${run.pending} level ups)` : 'Choose one';
  }
  function chooseCard(i) {
    if (G.state !== 'levelup') return;
    const u = run.cards[i]; if (!u) return;
    if (u.id === '_dust') { save.dust += 25; persist(); }
    else if (u.id === '_moon') run.moons = Math.min(MOON_CAP, run.moons + 1);
    else {
      run.up[u.id] = (run.up[u.id] | 0) + 1;
      if (u.id === 'moon') run.moons = Math.min(MOON_CAP, run.moons + 1);
      if (u.id === 'flare' && run.up.flare === 1) run.flareT = 1;
      recompute();
    }
    run.pending--;
    if (run.pending > 0) { rollCards(); renderCards(); return; }
    G.state = 'play'; show(null); CG.gameplayStart(); last = performance.now();
    run.p.inv = Math.max(run.p.inv, 0.4);
  }
  bind('b-reroll', () => { if (run && run.rerolls > 0) { run.rerolls--; rollCards(); renderCards(); } });

  // ----- game over
  function gameOver() {
    G.state = 'over'; CG.gameplayStop(); SFX.setIntensity(0);
    const s = save.stats, t = run.t;
    let bossBonus = 0; for (let i = 1; i <= run.bossKills; i++) bossBonus += 60 * i;
    const earned = Math.floor((t / 4 + run.kills / 5 + bossBonus + (run.lvl - 1) * 2) * (1 + 0.12 * metaLv('dust')));
    run.earned = earned;
    const newBest = t > s.best;
    s.runs++; s.kills += run.kills; s.bosses += run.bossKills;
    if (newBest) s.best = t;
    if (run.kills > s.bestKills) s.bestKills = run.kills;
    if (run.lvl > s.bestLvl) s.bestLvl = run.lvl;
    save.dust += earned; save.tutorial = true;
    persist();
    $('over-title').textContent = newBest && s.runs > 1 ? 'NEW RECORD!' : 'YOUR LIGHT FADES';
    $('over-stats').innerHTML = `
      <div><small>Survived</small><b class="${newBest ? 'best' : ''}">${fmtTime(t)}</b></div>
      <div><small>Best</small><b>${fmtTime(s.best)}</b></div>
      <div><small>Defeated</small><b>${run.kills}</b></div>
      <div><small>Level</small><b>${run.lvl}</b></div>
      ${run.bossKills ? `<div style="grid-column:span 2"><small>Eclipses broken</small><b>${run.bossKills}</b></div>` : ''}`;
    $('over-dust').innerHTML = `+${earned} &#10023; stardust`;
    const db = $('b-double');
    db.style.display = CG.adsAvailable() && earned >= 10 ? '' : 'none';
    db.disabled = false;
    $('adblock-note').textContent = CG.ready && CG.adblock ? 'Ad blocker detected: the bonus reward is unavailable.' : '';
    show('s-over');
  }
  bind('b-double', async () => {
    if (!run || run.doubled) return;
    G.state = 'ad'; show('s-ad');
    const ok = await CG.requestAd('rewarded');
    G.state = 'over'; show('s-over');
    if (ok) {
      run.doubled = true; save.dust += run.earned; persist();
      $('over-dust').innerHTML = `+${run.earned * 2} &#10023; stardust <small>(doubled!)</small>`;
      $('b-double').style.display = 'none'; SFX.S.buy();
    } else toast('No ad available right now. Try again later.');
  });
  bind('b-again', () => startRun());
  bind('b-menu', () => goMenu());
  bind('b-play', () => startRun());
  bind('b-resume', () => resume());
  bind('b-quit', () => { if (run) { run.dead = true; gameOver(); } });
  bind('b-pause', () => pause());
  bind('b-shop', () => { renderShop(); show('s-shop'); });
  bind('b-skins', () => { renderSkins(); show('s-skins'); });
  bind('b-settings', () => { renderToggles($('settings-list')); show('s-settings'); });
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { SFX.S.click(); goMenu(); }));

  function renderShop() {
    $('shop-dust').innerHTML = `&#10023; ${save.dust}`;
    const list = $('shop-list'); list.innerHTML = '';
    for (const m of META) {
      const l = metaLv(m.id), maxed = l >= m.max, cost = maxed ? 0 : m.cost[l];
      const el = document.createElement('div'); el.className = 'item';
      el.innerHTML = `<div class="ic" style="background:${m.color}">${m.icon}</div>
        <div class="tx"><b>${m.name}</b><small>${m.desc}</small><div class="pips">${Array.from({ length: m.max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div></div>
        <button class="btn ${!maxed && save.dust >= cost ? 'primary' : ''}" ${maxed ? 'disabled' : ''}>${maxed ? 'MAX' : '&#10023; ' + cost}</button>`;
      el.querySelector('button').addEventListener('click', () => {
        if (maxed) return;
        if (save.dust < cost) { SFX.S.deny(); toast('Not enough stardust'); return; }
        save.dust -= cost; save.meta[m.id] = l + 1; persist(); SFX.S.buy(); renderShop();
      });
      list.appendChild(el);
    }
  }
  function renderSkins() {
    $('skins-dust').innerHTML = `&#10023; ${save.dust}`;
    const list = $('skins-list'); list.innerHTML = '';
    for (const s of SKINS) {
      const owned = !!save.skins[s.id], sel = save.skin === s.id;
      const el = document.createElement('button'); el.className = 'skin' + (sel ? ' sel' : '');
      el.innerHTML = `<div class="orb" style="background:radial-gradient(circle,#fff 0%,${s.core} 35%,${s.color} 70%,transparent 72%);box-shadow:0 0 1.2em ${s.color}"></div>
        <b>${s.name}</b><small>${sel ? 'Selected' : owned ? 'Select' : '&#10023; ' + s.cost}</small>`;
      el.addEventListener('click', () => {
        if (owned) { save.skin = s.id; SFX.S.click(); }
        else if (save.dust >= s.cost) { save.dust -= s.cost; save.skins[s.id] = true; save.skin = s.id; SFX.S.buy(); }
        else { SFX.S.deny(); toast('Not enough stardust'); return; }
        persist(); renderSkins();
      });
      list.appendChild(el);
    }
  }
  function renderToggles(el) {
    el.innerHTML = '';
    const items = [['sfx', 'Sound effects'], ['music', 'Music'], ['shake', 'Screen shake']];
    for (const [k, label] of items) {
      const b = document.createElement('button'); b.className = 'tog' + (save.settings[k] ? ' on' : '');
      b.innerHTML = `<span>${label}</span><span class="sw"></span>`;
      b.addEventListener('click', () => { save.settings[k] = !save.settings[k]; applySettings(); persist(); SFX.ensure(); SFX.S.click(); renderToggles(el); });
      el.appendChild(b);
    }
  }
  function applySettings() { SFX.setSfx(save.settings.sfx); SFX.setMusic(save.settings.music); }

  function onKey(e) {
    if (e.repeat) return;
    const k = e.code;
    if (G.state === 'play' && (k === 'KeyP' || k === 'Escape')) pause();
    else if (G.state === 'paused' && (k === 'KeyP' || k === 'Escape' || k === 'Enter')) resume();
    else if (G.state === 'levelup' && ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].includes(k)) { SFX.S.pick(); chooseCard(parseInt(k.slice(-1)) - 1); }
    else if (G.state === 'levelup' && k === 'KeyR' && run.rerolls > 0) { run.rerolls--; rollCards(); renderCards(); }
    else if (G.state === 'menu' && $('s-menu').classList.contains('show') && (k === 'Enter' || k === 'Space')) { SFX.S.click(); startRun(); }
    else if (G.state === 'over' && (k === 'Enter' || k === 'Space')) { SFX.S.click(); startRun(); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') pause(); });

  // ---------------------------------------------------------------- boot
  async function boot() {
    requestAnimationFrame(t => { last = t; frame(t); });
    const fill = $('load-fill'); fill.style.width = '20%';
    await CG.init();
    CG.loadingStart();
    fill.style.width = '60%';
    loadSave(); applySettings();
    G.mobile = CG.deviceType() !== 'desktop';
    try { await Promise.race([document.fonts.load('700 20px Fredoka'), new Promise(r => setTimeout(r, 1500))]); } catch (e) { }
    fill.style.width = '100%';
    CG.loadingStop();
    setTimeout(goMenu, 150);
  }
  // @debug-start (stripped from the release build)
  window.__nova = { get G() { return G; }, get run() { return run; }, startRun, chooseCard, get save() { return save; }, keys,
    // DEBUG-ONLY: fast-forward simulation with auto-picked cards
    fast(sec, bot) { let n = Math.round(sec / STEP); while (n-- > 0 && run) { while (G.state === 'levelup') chooseCard((Math.random() * 3) | 0); if (bot) bot(run, keys); if (G.state !== 'play') break; update(STEP); if (run.dead) { gameOver(); break; } } return run && { t: run.t, lvl: run.lvl, kills: run.kills, moons: run.moons, enemies: run.enemies.length, dead: run.dead, up: run.up }; } };
  // @debug-end
  boot();
})();
