// Load game data
let GAME_DATA = {};
fetch('./config/data.json')
  .then(res => res.json())
  .then(data => {
    GAME_DATA = data;
    initGame(); // Initialize game after data loads
  });

// =============================================
//  BUILD STATS GRID
// =============================================
function initGame() {
  const colorMap = {};
  GAME_DATA.colors.forEach(c => { colorMap[c.id] = c; });

  // Build stats grid — all trash + trap items
  const statsGrid = document.getElementById('stats-grid');
  const allStatsItems = [
    ...GAME_DATA.trashItems.map(t => ({ ...t, isTrap: false })),
    ...GAME_DATA.trapItems.map(t => ({ ...t, isTrap: true }))
  ];
  window.catchStats = {}; // emoji → count

  allStatsItems.forEach(item => {
    window.catchStats[item.emoji] = 0;
    const cell = document.createElement('div');
    cell.className = 'stat-cell' + (item.isTrap ? ' trap-cell' : '');
    cell.id = 'stat-' + item.emoji.codePointAt(0).toString(16);
    cell.innerHTML = `
      <div class="stat-emoji">${item.emoji}</div>
      <div class="stat-label">${item.label}</div>
      <div class="stat-count" id="cnt-${item.emoji.codePointAt(0).toString(16)}">0</div>
    `;
    statsGrid.appendChild(cell);
  });

  // Set up initial display
  const colorMapForInit = {};
  GAME_DATA.colors.forEach(c => { colorMapForInit[c.id] = c; });
  setBinColor('blue', colorMapForInit);
  updateBinPos();
  window.colorMap = colorMapForInit; // Store for global use
  window.allStatsItems = allStatsItems; // Store for global use
}

function updateStatCell(emoji) {
  const key = emoji.codePointAt(0).toString(16);
  const cnt = document.getElementById('cnt-' + key);
  const cell = document.getElementById('stat-' + key);
  if (!cnt || !cell) return;
  window.catchStats[emoji]++;
  cnt.textContent = window.catchStats[emoji];
  cell.classList.add('has-catch');
  // bump animation
  cnt.classList.remove('stat-bump');
  void cnt.offsetWidth; // reflow
  cnt.classList.add('stat-bump');
}

function resetStats() {
  Object.keys(window.catchStats).forEach(k => { window.catchStats[k] = 0; });
  window.allStatsItems.forEach(item => {
    const key = item.emoji.codePointAt(0).toString(16);
    const cnt = document.getElementById('cnt-' + key);
    const cell = document.getElementById('stat-' + key);
    if (cnt) cnt.textContent = '0';
    if (cell) cell.classList.remove('has-catch');
  });
}

// =============================================
//  STATE
// =============================================
let score = 0;
let timeLeft = 60;
let gameRunning = false;
let binX = 180; // center of game area
const GAME_W = 360;
const BIN_W = 64;
const TRASH_W = 44;
const GROUND_Y = 610; // pixel from top where trash is "caught" (700 - 90)
const MISS_Y   = 720;

let binColorId = 'blue';
let binColorTimer = 0;
let binColorChangeSec = 15;

let trashList = [];
let trashIdCounter = 0;
let baseFallSpeed = 1.6;
let spawnCooldown = 0;          // ms remaining before next spawn allowed
let comboCount = 0;

let lastTime = null;
let binColorAccum = 0;

let rafId = null;

// DOM
const gameArea   = document.getElementById('game-area');
const binWrap    = document.getElementById('bin-wrap');
const scoreEl    = document.getElementById('score-value');
const deltaEl    = document.getElementById('score-delta');
const timerEl    = document.getElementById('timer-value');
const timerBar   = document.getElementById('timer-bar');
const overlay    = document.getElementById('overlay');
const btnStart   = document.getElementById('btn-start');
const swatchEl   = document.getElementById('bin-swatch');
const colorNameEl= document.getElementById('bin-color-name');
const comboBadge = document.getElementById('combo-badge');
const comboNum   = document.getElementById('combo-num');
const binSvg     = document.getElementById('bin-svg');
const binCountdownEl = document.getElementById('bin-color-countdown');

