// Load game data
let GAME_DATA = {};
let CRAFT_DATA = {
  successRate: 0.25,
  failRate: 0.75,
  recipes: []
};

window.upcycleInventory = {};

Promise.all([
  fetch('./config/data.json').then(res => res.json()),
  fetch('./config/craft.json').then(res => res.json())
])
  .then(([gameData, craftData]) => {
    GAME_DATA = gameData;
    CRAFT_DATA = craftData;
    console.log('Loaded GAME_DATA:', GAME_DATA.trashItems.map(item => ({ label: item.label, image: item.image })));
    initGame(); // Initialize game after data loads
  })
  .catch(err => {
    console.error('Failed to load game configuration:', err);
    initGame();
  });

// =============================================
//  BUILD STATS GRID
// =============================================
function getItemImage(item, preventCache = false) {
  const basePath = item.image || 'images/1.png';
  if (preventCache) {
    return basePath + '?v=' + Date.now();
  }
  return basePath;
}

function getItemKey(item) {
  return item.emoji || item.label;
}

function getStatId(key) {
  return 'stat-' + encodeURIComponent(key);
}

function getCountId(key) {
  return 'cnt-' + encodeURIComponent(key);
}

function initGame() {
  const colorMap = {};
  GAME_DATA.colors.forEach(c => { colorMap[c.id] = c; });

  // Build stats grid — all trash + trap items
  const statsGrid = document.getElementById('stats-grid');
  const allStatsItems = [
    ...GAME_DATA.trashItems.map(t => ({ ...t, isTrap: false })),
    ...GAME_DATA.trapItems.map(t => ({ ...t, isTrap: true }))
  ];
  window.catchStats = {}; // key → count

  allStatsItems.forEach(item => {
    const key = getItemKey(item);
    window.catchStats[key] = 0;
    const cell = document.createElement('div');
    cell.className = 'stat-cell' + (item.isTrap ? ' trap-cell' : '');
    cell.id = getStatId(key);
    if (item.isTrap) {
      cell.innerHTML = `
        <div class="stat-emoji">${item.emoji}</div>
        <div class="stat-label">${item.label}</div>
        <div class="stat-count" id="${getCountId(key)}">0</div>
      `;
    } else {
      const img = document.createElement('img');
      img.className = 'stat-image';
      img.src = getItemImage(item);
      img.alt = item.label;
      cell.innerHTML = `
        <div class="stat-image-wrap"></div>
        <div class="stat-label">${item.label}</div>
        <div class="stat-count" id="${getCountId(key)}">0</div>
      `;
      cell.querySelector('.stat-image-wrap').appendChild(img);
      const c = colorMap[item.colorId];
      cell.style.boxShadow = `inset -3px 0 6px ${c.shadowHex}`;
    }
    statsGrid.appendChild(cell);
  });

  // Set up initial display
  const colorMapForInit = {};
  GAME_DATA.colors.forEach(c => { colorMapForInit[c.id] = c; });
  const randomStartColor = GAME_DATA.colors[Math.floor(Math.random() * GAME_DATA.colors.length)];
  setBinColor(randomStartColor.id, colorMapForInit);
  updateBinPos();
  window.colorMap = colorMapForInit; // Store for global use
  window.allStatsItems = allStatsItems; // Store for global use
}

function updateStatCell(key) {
  const cnt = document.getElementById(getCountId(key));
  const cell = document.getElementById(getStatId(key));
  if (!cnt || !cell) return;
  window.catchStats[key]++;
  cnt.textContent = window.catchStats[key];
  cell.classList.add('has-catch');
  // bump animation
  cnt.classList.remove('stat-bump');
  void cnt.offsetWidth; // reflow
  cnt.classList.add('stat-bump');
}

function resetStats() {
  Object.keys(window.catchStats).forEach(k => { window.catchStats[k] = 0; });
  window.allStatsItems.forEach(item => {
    const key = getItemKey(item);
    const cnt = document.getElementById(getCountId(key));
    const cell = document.getElementById(getStatId(key));
    if (cnt) cnt.textContent = '0';
    if (cell) cell.classList.remove('has-catch');
  });
}

function buildUpcycleInventory() {
  const trappedKeys = new Set(GAME_DATA.trapItems.map(getItemKey));
  const itemCounts = {};

  for (const key in window.catchStats) {
    const count = window.catchStats[key];
    if (count > 0 && !trappedKeys.has(key)) {
      itemCounts[key] = count;
    }
  }

  return itemCounts;
}

