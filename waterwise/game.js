// Water Wise Game - Game Logic
// Ver 2.0

class WaterWiseGame {
    constructor() {
        this.water = 100; // เริ่มต้นน้ำ 100%
        this.totalTime = 60; // 60 วินาที
        this.remainingTime = 60;
        this.currentMission = 0;
        this.missionTimeLimit = 10; // 10 วินาทีต่อภารกิจ
        this.missionTimeRemaining = 10;
        this.ecoStreak = 0; // streak การเลือกแบบประหยัดติดกัน
        this.ecoChoices = 0; // จำนวนครั้งที่เลือกแบบประหยัด
        this.bonusCount = 0; // จำนวนโบนัสที่ได้รับ
        
        // Timers
        this.gameTimer = null;
        this.missionTimer = null;
        
        // Missions data - 10 ภารกิจ
        this.missions = [
            {
                title: "แปรงฟันตอนเช้า",
                choices: [
                    {
                        label: "🥛 ใช้แก้วรองน้ำ",
                        description: "เทน้ำลงแก้วใช้บ้วนปาก ประหยัดน้ำสุด!",
                        waterCost: 1,
                        isEco: true
                    },
                    {
                        label: "🚰 เปิดก๊อกทิ้งไว้",
                        description: "เปิดน้ำไหลตลอดจนกว่าจะแปรงเสร็จ",
                        waterCost: 10,
                        isEco: false
                    }
                ]
            },
            {
                title: "อาบน้ำชำระกาย",
                choices: [
                    {
                        label: "🚿 ใช้ฝักบัว (ปิดตอนถูสบู่)",
                        description: "เปิดน้ำเฉพาะตอนชำระล้าง ปิดตอนถูสบู่",
                        waterCost: 10,
                        isEco: true
                    },
                    {
                        label: "🛁 เปิดน้ำใส่อ่างอาบ",
                        description: "เติมน้ำเต็มอ่างแล้วจุ่มตัว",
                        waterCost: 40,
                        isEco: false
                    }
                ]
            },
            {
                title: "เลือกสบู่อาบน้ำ",
                choices: [
                    {
                        label: "🧴 ใช้สบู่เหลว",
                        description: "สบู่เหลวใช้ง่าย ล้างออกเร็ว",
                        waterCost: 12,
                        isEco: true
                    },
                    {
                        label: "🧼 ใช้สบู่ก้อน",
                        description: "สบู่ก้อนต้องล้างนานกว่าถึงจะหมดโฟม",
                        waterCost: 20,
                        isEco: false
                    }
                ]
            },
            {
                title: "การใช้ชักโครก",
                choices: [
                    {
                        label: "🚽 กดชักโครกแบบประหยัดน้ำ",
                        description: "กดปุ่มเล็กหรือใช้น้ำราด ประหยัดสุด!",
                        waterCost: 5,
                        isEco: true
                    },
                    {
                        label: "🚽 กดชักโครกแบบปกติ",
                        description: "กดปุ่มใหญ่ ใช้น้ำเต็มที่",
                        waterCost: 9,
                        isEco: false
                    }
                ]
            },
            {
                title: "ล้างจานหลังอาหาร",
                choices: [
                    {
                        label: "🍽️ กวาดเศษ แล้วล้างในอ่าง",
                        description: "เช็ดคราบออกก่อน แล้วล้างในอ่างรองน้ำ",
                        waterCost: 5,
                        isEco: true
                    },
                    {
                        label: "🚰 เปิดก๊อกล้างคราบโดยตรง",
                        description: "ปล่อยให้น้ำไหลผ่านตลอดเวลาที่ล้าง",
                        waterCost: 15,
                        isEco: false
                    }
                ]
            },
            {
                title: "ดื่มน้ำแก้กระหาย",
                choices: [
                    {
                        label: "💧 กดน้ำพอดีคำ",
                        description: "กดน้ำประมาณที่จะดื่มจริง ไม่เหลือทิ้ง",
                        waterCost: 1,
                        isEco: true
                    },
                    {
                        label: "🌊 กดน้ำล้นแก้ว/เททิ้ง",
                        description: "กดน้ำเต็มแก้วแล้วดื่มไม่หมด เททิ้งครึ่งแก้ว",
                        waterCost: 5,
                        isEco: false
                    }
                ]
            },
            {
                title: "ซักผ้า - เสื้อผ้า 1 ชุด",
                choices: [
                    {
                        label: "🤲 ซักมือในกะละมัง",
                        description: "ซักผ้าแค่ 1-2 ชิ้นด้วยมือในกะละมัง",
                        waterCost: 5,
                        isEco: true
                    },
                    {
                        label: "🌀 ใส่เครื่องซักผ้า",
                        description: "เปิดเครื่องซักผ้าซักแค่ 1 ชุด",
                        waterCost: 25,
                        isEco: false
                    }
                ]
            },
            {
                title: "รดน้ำต้นไม้ในสวน",
                choices: [
                    {
                        label: "♻️ ใช้น้ำจากการซักผ้า/ล้างจาน",
                        description: "นำน้ำที่ใช้แล้วมารดต้นไม้ ไม่เสียน้ำเพิ่ม!",
                        waterCost: 0,
                        isEco: true
                    },
                    {
                        label: "💦 ใช้สายยางรดด้วยน้ำประปา",
                        description: "เปิดสายยางรดน้ำสดจากก๊อกประปา",
                        waterCost: 20,
                        isEco: false
                    }
                ]
            },
            {
                title: "ล้างรถคันโปรด",
                choices: [
                    {
                        label: "🪣 ใช้ถังน้ำกับฟองน้ำ",
                        description: "ตักน้ำในถังมาเช็ดรถด้วยฟองน้ำ",
                        waterCost: 15,
                        isEco: true
                    },
                    {
                        label: "🚿 ใช้สายยางฉีดน้ำล้างรถ",
                        description: "ฉีดน้ำด้วยสายยางแรงดันสูงทั่วทั้งคัน",
                        waterCost: 35,
                        isEco: false
                    }
                ]
            },
            {
                title: "ถูบ้านสะอาดเอี่ยม",
                choices: [
                    {
                        label: "🧹 ใช้ถังซักม็อบถูพื้น",
                        description: "ใช้ถังน้ำซักม็อบถูพื้นทีละส่วน",
                        waterCost: 5,
                        isEco: true
                    },
                    {
                        label: "💦 ใช้สายยางฉีดพื้นหน้าบ้าน",
                        description: "ฉีดน้ำแรงๆ ล้างพื้นหน้าบ้านทั้งหมด",
                        waterCost: 20,
                        isEco: false
                    }
                ]
            }
        ];

        // Rankings
        this.rankings = [
            {
                min: 0,
                max: 0,
                icon: "💀",
                rank: "นักล้างผลาญ (The Water Waster)",
                description: "จบเห๊! คุณเปิดน้ำทิ้งกว้างเหมือนมีเขื่อนอยู่หลังบ้าน ตอนนี้ทั้งบ้านไม่มีน้ำเหลือสักหยด จานก็ไม่ได้ล้าง ตัวก็ยังเหนียว แถมพรุ่งนี้เช้าจะเอาที่ไหนล้างหน้า? คืนนี้โชคดีนะ...",
                status: "💀 ติดลบ (ติดค่าน้ำมหาศาล)",
                statusColor: "#ef4444"
            },
            {
                min: 1,
                max: 39,
                icon: "⚠️",
                rank: "คนเกือบแห้ง (The Barely Safe)",
                description: "รอดแบบทุลักทุเล! แม้น้ำจะเหลือติดก้นถังพอให้ล้างมือได้บ้าง แต่สารภาพมาเหอะว่าคุณแอบใช้สายยางฉีดรถเพลินไปหน่อยใช่ไหม? พรุ่งนี้ห้ามพลาดแบบนี้อีกนะ น้ำมันแพง!",
                status: "⚠️ อันตราย (พรุ่งนี้ห้ามซักผ้าเด็ดขาด)",
                statusColor: "#f59e0b"
            },
            {
                min: 40,
                max: 79,
                icon: "✅",
                rank: "ลูกกตัญญูรักษ์น้ำ (The Smart Saver)",
                description: "ทำดีมาก! คุณรู้จักเลือกใช้แก้วรองน้ำและใช้บัวรดน้ำแทนสายยาง น้ำที่เหลือเยอะขนาดนี้เอาไปซักผ้ากองโตได้สบายๆ หรือจะเอาไปสำรองไว้ใช้ล้างจานมื้อถัดไปก็ยังได้ สมาชิกดีเด่นของบ้านจริงๆ!",
                status: "✅ ยอดเยี่ยม (บิลค่าน้ำลดฮวบ)",
                statusColor: "#10b981"
            },
            {
                min: 80,
                max: 100,
                icon: "🌟",
                rank: "สุดยอดปรมาจารย์ประหยัดน้ำ (The Eco-Hero)",
                description: "คุณคือที่หนึ่ง! การเลือกใช้ถังรองน้ำและปิดก๊อกทุกครั้งที่ไม่ได้ใช้ทำให้คุณเหลือน้ำเกือบเต็มถัง คุณสามารถใช้ชีวิตได้ปกติเหมือนไม่มีวิกฤตท่อแตกเลย คนแบบคุณนี่แหละที่จะช่วยให้โลกเรามีน้ำใช้ไปอีกนาน!",
                status: "🌟 ระดับตำนาน (ได้เหรียญ 'ผู้พิทักษ์วารี')",
                statusColor: "#06b6d4"
            }
        ];
    }

