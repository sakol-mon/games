// ตัวแปรสำหรับเก็บสถานะเกม
let cardsData = [];
let gameCards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let canFlip = true;

let timerInterval = null;
let elapsedSeconds = 0;
let timerStarted = false;

const LEADERBOARD_KEY = 'mitrGreenLeaderboard';
let leaderboard = [];

function sortBoard(a, b) {
    if (a.moves !== b.moves) return a.moves - b.moves;
    return a.timeSeconds - b.timeSeconds;
}

function saveLeaderboard() {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

async function loadLeaderboard() {
    let scores = [];

    // First, try load from Supabase if available
    if (window.getLeaderboard) {
        try {
            scores = await window.getLeaderboard('mitrGreen');
        } catch (error) {
            console.warn('Cannot load leaderboard from Supabase:', error);
        }
    }

    // Fallback to local leaderboard if Supabase not available or empty
    if (!scores || !scores.length) {
        const saved = localStorage.getItem(LEADERBOARD_KEY);
        if (saved) {
            try {
                leaderboard = JSON.parse(saved);
                if (Array.isArray(leaderboard)) {
                    scores = leaderboard.map((item) => ({
                        player_name: item.name,
                        score: item.moves,
                        time: item.timeSeconds,
                        played_at: item.date
                    }));
                }
            } catch {
                // ignore
            }
        }
    }

    renderLeaderboard(scores || []);
}

function addLeaderboardRecord(moves, timeSeconds, name='ผู้เล่น') {
    const recordName = name.trim() || 'ผู้เล่น';
    const record = {
        name: recordName,
        moves,
        timeSeconds,
        time: formatTime(timeSeconds),
        date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    };
    const exists = leaderboard.some(item => item.moves === moves && item.timeSeconds === timeSeconds && item.name === record.name);
    if (!exists) {
        leaderboard.push(record);
    }
    leaderboard.sort(sortBoard);
    leaderboard = leaderboard.slice(0, 5);
    saveLeaderboard();
    renderLeaderboard();
}

// ส่งคะแนนไป Supabase เมื่อมี config
async function submitScoreToSupabase(score, timeSeconds, playerName) {
    if (window.insertScore) {
        try {
            await window.insertScore({
                game_id: 'mitrGreen',
                player_name: playerName,
                score: score,
                time: timeSeconds
            });
        } catch (error) {
            console.warn('Supabase insert error:', error);
        }
    }
}


function renderLeaderboard(scores = []) {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = '';

    if (!scores.length) {
        list.insertAdjacentHTML('beforeend', '<li>ยังไม่มีคะแนน</li>');
        return;
    }

    scores.slice(0, 10).forEach((item, index) => {
        const name = item.player_name || 'ผู้เล่น';
        const score = item.score ?? item.moves ?? 0;
        const time = item.time ?? formatTime(item.timeSeconds ?? 0);
        const played_at = item.played_at || item.date || '';

        list.insertAdjacentHTML('beforeend', `<li>${index + 1}. ${name} - คะแนน: ${score}, เวลา: ${time}${played_at ? ' (' + played_at + ')' : ''}</li>`);
    });
}

function clearLeaderboard() {
    leaderboard = [];
    saveLeaderboard();
    renderLeaderboard();
}

// เริ่มต้นเกม
async function initGame() {
    const playerName = sessionStorage.getItem('player_name');

    if (!playerName || !playerName.trim()) {
        alert('กรุณาตั้งชื่อก่อนเล่นเกม');
        window.location.href = '../index.html';
        return;
    }


    try {
        // โหลดข้อมูลการ์ดจากไฟล์ JSON
        const response = await fetch('cards.json');
        const data = await response.json();
        cardsData = data.cards;
        
        // รีเฟรชแสดงชื่อผู้เล่น
        renderPlayerName();

        // สุ่มลำดับการ์ด
        shuffleCards();
        
        // สร้างการ์ดบนหน้าจอ
        renderCards();
        
        // รีเซ็ตสถิติ
        resetTimer();
        updateStats();
        await loadLeaderboard();
        setupRealtimeSubscription();
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', error);
        alert('ไม่สามารถโหลดข้อมูลเกมได้ กรุณาตรวจสอบไฟล์ cards.json');
    }
}

function renderPlayerName() {
    const playerName = sessionStorage.getItem('player_name') || '';
    const display = document.getElementById('player-name-display');
    if (display) {
        if (playerName) {
            display.textContent = `ผู้เล่น: ${playerName}`;
        } else {
            display.textContent = '';
        }
    }
}

function setupRealtimeSubscription() {
    if (window.subscribeLeaderboard) {
        window.subscribeLeaderboard('mitrGreen', (newRecord) => {
            console.log('Realtime score update:', newRecord);
            loadLeaderboard();
        });
    }
}

// สุ่มลำดับการ์ด (Fisher-Yates)
function shuffleCards() {
    gameCards = [...cardsData];
    for (let i = gameCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameCards[i], gameCards[j]] = [gameCards[j], gameCards[i]];
    }
}

