// Static game content: in-run upgrades, permanent upgrades, star skins, enemy types.
window.DATA = {
  // In-run upgrades offered on level up
  UPG: [
    { id: 'moon',    name: 'New Moon',        icon: '●', color: '#dfe7ff', max: 6, desc: l => 'Capture another moon. More moons, more hits you can take.' },
    { id: 'mass',    name: 'Heavy Moons',     icon: '✦', color: '#ffb36b', max: 5, desc: l => '+25% moon damage and a little bigger.' },
    { id: 'spin',    name: 'Spin Up',         icon: '↻', color: '#7fe3ff', max: 5, desc: l => '+16% orbit speed. Hits come faster.' },
    { id: 'reach',   name: 'Wide Orbit',      icon: '◎', color: '#a6b4ff', max: 4, desc: l => '+15% orbit radius. Keep danger further away.' },
    { id: 'swift',   name: 'Solar Wind',      icon: '➤', color: '#9effd5', max: 5, desc: l => '+10% movement speed.' },
    { id: 'magnet',  name: 'Gravity Pull',    icon: '⊙', color: '#c59bff', max: 4, desc: l => '+45% pickup range for crystals.' },
    { id: 'outer',   name: 'Outer Ring',      icon: '◌', color: '#ffe08a', max: 3, desc: l => 'A wide, counter-spinning moon that is never lost.' },
    { id: 'flare',   name: 'Solar Flare',     icon: '☀', color: '#ffd35c', max: 4, desc: l => l === 0 ? 'Every few seconds, burst a damaging nova around you.' : 'Flares are stronger, wider and more frequent.' },
    { id: 'shatter', name: 'Remnants',        icon: '✵', color: '#ff7a9c', max: 3, desc: l => 'Defeated enemies explode, hurting their neighbours.' },
    { id: 'tidal',   name: 'Tidal Lock',      icon: '⇤', color: '#8fd0ff', max: 3, desc: l => 'Nearby lost moons drift back to you, and fade slower.' },
    { id: 'aegis',   name: 'Corona Shield',   icon: '⬡', color: '#6cf0ff', max: 3, desc: l => l === 0 ? 'A shield that absorbs one hit. Recharges over time.' : 'Shield recharges faster.' },
    { id: 'chill',   name: 'Lunar Frost',     icon: '❄', color: '#bff3ff', max: 3, desc: l => 'Moon hits slow enemies down.' },
  ],
  // Permanent upgrades (Observatory)
  META: [
    { id: 'moons', name: 'Captured Moons', icon: '●', color: '#dfe7ff', max: 2, cost: [120, 420], desc: 'Start every run with +1 moon.' },
    { id: 'power', name: 'Dense Cores',    icon: '✦', color: '#ffb36b', max: 5, cost: [40, 90, 160, 260, 400], desc: '+10% moon damage.' },
    { id: 'swift', name: 'Light Sails',    icon: '➤', color: '#9effd5', max: 5, cost: [30, 70, 130, 210, 320], desc: '+5% movement speed.' },
    { id: 'grav',  name: 'Deep Gravity',   icon: '⊙', color: '#c59bff', max: 5, cost: [30, 70, 130, 210, 320], desc: '+15% pickup range.' },
    { id: 'dust',  name: 'Dust Lens',      icon: '✷', color: '#ffe08a', max: 5, cost: [50, 110, 200, 320, 480], desc: '+12% stardust earned.' },
    { id: 'reroll',name: 'Star Charts',    icon: '⇄', color: '#7fe3ff', max: 3, cost: [60, 160, 320], desc: '+1 level-up reroll per run.' },
    { id: 'wisdom',name: 'Old Light',      icon: '★', color: '#ffd35c', max: 3, cost: [80, 200, 380], desc: '+8% crystal experience.' },
    { id: 'dawn',  name: 'Second Dawn',    icon: '☼', color: '#ff9a3c', max: 1, cost: [600], desc: 'Once per run, survive a fatal hit and regain 2 moons.' },
  ],
  SKINS: [
    { id: 'sol',     name: 'Sol',     color: '#ffd35c', core: '#fff6d6', cost: 0 },
    { id: 'rigel',   name: 'Rigel',   color: '#6cc8ff', core: '#e8f8ff', cost: 150 },
    { id: 'antares', name: 'Antares', color: '#ff6a4d', core: '#ffe2d6', cost: 250 },
    { id: 'verdant', name: 'Verdant', color: '#6dff9e', core: '#e8ffef', cost: 350 },
    { id: 'nebula',  name: 'Nebula',  color: '#ff7ad9', core: '#ffe6f8', cost: 500 },
    { id: 'void',    name: 'Umbra',   color: '#9a7bff', core: '#efe8ff', cost: 800 },
  ],
  // Enemy archetypes
  ENEMY: {
    mote:     { hp: 9,  spd: 82, r: 11, xp: 1, color: '#b06cff', shape: 'spike', mass: 1 },
    dart:     { hp: 12, spd: 64, r: 11, xp: 2, color: '#ff5c8a', shape: 'tri',   mass: 1 },
    splitter: { hp: 26, spd: 58, r: 16, xp: 3, color: '#3cf0c8', shape: 'diamond', mass: 2 },
    brute:    { hp: 60, spd: 44, r: 23, xp: 5, color: '#ff8f3c', shape: 'hex',   mass: 5 },
    spitter:  { hp: 18, spd: 58, r: 13, xp: 3, color: '#ffd23c', shape: 'eye',   mass: 1.5 },
    boss:     { hp: 1400, spd: 46, r: 58, xp: 60, color: '#ff4060', shape: 'boss', mass: 60 },
  },
};