    // เริ่มเกม
    startGame() {
        this.water = 100;
        this.remainingTime = 60;
        this.currentMission = 0;
        this.ecoStreak = 0;
        this.ecoChoices = 0;
        this.bonusCount = 0;
        this.missionTimeRemaining = 10;

        this.showScreen('gameScreen');
        this.displayMission();
        this.startGameTimer();
        this.startMissionTimer();
    }

    // สุ่มสลับตำแหน่ง array (Fisher-Yates shuffle)
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // แสดงภารกิจปัจจุบัน
    displayMission() {
        const mission = this.missions[this.currentMission];
        
        document.getElementById('missionNumber').textContent = 
            `ภารกิจที่ ${this.currentMission + 1} / ${this.missions.length}`;
        document.getElementById('missionTitle').textContent = mission.title;
        
        const choicesContainer = document.getElementById('choicesContainer');
        choicesContainer.innerHTML = '';
        
        // สุ่มสลับตำแหน่งของตัวเลือก
        const shuffledChoices = this.shuffleArray(mission.choices);
        
        shuffledChoices.forEach((choice, index) => {
            const choiceBtn = document.createElement('button');
            choiceBtn.className = `choice-btn ${choice.isEco ? 'eco' : 'wasteful'}`;
            choiceBtn.innerHTML = `
                <span class="choice-label">${choice.label}</span>
                <span class="choice-description">${choice.description}</span>
            `;
            choiceBtn.onclick = () => this.makeChoice(choice);
            choicesContainer.appendChild(choiceBtn);
        });
    }