// สร้างการ์ดบนหน้าจอ
function renderCards() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    
    gameCards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.index = index;
        cardElement.dataset.pairId = card.pairId;
        cardElement.dataset.type = card.type;
        
        // สร้างด้านหลังการ์ด (ใช้รูปภาพ cover.png จาก CSS)
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';
        
        // สร้างด้านหน้าการ์ด
        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        
        // สำหรับเกม mitrGreen เราแสดงภาพด้านหน้าเพียงอย่างเดียว
        cardFront.innerHTML = `<img src="${card.image}" alt="Card Image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'">`;
        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';
        cardInner.appendChild(cardBack);
        cardInner.appendChild(cardFront);

        cardElement.appendChild(cardInner);
        cardElement.addEventListener('click', () => flipCard(index));
        
        gameBoard.appendChild(cardElement);
    });
}

// ฟังก์ชันเปิดการ์ด
function flipCard(index) {
    // ตรวจสอบว่าสามารถเปิดการ์ดได้หรือไม่
    if (!canFlip || flippedCards.length >= 2) return;
    
    const cardElement = document.querySelector(`[data-index="${index}"]`);
    
    // ตรวจสอบว่าการ์ดเปิดอยู่แล้วหรือไม่
    if (cardElement.classList.contains('flipped') || cardElement.classList.contains('matched')) {
        return;
    }
    
    // เปิดการ์ด
    cardElement.classList.add('flipped');
    flippedCards.push({ index, pairId: gameCards[index].pairId });
    
    // เริ่มจับเวลาเมื่อเปิดการ์ดใบแรก
    if (!timerStarted) {
        timerStarted = true;
        startTimer();
    }

    // ถ้าเปิดการ์ด 2 ใบแล้ว ตรวจสอบว่าตรงกันหรือไม่
    if (flippedCards.length === 2) {
        moves++;
        updateStats();
        canFlip = false;
        
        setTimeout(() => {
            checkMatch();
        }, 1000);
    }
}

// ตรวจสอบว่าการ์ดจับคู่กันหรือไม่
function checkMatch() {
    const [card1, card2] = flippedCards;
    const card1Element = document.querySelector(`[data-index="${card1.index}"]`);
    const card2Element = document.querySelector(`[data-index="${card2.index}"]`);
    
    if (card1.pairId === card2.pairId) {
        // จับคู่ถูกต้อง (คงหน้าไว้)
        card1Element.classList.add('flipped', 'matched');
        card2Element.classList.add('flipped', 'matched');
        matchedPairs++;
        
        // ตรวจสอบว่าจับคู่ครบทั้งหมดหรือยัง
        if (matchedPairs === cardsData.length / 2) {
            setTimeout(() => {
                showWinMessage();
            }, 500);
        }
    } else {
        // จับคู่ผิด - พลิกการ์ดกลับ
        setTimeout(() => {
            card1Element.classList.remove('flipped');
            card2Element.classList.remove('flipped');
        }, 500);
    }
    
    flippedCards = [];
    canFlip = true;
}

// จับเวลา
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

function updateTimerDisplay() {
    document.getElementById('timer').textContent = formatTime(elapsedSeconds);
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        elapsedSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function resetTimer() {
    stopTimer();
    elapsedSeconds = 0;
    timerStarted = false;
    updateTimerDisplay();
}

// แสดงข้อความชนะ
function showWinMessage() {
    stopTimer();
    timerStarted = false;
    const message = document.getElementById('win-message');
    document.getElementById('final-moves').textContent = moves;
    document.getElementById('final-time').textContent = formatTime(elapsedSeconds);
    message.style.display = 'flex';
}

function submitScore() {
    const playerName = sessionStorage.getItem('player_name') || 'ผู้เล่น';
    addLeaderboardRecord(moves, elapsedSeconds, playerName);
    submitScoreToSupabase(moves, elapsedSeconds, playerName);
    closeWinMessage();
    resetGame();
}

// ปิดข้อความชนะ
function closeWinMessage() {
    document.getElementById('win-message').style.display = 'none';
}

// รีเซ็ตเกม
function resetGame() {
    const previousOrder = gameCards.map(card => card.id).join(',');

    matchedPairs = 0;
    moves = 0;
    flippedCards = [];
    canFlip = true;

    closeWinMessage();
    resetTimer();
    shuffleCards();

    // If faultily same order (very unlikely), reshuffle once
    if (gameCards.map(card => card.id).join(',') === previousOrder) {
        shuffleCards();
    }

    renderCards();
    updateStats();
}

// อัพเดทสถิติ
function updateStats() {
    document.getElementById('moves').textContent = moves;
    document.getElementById('pairs').textContent = `${matchedPairs}/${cardsData.length / 2}`;
}

// เริ่มเกมเมื่อโหลดหน้าเว็บเสร็จ
window.addEventListener('DOMContentLoaded', initGame);

function goHome() {
    window.location.href = '../index.html';
}