function renderUpcycleInventory(itemCounts) {
  const upcycleDisplay = document.getElementById('upcycle-display');
  if (!upcycleDisplay) return;

  upcycleDisplay.innerHTML = '';

  let delayIndex = 0;
  GAME_DATA.trashItems.forEach(item => {
    const key = getItemKey(item);
    const count = itemCounts[key] || 0;
    if (count > 0) {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'upcycle-item-group';
      itemDiv.style.animationDelay = (delayIndex * 0.1) + 's';
      const img = document.createElement('img');
      img.className = 'upcycle-image';
      img.src = getItemImage(item);
      img.alt = item.label;
      itemDiv.innerHTML = `
        <div class="upcycle-image-wrap"></div>
        <div class="upcycle-count">${count}</div>
      `;
      itemDiv.querySelector('.upcycle-image-wrap').appendChild(img);
      const c = window.colorMap[item.colorId];
      itemDiv.style.boxShadow = `inset -3px 0 6px ${c.shadowHex}`;
      upcycleDisplay.appendChild(itemDiv);
      delayIndex++;
    }
  });
}

function refreshFinalScoreDisplay() {
  scoreEl.textContent = score;
  const finalScoreEl = document.getElementById('final-score-value');
  if (finalScoreEl) finalScoreEl.textContent = score;
}

function showCraftResult(message, type) {
  const resultEl = document.getElementById('craft-status-top');
  if (resultEl) {
    resultEl.textContent = message;
    resultEl.className = type ? type : '';
    resultEl.id = 'craft-status-top';
    return;
  }

  // Fallback in case top zone is not rendered yet
  const legacyResultEl = document.getElementById('craft-result');
  if (!legacyResultEl) return;
  legacyResultEl.textContent = message;
  legacyResultEl.className = `craft-result ${type}`;
}

function canCraftRecipe(recipe) {
  const requiredItems = Object.keys(recipe.require || {});
  return requiredItems.every(itemLabel => {
    const required = recipe.require[itemLabel] || 0;
    const available = window.upcycleInventory[itemLabel] || 0;
    return available >= required;
  });
}

function consumeRecipeItems(recipe) {
  const requiredItems = Object.keys(recipe.require || {});
  requiredItems.forEach(itemLabel => {
    const required = recipe.require[itemLabel] || 0;
    window.upcycleInventory[itemLabel] = Math.max(0, (window.upcycleInventory[itemLabel] || 0) - required);

    // Keep left stats panel in sync with crafting material usage
    if (window.catchStats && Object.prototype.hasOwnProperty.call(window.catchStats, itemLabel)) {
      window.catchStats[itemLabel] = Math.max(0, (window.catchStats[itemLabel] || 0) - required);
      const countEl = document.getElementById(getCountId(itemLabel));
      const cellEl = document.getElementById(getStatId(itemLabel));
      if (countEl) countEl.textContent = window.catchStats[itemLabel];
      if (cellEl && window.catchStats[itemLabel] === 0) {
        cellEl.classList.remove('has-catch');
      }
    }
  });
}

function getRecipeRequireText(recipe) {
  const requiredItems = Object.keys(recipe.require || {});
  return requiredItems.map(itemLabel => `${itemLabel} ${recipe.require[itemLabel]} ชิ้น`).join(' + ');
}

function renderCraftMenu() {
  const craftButtonsEl = document.getElementById('craft-buttons');
  if (!craftButtonsEl) return;

  craftButtonsEl.innerHTML = '';
  CRAFT_DATA.recipes.forEach(recipe => {
    const btn = document.createElement('button');
    btn.className = 'craft-btn';
    btn.disabled = !canCraftRecipe(recipe);
    btn.innerHTML = `
      <span class="craft-name">${recipe.name}</span>
      <span class="craft-need">ใช้ ${getRecipeRequireText(recipe)}</span>
    `;
    btn.addEventListener('click', () => attemptCraft(recipe.id));
    craftButtonsEl.appendChild(btn);
  });
}

function buildCraftSectionContent() {
  return `
    <div id="craft-buttons"></div>
  `;
}

function syncUpcycleOverlayBounds() {
  const upcycleContainer = document.getElementById('upcycle-container');
  if (!overlay || !upcycleContainer) return;

  if (overlay.classList.contains('upcycle-mode') && upcycleContainer.classList.contains('show')) {
    overlay.style.bottom = `${upcycleContainer.offsetHeight}px`;
  } else {
    overlay.style.bottom = '0';
  }
}

