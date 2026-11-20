// Synthesized sound + generative music. No audio files needed.
window.SFX = (() => {
  let ctx = null, master, comp, sfxG, musG, noiseBuf;
  let sfxOn = true, musicOn = true, adMuted = false, sdkMuted = false, hidden = false;
  const lastPlay = {};
  let voices = 0;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended' && !hidden) ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = 0.85;
    master.connect(comp); comp.connect(ctx.destination);
    sfxG = ctx.createGain(); sfxG.connect(master);
    musG = ctx.createGain(); musG.gain.value = 0; musG.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    apply();
    startMusic();
    return true;
  }
  function apply() {
    if (!ctx) return;
    const muted = adMuted || sdkMuted || hidden;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(muted ? 0 : 0.85, t, 0.03);
    sfxG.gain.setTargetAtTime(sfxOn ? 1 : 0, t, 0.02);
    musG.gain.setTargetAtTime(musicOn ? 0.32 : 0, t, 0.3);
  }
  // iOS / autoplay: resume inside user gestures
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach(ev =>
    document.addEventListener(ev, () => ensure(), { passive: true }));
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden; apply();
    if (ctx) { if (hidden) ctx.suspend(); else ctx.resume(); }
  });

  function gate(name, minGap) {
    if (!ctx || !sfxOn || adMuted) return false;
    const now = ctx.currentTime;
    if (lastPlay[name] && now - lastPlay[name] < minGap) return false;
    if (voices > 28) return false;
    lastPlay[name] = now; return true;
  }
  function tone(o) {
    const t = ctx.currentTime + (o.when || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.slide || o.dur));
    if (o.detune) osc.detune.value = o.detune;
    const vol = o.vol || 0.2, dur = o.dur || 0.15, a = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(g); g.connect(o.dest || sfxG);
    osc.start(t); osc.stop(t + dur + 0.05);
    voices++; osc.onended = () => voices--;
  }
  function noise(o) {
    const t = ctx.currentTime + (o.when || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    src.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = o.ftype || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1500, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain(), vol = o.vol || 0.2, dur = o.dur || 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxG);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    voices++; src.onended = () => voices--;
  }

  const S = {
    hit(p = 1) { if (!gate('hit', 0.035)) return; tone({ type: 'triangle', f: 520 * p + Math.random() * 80, f2: 200, dur: 0.08, vol: 0.12 }); noise({ freq: 3000, dur: 0.05, vol: 0.07, q: 2 }); },
    kill(p = 1) { if (!gate('kill', 0.03)) return; tone({ type: 'square', f: 300 * p, f2: 900 * p, dur: 0.09, vol: 0.06, lp: 2600 }); noise({ freq: 900, f2: 300, dur: 0.16, vol: 0.12, q: 0.8 }); },
    gem(combo = 0) { if (!gate('gem', 0.028)) return; const f = 880 * Math.pow(1.0595, Math.min(combo, 24)); tone({ type: 'sine', f, dur: 0.09, vol: 0.09 }); tone({ type: 'sine', f: f * 2, dur: 0.05, vol: 0.03 }); },
    levelup() { if (!gate('lvl', 0.2)) return; [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: 'triangle', f, dur: 0.3, vol: 0.14, when: i * 0.06 })); },
    pick() { if (!gate('pick', 0.05)) return; tone({ type: 'triangle', f: 660, f2: 1320, dur: 0.12, vol: 0.12 }); },
    click() { if (!gate('click', 0.04)) return; tone({ type: 'sine', f: 700, f2: 500, dur: 0.06, vol: 0.1 }); },
    buy() { if (!gate('buy', 0.08)) return; [784, 988, 1175].forEach((f, i) => tone({ type: 'square', f, dur: 0.14, vol: 0.05, when: i * 0.05, lp: 3000 })); },
    deny() { if (!gate('deny', 0.1)) return; tone({ type: 'square', f: 180, f2: 120, dur: 0.18, vol: 0.06, lp: 1200 }); },
    hurt() { if (!gate('hurt', 0.1)) return; tone({ type: 'sawtooth', f: 220, f2: 50, dur: 0.4, vol: 0.2, lp: 1400 }); noise({ freq: 600, f2: 120, dur: 0.35, vol: 0.3, q: 0.7 }); },
    moonBack() { if (!gate('mb', 0.06)) return; [660, 990, 1320].forEach((f, i) => tone({ type: 'sine', f, dur: 0.18, vol: 0.12, when: i * 0.04 })); },
    shield() { if (!gate('sh', 0.1)) return; tone({ type: 'sine', f: 1200, f2: 400, dur: 0.3, vol: 0.15 }); noise({ freq: 5000, dur: 0.2, vol: 0.08, q: 3 }); },
    flare() { if (!gate('fl', 0.15)) return; tone({ type: 'sine', f: 180, f2: 90, dur: 0.5, vol: 0.18 }); noise({ freq: 2000, f2: 400, dur: 0.45, vol: 0.1, q: 0.6 }); },
    boom() { if (!gate('boom', 0.06)) return; noise({ freq: 400, f2: 80, dur: 0.35, vol: 0.22, q: 0.6, ftype: 'lowpass' }); },
    shoot() { if (!gate('shoot', 0.08)) return; tone({ type: 'square', f: 900, f2: 300, dur: 0.1, vol: 0.04, lp: 2000 }); },
    block() { if (!gate('blk', 0.04)) return; tone({ type: 'sine', f: 1500, f2: 2200, dur: 0.06, vol: 0.06 }); },
    warn() { if (!ctx) return; for (let i = 0; i < 3; i++) { tone({ type: 'sawtooth', f: 220, f2: 330, slide: 0.35, dur: 0.45, vol: 0.12, when: i * 0.55, lp: 1500 }); } },
    bossDie() { if (!ctx) return; noise({ freq: 300, f2: 40, dur: 1.6, vol: 0.4, q: 0.5, ftype: 'lowpass' }); [392, 523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f, dur: 0.6, vol: 0.12, when: 0.2 + i * 0.09 })); },
    die() { if (!ctx) return; tone({ type: 'sawtooth', f: 330, f2: 40, dur: 1.4, vol: 0.2, lp: 1800 }); noise({ freq: 800, f2: 60, dur: 1.2, vol: 0.3, q: 0.5 }); },
    revive() { if (!ctx) return; [392, 494, 587, 784, 988].forEach((f, i) => tone({ type: 'sine', f, dur: 0.5, vol: 0.13, when: i * 0.07 })); },
  };

  // ---------- generative music ----------
  let musicTimer = null, nextT = 0, step = 0, intensity = 0;
  const BPM = 100, S16 = 60 / BPM / 4;
  // A minor: Am F C G   (midi roots)
  const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const arpPat = [0, 1, 2, 1, 2, 3, 2, 1];
  function startMusic() {
    if (musicTimer) return;
    nextT = ctx.currentTime + 0.1;
    musicTimer = setInterval(schedule, 60);
  }
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    while (nextT < ctx.currentTime + 0.25) { playStep(step, nextT); nextT += S16; step++; }
  }
  function mtone(f, t, dur, vol, type, lp) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; osc.connect(fl); fl.connect(g); }
    else osc.connect(g);
    g.connect(musG); osc.start(t); osc.stop(t + dur + 0.05);
  }
  function playStep(s, t) {
    const bar = Math.floor(s / 16) % 4, chord = prog[bar], pos = s % 16;
    if (pos === 0) { // pad
      chord.forEach(m => { mtone(mtof(m), t, S16 * 16, 0.035, 'triangle', 900); mtone(mtof(m + 12) * 1.003, t, S16 * 16, 0.012, 'sawtooth', 700); });
    }
    if (pos % 8 === 0) mtone(mtof(chord[0] - 24), t, S16 * 7, 0.11, 'sine');
    if (intensity > 0 && pos % 8 === 6) mtone(mtof(chord[0] - 24), t, S16 * 2, 0.07, 'sine');
    // arpeggio
    if (pos % 2 === 0) {
      const idx = arpPat[(pos / 2) % 8];
      const m = idx === 3 ? chord[0] + 12 : chord[idx];
      mtone(mtof(m + 12), t, S16 * 1.8, intensity > 0 ? 0.05 : 0.035, 'triangle', 2400);
    }
    if (intensity > 0) {
      if (pos % 4 === 2) { // hat
        const src = ctx.createBufferSource(); src.buffer = noiseBuf;
        const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        src.connect(f); f.connect(g); g.connect(musG); src.start(t, Math.random() * 0.5); src.stop(t + 0.06);
      }
      if (pos === 0 || pos === 8) { // soft kick
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g); g.connect(musG); o.start(t); o.stop(t + 0.22);
      }
    }
  }

  return {
    ensure, S,
    setSfx(v) { sfxOn = v; apply(); },
    setMusic(v) { musicOn = v; apply(); },
    setAdMute(v) { adMuted = v; apply(); },
    setSdkMute(v) { sdkMuted = v; apply(); },
    setIntensity(v) { intensity = v; },
  };
})();
