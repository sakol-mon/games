// Watt Watcher Game Logic
// Version 4.3 - Full Implementation

class WattWatcherGame {
    constructor() {
        // Core game state
        this.maxLoad = 10.0;
        this.currentLoad = 0.0;
        this.happiness = 100;
        this.gameTime = 90;
        this.currentTime = 0;
        this.isGameRunning = false;
        this.isPaused = false; // For task popup pause
        this.isBlackout = false;
        this.isHoldingRestart = false;
        this.holdProgress = 0;
        
        // Strike system
        this.blackoutStrikes = 0;
        this.happinessStrikes = 0;
        this.maxStrikes = 3;
        
        // Task system
        this.currentTask = null;
        this.taskTimeRemaining = 0;
        this.taskDuration = 5;
        this.taskInterval = 7; // 7-8 seconds between tasks
        this.nextTaskIn = 0;
        this.tasksCompleted = 0;
        
        // Sequential phase tasks (first 9 tasks in order)
        this.sequentialTasks = [
            { description: "ทำงานส่งเจ้านาย", room: "ห้องนอน 2", appliance: "PC", duration: 5 },
            { description: "ดูหนังกับครอบครัว", room: "ห้องนั่งเล่น", appliance: "ทีวี", duration: 5 },
            { description: "ทำอาหารมื้อใหญ่", room: "ห้องครัว", appliances: ["เตาอบ", "หม้อหุงข้าว"], duration: 5 },
            { description: "อาบน้ำอุ่น", room: "ห้องน้ำ", appliance: "เครื่องทำน้ำอุ่น", duration: 5 },
            { description: "อุ่นอาหาร", room: "ห้องครัว", appliance: "ไมโครเวฟ", duration: 5 },
            { description: "เรียนออนไลน์", room: "ห้องนอน 2", appliance: "PC", duration: 5 },
            { description: "ดูหนังกับครอบครัว", room: "ห้องนั่งเล่น", appliance: "ทีวี", duration: 5 },
            { description: "ชงเครื่องดื่มร้อน", room: "ห้องครัว", appliance: "กาน้ำร้อน", duration: 5 },
            { description: "ล้างห้องน้ำ", room: "ห้องน้ำ", appliance: "ไฟ", duration: 5 }
        ];
        
        // Random task pool (used after sequential phase)
        this.randomTaskPool = [
            { description: "ทำงานส่งเจ้านาย", room: "ห้องนอน 2", appliance: "PC" },
            { description: "ดูหนังกับครอบครัว", room: "ห้องนั่งเล่น", appliance: "ทีวี" },
            { description: "อุ่นอาหาร", room: "ห้องครัว", appliance: "ไมโครเวฟ" },
            { description: "ชงเครื่องดื่มร้อน", room: "ห้องครัว", appliance: "กาน้ำร้อน" },
            { description: "ทำอาหาร", room: "ห้องครัว", appliance: "เตาอบ" },
            { description: "หุงข้าว", room: "ห้องครัว", appliance: "หม้อหุงข้าว" },
            { description: "ดูหนัง", room: "ห้องนอน 1", appliance: "ทีวี" },
            { description: "ทำงาน", room: "ห้องนอน 2", appliance: "PC" },
            { description: "อาบน้ำอุ่น", room: "ห้องน้ำ", appliance: "เครื่องทำน้ำอุ่น" }
        ];
        
        // Room and appliance definitions
        this.rooms = {
            "ห้องนั่งเล่น": {
                appliances: {
                    "ไฟ": { power: 0.1, state: false, alwaysOn: false },
                    "แอร์": { power: 2.0, state: false, alwaysOn: false },
                    "พัดลม": { power: 0.08, state: false, alwaysOn: false },
                    "ทีวี": { power: 0.3, state: false, alwaysOn: false }
                }
            },
            "ห้องนอน 1": {
                appliances: {
                    "ไฟ": { power: 0.1, state: false, alwaysOn: false },
                    "แอร์": { power: 1.5, state: false, alwaysOn: false },
                    "พัดลม": { power: 0.08, state: false, alwaysOn: false },
                    "เครื่องฟอกอากาศ": { power: 0.5, state: false, alwaysOn: false }
                }
            },
            "ห้องนอน 2": {
                appliances: {
                    "ไฟ": { power: 0.1, state: false, alwaysOn: false },
                    "แอร์": { power: 1.5, state: false, alwaysOn: false },
                    "พัดลม": { power: 0.08, state: false, alwaysOn: false },
                    "PC": { power: 0.5, state: false, alwaysOn: false }
                }
            },
            "ห้องครัว": {
                appliances: {
                    "ไฟ": { power: 0.1, state: false, alwaysOn: false },
                    "ตู้เย็น": { power: 0.4, state: true, alwaysOn: true },
                    "ไมโครเวฟ": { power: 1.2, state: false, alwaysOn: false },
                    "เตาอบ": { power: 2.5, state: false, alwaysOn: false },
                    "หม้อหุงข้าว": { power: 0.8, state: false, alwaysOn: false },
                    "กาน้ำร้อน": { power: 1.8, state: false, alwaysOn: false }
                }
            },
            "ห้องน้ำ": {
                appliances: {
                    "ไฟ": { power: 0.1, state: false, alwaysOn: false },
                    "เครื่องทำน้ำอุ่น": { power: 4.5, state: false, alwaysOn: false }
                }
            }
        };
        
        // Happiness conditions tracking
        this.coolingDevices = 0; // Count of AC or fans running
        this.roomsWithLights = 0; // Count of rooms with lights on
        
        this.initializeUI();
    }
    