function toggleCraftMenu() {
  const craftSection = document.getElementById('craft-section');
  const openCraftBtn = document.getElementById('btn-open-craft');
  if (!craftSection || !openCraftBtn) return;

  const isOpen = craftSection.classList.toggle('show');
  if (isOpen) {
    craftSection.innerHTML = buildCraftSectionContent();
    openCraftBtn.textContent = '✖ ปิดเมนูแลกขยะ';
    renderCraftMenu();
    showCraftResult('เลือกรายการที่ต้องการผลิต', '');
  } else {
    craftSection.innerHTML = '';
    openCraftBtn.textContent = '♻️แลกขยะ';
  }

  syncUpcycleOverlayBounds();
}

function attemptCraft(recipeId) {
  const recipe = CRAFT_DATA.recipes.find(r => r.id === recipeId);
  if (!recipe) return;

  if (!canCraftRecipe(recipe)) {
    showCraftResult(`วัตถุดิบไม่พอสำหรับ ${recipe.name}`, 'fail');
    renderCraftMenu();
    return;
  }

  consumeRecipeItems(recipe);
  const success = Math.random() < (CRAFT_DATA.successRate || 0.25);

  if (success) {
    score += recipe.successScore;
    refreshFinalScoreDisplay();
    showCraftResult(`✅ ผลิต ${recipe.name} สำเร็จ! +${recipe.successScore} คะแนน`, 'success');
  } else {
    showCraftResult(`❌ ผลิต ${recipe.name} ไม่สำเร็จ (ใช้วัตถุดิบไปแล้ว)`, 'fail');
  }

  renderUpcycleInventory(window.upcycleInventory);
  renderCraftMenu();
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
let nextBinColorId = 'green';  // Color that will come next
let binColorTimer = 0;
let binColorChangeSec = 15;

let trashList = [];
let trashIdCounter = 0;
let baseFallSpeed = 1.6;
let spawnCooldown = 0;          // ms remaining before next spawn allowed
let comboCount = 0;

let lastTime = null;
let binColorAccum = 0;

let initialTrashSpawned = 0;    // count of trash spawned in initial phase
let initialSpawnNextTime = 0;  // ms timestamp for next initial spawn
let estimatedItemTravelTime = 6600; // ms for item to fall from -50 to GROUND_Y (estimated)
let initialSpawnInterval = 0;  // will be set to estimatedItemTravelTime / 5

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
const swatchNextEl = document.getElementById('bin-swatch-next');
const colorNameNextEl = document.getElementById('bin-color-name-next');
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
  
  // Pick and display next color
  const others = GAME_DATA.colors.filter(col => col.id !== colorId);
  const nextCol = others[Math.floor(Math.random() * others.length)];
  updateNextBinColor(nextCol.id, colorMap);
}