    // ทำการเลือก
    makeChoice(choice) {
        // หยุด mission timer
        clearInterval(this.missionTimer);
        
        // หักน้ำ
        this.water -= choice.waterCost;
        this.updateWaterBar();
        
        // นับ streak และโบนัส
        if (choice.isEco) {
            this.ecoChoices++;
            this.ecoStreak++;
            
            // โบนัส streak 3 ครั้งติดกัน
            if (this.ecoStreak === 3) {
                this.giveBonus();
                this.ecoStreak = 0;
            }
        } else {
            this.ecoStreak = 0;
        }
        
        // เช็คว่าน้ำหมดหรือยัง
        if (this.water <= 0) {
            this.water = 0;
            this.updateWaterBar();
            this.gameOver();
            return;
        }
        
        // ไปภารกิจถัดไป
        this.currentMission++;
        
        if (this.currentMission >= this.missions.length) {
            // จบเกม
            this.endGame();
        } else {
            // ภารกิจถัดไป
            this.missionTimeRemaining = 10;
            this.displayMission();
            this.startMissionTimer();
        }
    }

    // Timer หลักของเกม (60 วินาที)
    startGameTimer() {
        this.gameTimer = setInterval(() => {
            this.remainingTime--;
            this.updateTimer();
            
            if (this.remainingTime <= 0) {
                clearInterval(this.gameTimer);
                this.endGame();
            }
        }, 1000);
    }

    // Timer ของแต่ละภารกิจ (10 วินาที)
    startMissionTimer() {
        this.missionTimer = setInterval(() => {
            this.missionTimeRemaining--;
            this.updateMissionTimer();
            
            // หมดเวลาภารกิจ - รั่วน้ำ -5%
            if (this.missionTimeRemaining <= 0) {
                clearInterval(this.missionTimer);
                this.water -= 5;
                this.updateWaterBar();
                
                // แจ้งเตือน
                this.showWarning("⏰ หมดเวลา! น้ำรั่วทิ้ง -5%");
                
                // เช็คน้ำหมด
                if (this.water <= 0) {
                    this.water = 0;
                    this.updateWaterBar();
                    this.gameOver();
                    return;
                }
                
                // ไปภารกิจถัดไป
                this.currentMission++;
                
                if (this.currentMission >= this.missions.length) {
                    this.endGame();
                } else {
                    this.missionTimeRemaining = 10;
                    this.displayMission();
                    this.startMissionTimer();
                }
            }
        }, 1000);
    }