// Bin SVG coloring
function setBinColor(colorId, colorMapToUse) {
  const colorMap = colorMapToUse || window.colorMap;
  binColorId = colorId;
  const c = colorMap[colorId];
  ['bin-lid','bin-handle','bin-body','stripe1','stripe2','stripe3'].forEach(id => {
    const el = document.getElementById(id);
    if (id.startsWith('stripe')) {
      el.setAttribute('fill','rgba(0,0,0,.18)');
    } else {
      el.setAttribute('fill', c.hex);
    }
  });
  binSvg.style.filter = `drop-shadow(0 0 14px ${c.shadowHex})`;
  swatchEl.style.background = c.hex;
  swatchEl.style.boxShadow = `0 0 14px ${c.shadowHex}`;
  colorNameEl.style.color = c.hex;
  colorNameEl.textContent = c.label;
}

// =============================================
//  TRASH MANAGEMENT
// =============================================

// Pick X with zone-based anti-clustering
function pickSpawnX() {
  const ZONES = 6;
  const margin = 12;
  const usable = GAME_W - TRASH_W - margin * 2;   // ~292px
  const zoneW  = usable / ZONES;                   // ~48.7px

  // Count how many active trash are in the upper half of each zone
  const zoneLoad = new Array(ZONES).fill(0);
  trashList.forEach(t => {
    if (t.y < GROUND_Y * 0.6) {   // only count "upcoming" trash, not nearly-caught ones
      const zi = Math.floor((t.x - margin) / zoneW);
      if (zi >= 0 && zi < ZONES) zoneLoad[zi]++;
    }
  });

  // Find minimum load; collect all zones at that load
  const minLoad = Math.min(...zoneLoad);
  const candidates = zoneLoad
    .map((load, i) => ({ load, i }))
    .filter(z => z.load === minLoad)
    .map(z => z.i);

  // Pick a random zone from least-loaded candidates
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  // Random X within chosen zone, with inner padding to avoid wall-hugging
  const zoneStart = margin + chosen * zoneW;
  const pad = zoneW * 0.12;
  return zoneStart + pad + Math.random() * (zoneW - pad * 2);
}

function spawnTrash() {
  const s = GAME_DATA.settings;
  const roll = Math.random();
  let item, isTrap = false;

  if (roll < s.chanceMatch) {
    // 50% — match bin color
    const pool = GAME_DATA.trashItems.filter(t => t.colorId === binColorId);
    item = pool[Math.floor(Math.random() * pool.length)];
  } else if (roll < s.chanceMatch + s.chanceMiss) {
    // 40% — wrong color
    const pool = GAME_DATA.trashItems.filter(t => t.colorId !== binColorId);
    item = pool[Math.floor(Math.random() * pool.length)];
  } else {
    // 10% — trap
    isTrap = true;
    item = GAME_DATA.trapItems[Math.floor(Math.random() * GAME_DATA.trapItems.length)];
  }

  const x = pickSpawnX();
  const id = trashIdCounter++;

  // Trap: orange/red glow; normal trash: their color
  const hexColor  = isTrap ? '#FF6D00' : window.colorMap[item.colorId].hex;
  const shadowHex = isTrap ? 'rgba(255,109,0,0.9)' : window.colorMap[item.colorId].shadowHex;

  // Individual speed: baseFallSpeed ± fallSpeedVariation
  const v = GAME_DATA.settings.fallSpeedVariation;
  const speed = baseFallSpeed * (1 - v + Math.random() * v * 2);

  const el = document.createElement('div');
  el.className = 'trash' + (isTrap ? ' trap-item' : '');
  el.id = 'trash-' + id;
  el.textContent = item.emoji;
  el.style.left = x + 'px';
  el.style.top = '-50px';
  el.style.color = hexColor;
  el.style.background = hexColor + '22';
  el.style.border = `2px solid ${hexColor}`;
  el.style.boxShadow = `0 0 12px ${shadowHex}`;
  if (isTrap) {
    el.style.animation = 'wobble 0.5s ease-in-out infinite alternate';
  }
  gameArea.appendChild(el);

  trashList.push({ id, el, x, y: -50, colorId: isTrap ? null : item.colorId,
                   isTrap, emoji: item.emoji, speed });
}

function removeTrash(id) {
  trashList = trashList.filter(t => t.id !== id);
  const el = document.getElementById('trash-' + id);
  if (el) el.remove();
}