function updateNextBinColor(colorId, colorMapToUse) {
  const colorMap = colorMapToUse || window.colorMap;
  nextBinColorId = colorId;
  const c = colorMap[colorId];
  swatchNextEl.style.background = c.hex;
  swatchNextEl.style.boxShadow = `0 0 8px ${c.shadowHex}`;
  colorNameNextEl.style.color = c.hex;
  colorNameNextEl.textContent = c.label;
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
  const hexColor  = isTrap ? '#FF6D00' : 'rgba(0,0,0,0.7)';
  const shadowHex = 'rgba(0,0,0,0.3)'; // Light gray shadow for all trash

  // Individual speed: baseFallSpeed ± fallSpeedVariation
  const v = GAME_DATA.settings.fallSpeedVariation;
  const speed = baseFallSpeed * (1 - v + Math.random() * v * 2);

  const el = document.createElement('div');
  el.className = 'trash' + (isTrap ? ' trap-item' : '');
  el.id = 'trash-' + id;
  if (isTrap) {
    el.textContent = item.emoji;
  } else {
    const imgSrc = getItemImage(item);
    console.log('Spawning trash:', item.label, 'with image:', imgSrc);
    el.innerHTML = `<img class="trash-img" src="${imgSrc}" alt="${item.label}" />`;
  }
  el.style.left = x + 'px';
  el.style.top = '-50px';
  el.style.color = hexColor;
  el.style.background = 'rgba(0,0,0,0.1)';
  el.style.border = '2px solid rgba(0,0,0,0.2)';
  el.style.boxShadow = `0 0 12px ${shadowHex}`;
  if (isTrap) {
    el.style.animation = 'wobble 0.5s ease-in-out infinite alternate';
  }
  gameArea.appendChild(el);

  trashList.push({ id, el, x, y: -50, colorId: isTrap ? null : item.colorId,
                   isTrap, statKey: getItemKey(item), emoji: item.emoji || null, speed });
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

  // Spawning: initial 5 items spaced evenly, then on-demand to maintain maxOnScreen
  const currentGameTime = GAME_DATA.settings.gameDuration * 1000 - timeLeft * 1000; // ms since game start
  
  if (initialTrashSpawned < 5) {
    // Initial phase: spawn 5 items evenly spaced
    if (currentGameTime >= initialSpawnNextTime) {
      spawnTrash();
      initialTrashSpawned++;
      initialSpawnNextTime = currentGameTime + initialSpawnInterval;
    }
  } else {
    // On-demand phase: spawn when count drops below maxOnScreen
    if (trashList.length < s.maxOnScreen) {
      spawnTrash();
    }
  }

  // Bin color change
  binColorAccum += dt;
  const binSecsLeft = Math.ceil((binColorChangeSec * 1000 - binColorAccum) / 1000);
  binCountdownEl.textContent = `${binSecsLeft}s`;
  binCountdownEl.style.color = binSecsLeft <= 3 ? window.colorMap[binColorId].hex : 'var(--dim)';
  if (binColorAccum >= binColorChangeSec * 1000) {
    binColorAccum = 0;
    const nextColor = nextBinColorId || 'blue';
    setBinColor(nextColor);
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

    // Check catch - only lid area
    if (t.y + TRASH_W >= GROUND_Y) {
      const trashLeft = t.x;
      const trashRight = t.x + TRASH_W;
      // Lid area: width matching bin lid
      const lidLeft  = binX - BIN_W / 2;
      const lidRight = binX + BIN_W / 2;
      const lidTop = GROUND_Y - 25; // Lid height range (25px from ground)

      if (trashRight >= lidLeft && trashLeft <= lidRight && t.y <= lidTop) {
        // Caught on lid!
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
        updateStatCell(t.statKey);
        removeTrash(t.id);
      } else if (t.y > MISS_Y) {
        // Fell off completely
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
  initialTrashSpawned = 0;  // Reset initial phase
  initialSpawnNextTime = 0; // First item spawns immediately
  initialSpawnInterval = estimatedItemTravelTime / 5; // Divide travel time into 5 equal intervals
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
  document.getElementById('upcycle-container').classList.remove('show');
  syncUpcycleOverlayBounds();
  window.upcycleInventory = {};
  gameRunning = true;
  rafId = requestAnimationFrame(gameLoop);
}

function endGame() {
  gameRunning = false;
  cancelAnimationFrame(rafId);
  trashList.forEach(t => t.el.remove());
  trashList = [];

  overlay.classList.remove('upcycle-mode');
  overlay.innerHTML = `
    <h1>⏰ หมดเวลา!</h1>
    <div class="sub">คะแนนสุดท้าย</div>
    <div class="final-score">${score}</div>
    <div class="sub">${getScoreMessage(score)}</div>
    <div class="btn-action-group">
      <button class="btn-action" onclick="startGame()">▶เล่นใหม่</button>
      <button class="btn-action" onclick="showUpcycleResult()">♻️แลกขยะ</button>
    </div>
  `;
  overlay.style.display = 'flex';
  syncUpcycleOverlayBounds();
}

function showUpcycleResult() {
  const upcycleContainer = document.getElementById('upcycle-container');
  const craftSection = document.getElementById('craft-section');
  const openCraftBtn = document.getElementById('btn-open-craft');
  window.upcycleInventory = buildUpcycleInventory();
  renderUpcycleInventory(window.upcycleInventory);
  
  // Update overlay with game results and buttons
  overlay.classList.add('upcycle-mode');
  overlay.innerHTML = `
    <div class="final-score" id="final-score-value">${score}</div>
    <div id="craft-status-top"></div>
    <div class="btn-action-group">
      <button class="btn-action" onclick="startGame()">▶เล่นใหม่</button>
      <button class="btn-action" onclick="goHome()">🏠กลับแรก</button>
    </div>
  `;
  overlay.style.display = 'flex';
  upcycleContainer.classList.add('show');

  if (craftSection) {
    craftSection.classList.add('show');
    craftSection.innerHTML = buildCraftSectionContent();
    renderCraftMenu();
    showCraftResult('เลือกรายการที่ต้องการผลิต', '');
  }
  if (openCraftBtn) {
    openCraftBtn.textContent = '✖ ปิดเมนูแลกขยะ';
  }

  syncUpcycleOverlayBounds();
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

window.attemptCraft = attemptCraft;
window.toggleCraftMenu = toggleCraftMenu;