    // อัพเดต timer หลัก
    updateTimer() {
        const timerEl = document.getElementById('timer');
        timerEl.textContent = this.remainingTime;
        
        if (this.remainingTime <= 10) {
            timerEl.classList.add('warning');
        }
    }

    // อัพเดต mission timer
    updateMissionTimer() {
        const missionTimerEl = document.getElementById('missionTimer');
        missionTimerEl.textContent = `⏱️ เหลือเวลา: ${this.missionTimeRemaining} วินาที`;
    }

    // อัพเดตแถบน้ำ
    updateWaterBar() {
        const waterBar = document.getElementById('waterBar');
        const waterPercent = document.getElementById('waterPercent');
        
        // จำกัดไม่ให้ติดลบ
        const displayWater = Math.max(0, this.water);
        
        waterBar.style.width = displayWater + '%';
        waterPercent.textContent = displayWater + '%';
        
        // เปลี่ยนสีถ้าน้ำต่ำ
        if (displayWater <= 30) {
            waterBar.classList.add('low');
        } else {
            waterBar.classList.remove('low');
        }
    }

    // ให้โบนัส
    giveBonus() {
        this.water += 2;
        this.bonusCount++;
        this.updateWaterBar();
        this.showBonus();
    }

    // แสดงโบนัส
    showBonus() {
        const bonusEl = document.getElementById('bonusNotification');
        bonusEl.classList.add('show');
        
        setTimeout(() => {
            bonusEl.classList.remove('show');
        }, 2000);
    }

    // แสดงคำเตือน
    showWarning(message) {
        const bonusEl = document.getElementById('bonusNotification');
        bonusEl.textContent = message;
        bonusEl.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        bonusEl.classList.add('show');
        
        setTimeout(() => {
            bonusEl.classList.remove('show');
            bonusEl.textContent = '⭐ โบนัส! +2% น้ำคืน';
            bonusEl.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        }, 2000);
    }

    // จบเกม (ครบ 10 ภารกิจ หรือ หมดเวลา)
    endGame() {
        clearInterval(this.gameTimer);
        clearInterval(this.missionTimer);
        
        // โบนัสเวลา (ถ้าจบภายใน 45 วินาที)
        const timeUsed = 60 - this.remainingTime;
        if (timeUsed <= 45 && this.water > 0) {
            this.water += 5;
            this.bonusCount++;
        }
        
        // จำกัดไม่ให้เกิน 100
        this.water = Math.min(100, this.water);
        
        this.showResult();
    }

    // Game Over (น้ำหมดก่อนจบภารกิจ)
    gameOver() {
        clearInterval(this.gameTimer);
        clearInterval(this.missionTimer);
        
        this.water = 0;
        this.showResult();
    }

    // แสดงผลลัพธ์
    showResult() {
        const ranking = this.getRanking();
        const timeUsed = 60 - this.remainingTime;
        
        document.getElementById('resultIcon').textContent = ranking.icon;
        document.getElementById('resultRank').textContent = ranking.rank;
        document.getElementById('resultWater').textContent = `น้ำคงเหลือ: ${this.water}%`;
        document.getElementById('resultDescription').textContent = ranking.description;
        
        const statusEl = document.getElementById('resultStatus');
        statusEl.textContent = ranking.status;
        statusEl.style.background = ranking.statusColor;
        statusEl.style.color = 'white';
        
        document.getElementById('statTime').textContent = `${timeUsed} วินาที`;
        document.getElementById('statEco').textContent = `${this.ecoChoices} ครั้ง`;
        document.getElementById('statBonus').textContent = `${this.bonusCount} ครั้ง`;
        
        this.showScreen('resultScreen');
    }

    // หา Ranking
    getRanking() {
        for (let ranking of this.rankings) {
            if (this.water >= ranking.min && this.water <= ranking.max) {
                return ranking;
            }
        }
        return this.rankings[1]; // default
    }

    // แสดงหน้าจอ
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    // รีเซ็ตเกม
    resetGame() {
        this.showScreen('introScreen');
    }
}

// สร้าง instance ของเกม
const game = new WaterWiseGame();