// =============================================
//  SCORE POPUP
// =============================================
let deltaTimeout = null;
function showScoreDelta(pts, x, y) {
  const pop = document.createElement('div');
  pop.className = 'score-pop';
  pop.style.left = (x + 5) + 'px';
  pop.style.top  = (y - 20) + 'px';
  pop.style.color = pts > 0 ? '#00E676' : '#FF1744';
  pop.textContent = (pts > 0 ? '+' : '') + pts;
  gameArea.appendChild(pop);
  setTimeout(() => pop.remove(), 800);

  // side panel delta
  clearTimeout(deltaTimeout);
  deltaEl.className = pts > 0 ? 'pos' : 'neg';
  deltaEl.textContent = (pts > 0 ? '+' : '') + pts;
  deltaTimeout = setTimeout(() => { deltaEl.textContent = ''; }, 900);
}

function flashMiss() {
  const fl = document.createElement('div');
  fl.className = 'miss-flash';
  gameArea.appendChild(fl);
  setTimeout(() => fl.remove(), 350);
}

function flashTrap() {
  const fl = document.createElement('div');
  fl.className = 'miss-flash';
  fl.style.background = 'rgba(255,109,0,.28)';
  gameArea.appendChild(fl);
  setTimeout(() => fl.remove(), 500);
  // shake game area
  gameArea.style.transform = 'translateX(-6px)';
  setTimeout(() => { gameArea.style.transform = 'translateX(6px)'; }, 80);
  setTimeout(() => { gameArea.style.transform = 'translateX(-4px)'; }, 160);
  setTimeout(() => { gameArea.style.transform = 'translateX(0)'; }, 240);
}

// =============================================
//  BIN MOVEMENT (mouse / touch)
// =============================================
function clampBinX(x) {
  return Math.max(BIN_W/2, Math.min(GAME_W - BIN_W/2, x));
}

gameArea.addEventListener('mousemove', e => {
  if (!gameRunning) return;
  const rect = gameArea.getBoundingClientRect();
  binX = clampBinX(e.clientX - rect.left);
  updateBinPos();
});

gameArea.addEventListener('touchmove', e => {
  if (!gameRunning) return;
  e.preventDefault();
  const rect = gameArea.getBoundingClientRect();
  binX = clampBinX(e.touches[0].clientX - rect.left);
  updateBinPos();
}, { passive: false });

// Keyboard
const keys = {};
document.addEventListener('keydown', e => { keys[e.key] = true; });
document.addEventListener('keyup',   e => { keys[e.key] = false; });

function handleKeyboard(dt) {
  const spd = 5;
  if (keys['ArrowLeft']  || keys['a'] || keys['A']) binX = clampBinX(binX - spd);
  if (keys['ArrowRight'] || keys['d'] || keys['D']) binX = clampBinX(binX + spd);
  updateBinPos();
}

function updateBinPos() {
  binWrap.style.left = (binX - BIN_W/2) + 'px';
  binWrap.style.transform = 'none';
}

