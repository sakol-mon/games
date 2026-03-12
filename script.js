document.addEventListener('DOMContentLoaded', () => {
    // ตัวแปรสถานะเกม
    let storyData = [];
    let currentQuestionId = 0; 
    let totalScore = 0;

    // องค์ประกอบ HTML
    const bodyElement = document.body;
    const questionElement = document.getElementById('question');
    const optionsContainer = document.getElementById('options-container');
    const scoreDisplay = document.getElementById('score-display');

    // 1. ฟังก์ชันโหลดข้อมูลจาก JSON (เหมือนเดิม)
    async function loadStoryData() {
        try {
            const response = await fetch('data.json');
            storyData = await response.json();
            displayQuestion(currentQuestionId);
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลเรื่องราว:', error);
            questionElement.textContent = 'ไม่สามารถโหลดข้อมูลเกมได้';
        }
    }

    // 2. ฟังก์ชันแสดงคำถาม ตัวเลือก และเปลี่ยน Background (เหมือนเดิม)
    function displayQuestion(id) {
        optionsContainer.innerHTML = '';
        const question = storyData.find(q => q.id === id);

        if (!question) {
            displayResult();
            return;
        }

        // เปลี่ยน Background ของ Body
        bodyElement.style.backgroundImage = `url('${question.image}')`;

        // แสดงคำถาม
        questionElement.textContent = question.question;
        
        if (id !== 0 && id !== 13) {
            updateScoreDisplay();
        } else {
            scoreDisplay.textContent = 'เตรียมพร้อมสำหรับการเดินทาง!';
        }

        // สร้างปุ่มตัวเลือก
        question.options.forEach(option => {
            const button = document.createElement('button');
            button.classList.add('option-button');
            button.textContent = option.text;
            button.addEventListener('click', () => handleChoice(option.score, option.next));
            optionsContainer.appendChild(button);
        });
    }

    // 3. ฟังก์ชันจัดการเมื่อเลือกตัวเลือก (เหมือนเดิม)
    function handleChoice(score, nextId) {
        totalScore += score;
        
        if (nextId === "END") {
            displayResult();
        } else {
            currentQuestionId = nextId;
            displayQuestion(currentQuestionId);
        }
    }

    // 4. ฟังก์ชันแสดงคะแนนปัจจุบัน (เหมือนเดิม)
    function updateScoreDisplay() {
        scoreDisplay.textContent = `คะแนนปัจจุบัน: ${totalScore.toLocaleString()} บาท`;
    }

    // 5. ฟังก์ชันแสดงผลลัพธ์สุดท้าย (เมื่อถึง "END")
    function displayResult() {
        optionsContainer.innerHTML = '';
        questionElement.textContent = '🚩 สรุปผลทริปคาร์บอนต่ำกรีนแลนด์!';
        
        // *** การปรับปรุงสำคัญ: ใช้ END.png เป็น Background สุดท้าย ***
        bodyElement.style.backgroundImage = `url('images/END.png')`; 
        
        let message = '';
        let scoreColor = '#dc3545';
        
        if (totalScore >= -2500) {
            message = '👍 **สุดยอด! ทริปคาร์บอนต่ำที่ประสบความสำเร็จ!** คุณมีการตัดสินใจที่ยอดเยี่ยมในการลดผลกระทบต่อสิ่งแวดล้อม และมีการใช้จ่ายอย่างระมัดระวัง';
            scoreColor = '#28a745'; 
        } else if (totalScore >= -6000) {
            message = '👌 **ทริปสายกลางที่สมดุล** คุณสามารถประนีประนอมระหว่างความสะดวกสบายและการลดคาร์บอนได้ดี แต่ยังมีโอกาสประหยัดและรักษ์โลกได้อีก!';
            scoreColor = '#ffc107'; 
        } else {
            message = '👎 **ทริปสายพรีเมียม/คาร์บอนสูง** ทริปนี้เน้นความสะดวกสบายเป็นหลัก ซึ่งทำให้ค่าใช้จ่ายสูงและอาจมีผลกระทบต่อสิ่งแวดล้อมมาก การตัดสินใจครั้งหน้าควรพิจารณาทางเลือกที่เป็นมิตรต่อโลกมากขึ้น';
            scoreColor = '#dc3545'; 
        }

        optionsContainer.innerHTML = `
            <p style="font-size: 1.3em; font-weight: bold; color: ${scoreColor};">คะแนนรวม: ${totalScore.toLocaleString()} คะแนน</p>
            <p>${message}</p>
            <button class="option-button" onclick="window.location.reload()">เริ่มทริปใหม่</button>
        `;
        // ซ่อนคะแนนปัจจุบันเมื่อแสดงผลลัพธ์
        scoreDisplay.textContent = ''; 
    }

    // เริ่มโหลดข้อมูลเกม
    loadStoryData();
});