    initializeUI() {
        // Generate room cards
        const roomsContainer = document.getElementById('rooms-container');
        roomsContainer.innerHTML = '';
        
        for (const [roomName, roomData] of Object.entries(this.rooms)) {
            const roomCard = document.createElement('div');
            roomCard.className = 'room-card';
            roomCard.dataset.room = roomName;
            
            let html = `<div class="room-header">${roomName}</div>`;
            html += `<div class="appliance-grid">`;
            
            for (const [applianceName, applianceData] of Object.entries(roomData.appliances)) {
                const powerClass = this.getPowerClass(applianceData.power);
                const alwaysOnClass = applianceData.alwaysOn ? 'always-on' : '';
                
                html += `
                    <button class="appliance-btn ${alwaysOnClass}" 
                            data-room="${roomName}" 
                            data-appliance="${applianceName}"
                            ${applianceData.alwaysOn ? 'disabled' : ''}>
                        <span>${applianceName}</span>
                        <span class="appliance-power ${powerClass}">${applianceData.power} kW</span>
                    </button>
                `;
            }
            
            html += `</div>`;
            roomCard.innerHTML = html;
            roomsContainer.appendChild(roomCard);
        }
        
        // Add event listeners to appliance buttons
        document.querySelectorAll('.appliance-btn:not(.always-on)').forEach(btn => {
            btn.addEventListener('click', () => {
                const room = btn.dataset.room;
                const appliance = btn.dataset.appliance;
                this.toggleAppliance(room, appliance);
            });
        });
        
        // Restart button for blackout
        const restartBtn = document.getElementById('restart-btn');
        restartBtn.addEventListener('mousedown', () => this.startHoldRestart());
        restartBtn.addEventListener('mouseup', () => this.stopHoldRestart());
        restartBtn.addEventListener('mouseleave', () => this.stopHoldRestart());
        restartBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startHoldRestart();
        });
        restartBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopHoldRestart();
        });
    }
    
    getPowerClass(power) {
        if (power <= 0.5) return 'power-low';
        if (power <= 2.0) return 'power-medium';
        return 'power-high';
    }
    
    toggleAppliance(room, appliance) {
        if (this.isBlackout || this.isPaused) return;
        
        const applianceData = this.rooms[room].appliances[appliance];
        if (applianceData.alwaysOn) return;
        
        applianceData.state = !applianceData.state;
        this.updateLoad();
        this.updateUI();
        
        // Check if this satisfies the current task
        if (this.currentTask && applianceData.state) {
            this.checkTaskCompletion(room, appliance);
        }
    }
    
    checkTaskCompletion(room, appliance) {
        if (!this.currentTask) return;
        
        // Check if multiple appliances required
        if (this.currentTask.appliances) {
            const allOn = this.currentTask.appliances.every(reqAppliance => 
                this.rooms[this.currentTask.room].appliances[reqAppliance].state
            );
            if (allOn) {
                this.completeTask();
            }
        } else {
            // Single appliance task
            if (this.currentTask.room === room && this.currentTask.appliance === appliance) {
                this.completeTask();
            }
        }
    }
    
    completeTask() {
        this.happiness = Math.min(100, this.happiness + 5);
        this.currentTask = null;
        this.taskTimeRemaining = 0;
        this.tasksCompleted++;
        this.nextTaskIn = this.taskInterval + Math.random(); // 7-8 seconds
        this.updateUI();
    }
    
    failTask() {
        this.happiness = Math.max(0, this.happiness - 20);
        this.currentTask = null;
        this.taskTimeRemaining = 0;
        this.nextTaskIn = this.taskInterval + Math.random();
        this.updateUI();
    }
    
    spawnTask() {
        // Sequential phase: first 9 tasks
        if (this.tasksCompleted < this.sequentialTasks.length) {
            this.currentTask = { ...this.sequentialTasks[this.tasksCompleted] };
        } else {
            // Random phase: pick random task
            const randomTask = this.randomTaskPool[Math.floor(Math.random() * this.randomTaskPool.length)];
            this.currentTask = { ...randomTask, duration: 5 };
        }
        
        this.taskTimeRemaining = this.currentTask.duration;
        
        // Show task popup and pause game
        this.showTaskPopup();
        this.isPaused = true;
    }
    
    showTaskPopup() {
        const task = this.currentTask;
        
        // Set popup content
        document.getElementById('task-popup-description').textContent = task.description;
        document.getElementById('task-popup-room').textContent = task.room;
        
        // Set appliance text
        let applianceText = '';
        if (task.appliances) {
            applianceText = task.appliances.join(' + ');
        } else {
            applianceText = task.appliance;
        }
        document.getElementById('task-popup-appliance').textContent = applianceText;
        
        // Show modal
        document.getElementById('task-modal').classList.add('active');
    }
    
    closeTaskPopup() {
        document.getElementById('task-modal').classList.remove('active');
        this.isPaused = false;
        this.updateUI();
    }
    
    updateLoad() {
        this.currentLoad = 0;
        this.coolingDevices = 0;
        this.roomsWithLights = 0;
        
        for (const [roomName, roomData] of Object.entries(this.rooms)) {
            let roomHasLight = false;
            
            for (const [applianceName, applianceData] of Object.entries(roomData.appliances)) {
                if (applianceData.state) {
                    this.currentLoad += applianceData.power;
                    
                    // Track cooling devices
                    if (applianceName === "แอร์" || applianceName === "พัดลม") {
                        this.coolingDevices++;
                    }
                    
                    // Track lights
                    if (applianceName === "ไฟ") {
                        roomHasLight = true;
                    }
                }
            }
            
            if (roomHasLight) {
                this.roomsWithLights++;
            }
        }
        
        this.currentLoad = Math.round(this.currentLoad * 10) / 10;
        
        // Check for blackout
        if (this.currentLoad > this.maxLoad && !this.isBlackout) {
            this.triggerBlackout();
        }
    }
    
    triggerBlackout() {
        this.isBlackout = true;
        this.blackoutStrikes++;
        
        // Turn off all appliances except always-on
        for (const roomData of Object.values(this.rooms)) {
            for (const applianceData of Object.values(roomData.appliances)) {
                if (!applianceData.alwaysOn) {
                    applianceData.state = false;
                }
            }
        }
        
        this.updateLoad();
        this.updateUI();
        document.getElementById('blackout-modal').classList.add('active');
        
        // Check game over
        if (this.blackoutStrikes >= this.maxStrikes) {
            this.gameOver('ไฟดับ 3 ครั้ง!');
        }
    }
    
    startHoldRestart() {
        if (!this.isBlackout || this.isHoldingRestart) return;
        
        this.isHoldingRestart = true;
        this.holdProgress = 0;
        
        this.holdInterval = setInterval(() => {
            this.holdProgress += 100 / 40; // 4 seconds = 40 ticks at 100ms
            document.getElementById('hold-progress').style.width = this.holdProgress + '%';
            
            if (this.holdProgress >= 100) {
                this.completeRestart();
            }
        }, 100);
    }
    
    stopHoldRestart() {
        if (!this.isHoldingRestart) return;
        
        this.isHoldingRestart = false;
        clearInterval(this.holdInterval);
        this.holdProgress = 0;
        document.getElementById('hold-progress').style.width = '0%';
    }
    
    completeRestart() {
        this.stopHoldRestart();
        this.isBlackout = false;
        document.getElementById('blackout-modal').classList.remove('active');
        this.updateUI();
    }
    
    updateHappiness(deltaTime) {
        if (this.isBlackout) {
            // During blackout, happiness drops quickly
            this.happiness -= 5 * deltaTime;
        } else {
            // Hot weather condition
            if (this.coolingDevices === 0) {
                this.happiness -= 3.0 * deltaTime;
            } else {
                // Add happiness for cooling devices
                this.happiness += 0.2 * this.coolingDevices * deltaTime;
            }
            
            // Family activity condition
            if (this.roomsWithLights < 2) {
                this.happiness -= 1.0 * deltaTime;
            }
        }
        
        // Clamp happiness
        this.happiness = Math.max(0, Math.min(100, this.happiness));
        
        // Check for happiness strike
        if (this.happiness < 30) {
            this.happinessStrikes++;
            this.happiness = 75; // Reset to 75%
            
            if (this.happinessStrikes >= this.maxStrikes) {
                this.gameOver('ความสุขต่ำเกินไป 3 ครั้ง!');
            }
        }
    }
    
    updateUI() {
        // Update load display
        document.getElementById('current-load').textContent = this.currentLoad.toFixed(1) + ' kW';
        const loadPercent = (this.currentLoad / this.maxLoad) * 100;
        document.getElementById('load-fill').style.width = Math.min(100, loadPercent) + '%';
        
        // Update happiness display
        const happinessPercent = Math.round(this.happiness);
        document.getElementById('happiness-value').textContent = happinessPercent + '%';
        const happinessFill = document.getElementById('happiness-fill');
        happinessFill.style.width = happinessPercent + '%';
        
        if (happinessPercent >= 60) {
            happinessFill.style.background = 'var(--happiness-good)';
        } else if (happinessPercent >= 30) {
            happinessFill.style.background = 'var(--happiness-warning)';
        } else {
            happinessFill.style.background = 'var(--happiness-danger)';
        }
        
        // Update timer
        const timeLeft = Math.max(0, this.gameTime - this.currentTime);
        document.getElementById('timer').textContent = Math.ceil(timeLeft);
        
        // Update task timer display
        const taskTimerCard = document.getElementById('task-timer-card');
        if (this.currentTask && !this.isPaused) {
            taskTimerCard.style.display = 'block';
            document.getElementById('task-countdown').textContent = Math.ceil(this.taskTimeRemaining) + 's';
        } else {
            taskTimerCard.style.display = 'none';
        }
        
        // Update strike indicators
        this.updateStrikeDisplay('blackout-strikes', this.blackoutStrikes);
        this.updateStrikeDisplay('happiness-strikes', this.happinessStrikes);
        document.getElementById('blackout-count').textContent = `${this.blackoutStrikes} / 3`;
        
        // Update appliance button states
        document.querySelectorAll('.appliance-btn').forEach(btn => {
            const room = btn.dataset.room;
            const appliance = btn.dataset.appliance;
            const applianceData = this.rooms[room].appliances[appliance];
            
            if (applianceData.state) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            
            // Highlight task-required appliances (only when task is active and not paused)
            btn.classList.remove('task-required');
            if (this.currentTask && !this.isPaused) {
                if (this.currentTask.appliances) {
                    if (this.currentTask.room === room && 
                        this.currentTask.appliances.includes(appliance)) {
                        btn.classList.add('task-required');
                    }
                } else {
                    if (this.currentTask.room === room && 
                        this.currentTask.appliance === appliance) {
                        btn.classList.add('task-required');
                    }
                }
            }
        });
        
        // Highlight task-target room (only when task is active and not paused)
        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('task-target');
            if (this.currentTask && !this.isPaused && card.dataset.room === this.currentTask.room) {
                card.classList.add('task-target');
            }
        });
    }
    
    updateStrikeDisplay(elementId, strikeCount) {
        const container = document.getElementById(elementId);
        const dots = container.querySelectorAll('.strike-dot');
        dots.forEach((dot, index) => {
            if (index < strikeCount) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    startGame() {
        document.getElementById('start-modal').classList.remove('active');
        this.isGameRunning = true;
        this.currentTime = 0;
        this.nextTaskIn = 3; // First task after 3 seconds
        
        // Start game loop
        this.lastUpdate = Date.now();
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.isGameRunning) return;
        
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000; // seconds
        this.lastUpdate = now;
        
        // Don't update game state when paused (task popup is showing)
        if (!this.isPaused) {
            this.currentTime += deltaTime;
            
            // Update happiness
            this.updateHappiness(deltaTime);
            
            // Update task timer
            if (this.currentTask) {
                this.taskTimeRemaining -= deltaTime;
                if (this.taskTimeRemaining <= 0) {
                    this.failTask();
                }
            } else {
                // Countdown to next task
                this.nextTaskIn -= deltaTime;
                if (this.nextTaskIn <= 0) {
                    this.spawnTask();
                }
            }
        }
        
        this.updateUI();
        
        // Check victory condition
        if (this.currentTime >= this.gameTime && !this.isPaused) {
            this.victory();
            return;
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    victory() {
        this.isGameRunning = false;
        const finalHappiness = Math.round(this.happiness);
        const message = `คุณบริหารจัดการบ้านได้สำเร็จ!<br>
                        ความสุขสุดท้าย: ${finalHappiness}%<br>
                        ภารกิจที่ทำสำเร็จ: ${this.tasksCompleted}`;
        document.getElementById('victory-message').innerHTML = message;
        document.getElementById('victory-modal').classList.add('active');
    }
    
    gameOver(reason) {
        this.isGameRunning = false;
        document.getElementById('gameover-title').textContent = '💥 Game Over';
        document.getElementById('gameover-message').textContent = 'สาเหตุ: ' + reason;
        document.getElementById('gameover-modal').classList.add('active');
    }
}

// Initialize game
const game = new WattWatcherGame();
