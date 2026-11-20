// Thin, defensive wrapper around the CrazyGames HTML5 SDK v3.
// The game keeps working if the SDK is missing, blocked, or in the "disabled" environment.
window.CG = (() => {
  let sdk = null, ready = false, env = 'none', playing = false, adblock = false;

  function safe(fn, fallback) { if (!ready) return fallback; try { return fn(sdk); } catch (e) { return fallback; } }

  async function init() {
    try {
      if (window.CrazyGames && window.CrazyGames.SDK) {
        sdk = window.CrazyGames.SDK;
        await Promise.race([sdk.init(), new Promise((_, rej) => setTimeout(() => rej(new Error('sdk timeout')), 6000))]);
        env = sdk.environment || 'unknown';
        ready = env !== 'disabled';
      }
    } catch (e) { ready = false; }
    if (ready) {
      try { adblock = !!(await sdk.ad.hasAdblock()); } catch (e) { adblock = false; }
      // Respect platform-level mute if the SDK exposes it
      safe(s => {
        const st = s.game.settings;
        if (st && typeof st.muteAudio === 'boolean') SFX.setSdkMute(st.muteAudio);
        if (typeof s.game.addSettingsChangeListener === 'function') {
          s.game.addSettingsChangeListener(ns => { if (ns && typeof ns.muteAudio === 'boolean') SFX.setSdkMute(ns.muteAudio); });
        }
      });
    }
    return ready;
  }

  return {
    init,
    get ready() { return ready; },
    get env() { return env; },
    get adblock() { return adblock; },
    adsAvailable() { return ready && env === 'crazygames' && !adblock; },
    loadingStart() { safe(s => s.game.loadingStart()); },
    loadingStop() { safe(s => s.game.loadingStop()); },
    gameplayStart() { if (playing) return; playing = true; safe(s => s.game.gameplayStart()); },
    gameplayStop() { if (!playing) return; playing = false; safe(s => s.game.gameplayStop()); },
    happytime() { safe(s => s.game.happytime()); },
    deviceType() {
      const t = safe(s => s.user && s.user.systemInfo && s.user.systemInfo.device && s.user.systemInfo.device.type, null);
      if (t) return t; // 'desktop' | 'tablet' | 'mobile'
      return (window.matchMedia && matchMedia('(pointer:coarse)').matches) ? 'mobile' : 'desktop';
    },
    // Resolves true if the ad finished, false on error / unavailable. Never rejects.
    requestAd(type, onStart) {
      return new Promise(resolve => {
        if (!ready) return resolve(false);
        let done = false;
        const finish = ok => { if (done) return; done = true; SFX.setAdMute(false); resolve(ok); };
        try {
          sdk.ad.requestAd(type, {
            adStarted: () => { SFX.setAdMute(true); if (onStart) onStart(); },
            adFinished: () => finish(true),
            adError: () => finish(false),
          });
        } catch (e) { finish(false); }
      });
    },
    getItem(k) {
      const v = safe(s => s.data ? s.data.getItem(k) : undefined, undefined);
      if (v !== undefined && v !== null) return v;
      try { return localStorage.getItem(k); } catch (e) { return null; }
    },
    setItem(k, v) {
      safe(s => { if (s.data) s.data.setItem(k, v); });
      try { localStorage.setItem(k, v); } catch (e) { }
    },
  };
})();