// =============================================
//  MAIN LOOP
// =============================================
function gameLoop(ts) {
  if (!gameRunning) return;
  if (!lastTime) lastTime = ts;
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;

  handleKeyboard(dt);

  // Linear scale base fall speed: fallSpeedStart → fallSpeedEnd over gameDuration
  const elapsed = GAME_DATA.settings.gameDuration - timeLeft;
  const s = GAME_DATA.settings;
  const tProgress = Math.min(elapsed / s.gameDuration, 1);
  baseFallSpeed = s.fallSpeedStart + tProgress * (s.fallSpeedEnd - s.fallSpeedStart);

  // Count-based spawning: spawn 1 per cooldown tick, build up to maxOnScreen gradually
  spawnCooldown -= dt;
  if (trashList.length < s.maxOnScreen && spawnCooldown <= 0) {
    spawnTrash();
    spawnCooldown = s.spawnCooldownMs;
  }

  // Bin color change
  binColorAccum += dt;
  const binSecsLeft = Math.ceil((binColorChangeSec * 1000 - binColorAccum) / 1000);
  binCountdownEl.textContent = `${binSecsLeft}s`;
  binCountdownEl.style.color = binSecsLeft <= 3 ? window.colorMap[binColorId].hex : 'var(--dim)';
  if (binColorAccum >= binColorChangeSec * 1000) {
    binColorAccum = 0;
    const others = GAME_DATA.colors.filter(c => c.id !== binColorId);
    const next = others[Math.floor(Math.random() * others.length)];
    setBinColor(next.id);
  }

  // Update timer
  timeLeft -= dt / 1000;
  if (timeLeft <= 0) {
    timeLeft = 0;
    endGame();
    return;
  }
  timerEl.textContent = Math.ceil(timeLeft);
  timerBar.style.width = (timeLeft / GAME_DATA.settings.gameDuration * 100) + '%';
  if (timeLeft < 10) {
    timerBar.style.background = 'linear-gradient(90deg, #FF1744, #FF6D00)';
  }

  // Move trash
  for (let i = trashList.length - 1; i >= 0; i--) {
    const t = trashList[i];
    t.y += t.speed * dt / 16;
    t.el.style.top = t.y + 'px';

    // Check catch
    if (t.y + TRASH_W >= GROUND_Y) {
      const trashCenter = t.x + TRASH_W / 2;
      const binLeft  = binX - BIN_W / 2 - 8;
      const binRight = binX + BIN_W / 2 + 8;

      if (trashCenter >= binLeft && trashCenter <= binRight) {
        // Caught!
        let pts;
        if (t.isTrap) {
          // Trap caught — always penalty
          const trapDef = GAME_DATA.trapItems.find(ti => ti.emoji === t.emoji);
          pts = trapDef ? trapDef.scoreTrap : -30;
          comboCount = 0;
          updateCombo();
          flashMiss();
          flashTrap();
        } else {
          const c = window.colorMap[t.colorId];
          if (t.colorId === binColorId) {
            pts = c.scoreMatch * (comboCount > 0 ? Math.min(3, 1 + comboCount * 0.3) : 1);
            pts = Math.round(pts);
            comboCount++;
            updateCombo();
          } else {
            pts = c.scoreMiss;
            comboCount = 0;
            updateCombo();
            flashMiss();
          }
        }
        score += pts;
        if (score < 0) score = 0;
        scoreEl.textContent = score;
        showScoreDelta(pts, t.x, t.y);
        updateStatCell(t.emoji);
        removeTrash(t.id);
      } else if (t.y > MISS_Y) {
        // Fell off
        comboCount = 0;
        updateCombo();
        removeTrash(t.id);
      }
    }
  }

  rafId = requestAnimationFrame(gameLoop);
}

function updateCombo() {
  if (comboCount >= 2) {
    comboBadge.style.display = 'block';
    comboNum.textContent = comboCount;
  } else {
    comboBadge.style.display = 'none';
  }
}

// =============================================
//  START / END
// =============================================
function startGame() {
  score = 0;
  timeLeft = GAME_DATA.settings.gameDuration;
  trashList.forEach(t => t.el.remove());
  trashList = [];
  baseFallSpeed = GAME_DATA.settings.fallSpeedStart;
  spawnCooldown = 0;
  binColorAccum = 0;
  comboCount = 0;
  lastTime = null;
  binX = GAME_W / 2;
  updateBinPos();

  const startColor = GAME_DATA.colors[Math.floor(Math.random() * GAME_DATA.colors.length)];
  setBinColor(startColor.id);

  scoreEl.textContent = '0';
  timerEl.textContent = GAME_DATA.settings.gameDuration;
  timerBar.style.width = '100%';
  timerBar.style.background = 'linear-gradient(90deg, var(--blue), var(--green))';
  comboBadge.style.display = 'none';
  binCountdownEl.textContent = `15s`;
  resetStats();

  overlay.style.display = 'none';
  gameRunning = true;
  rafId = requestAnimationFrame(gameLoop);
}

function endGame() {
  gameRunning = false;
  cancelAnimationFrame(rafId);
  trashList.forEach(t => t.el.remove());
  trashList = [];

  overlay.innerHTML = `
    <h1>⏰ หมดเวลา!</h1>
    <div class="sub">คะแนนสุดท้าย</div>
    <div class="final-score">${score}</div>
    <div class="sub">${getScoreMessage(score)}</div>
    <button id="btn-start" onclick="startGame()">▶ เล่นอีกครั้ง</button>
  `;
  overlay.style.display = 'flex';
}

function getScoreMessage(s) {
  if (s >= 400) return '🏆 ยอดเยี่ยมมาก! ยอดนักรีไซเคิล!';
  if (s >= 250) return '🌟 เก่งมาก! ช่วยโลกได้เยอะเลย!';
  if (s >= 100) return '👍 ไม่เลวนะ ฝึกเพิ่มอีกหน่อย!';
  return '🌱 ยังพอฝึกได้อีก สู้ต่อไป!';
}

btnStart.addEventListener('click', startGame);

function goHome() {
  window.location.href = '../index.html';
}
