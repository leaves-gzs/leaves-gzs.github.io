// ======================== 游戏数据 ========================
const G = {
    day: 1,
    season: 1,
    knowledge: 0,
    health: 100,
    luck: 50,
    mentality: 1.0,
    money: 0,
    doing: 10,
    maxDoing: 10,
    state: 'daily', // 'daily' | 'competition'
    // 比赛相关
    compInProgress: false,
    compIndex: -1,
    compDay: 0,
    compPhase: 'select', // 'selectProblem' | 'selectSegment' | 'execStep' | 'finished'
    currentProblem: 0,
    currentSegment: 0, // 10/30/50/80/100
    currentStepType: '', // 'think' | 'code' | 'compare'
    currentStepIndex: 0,
    totalSteps: 0,
    stepResults: [],
    problemScores: [],
    actionPoints: 50,
    compResult: null,
    // 已完成的比赛索引（避免重复触发）
    completedCompIndices: new Set(),
    // 日志
    logMessages: [],
};

// ======================== 比赛日程 ========================
const BASE_SCHEDULE = [
    { name: 'CSP-S 初赛', type: 'written', problems: 1, maxScore: 100, passScore: 60, difficulty: 1.0, dayOffset: 30 },
    { name: 'CSP-S 复赛', type: 'online', problems: 4, maxScore: 400, passScore: 200, difficulty: 1.2, dayOffset: 50 },
    { name: 'NOIP', type: 'online', problems: 4, maxScore: 400, passScore: 240, difficulty: 1.4, dayOffset: 75 },
    { name: '省选', type: 'online', problems: 6, maxScore: 600, passScore: 360, difficulty: 1.6, dayOffset: 135 },
    { name: 'WC', type: 'online', problems: 3, maxScore: 300, passScore: 180, difficulty: 1.8, dayOffset: 165 },
    { name: 'NOI', type: 'online', problems: 3, maxScore: 300, passScore: 200, difficulty: 2.0, dayOffset: 225 },
    { name: 'IOI', type: 'online', problems: 3, maxScore: 300, passScore: 300, difficulty: 2.2, dayOffset: 315 },
];

// 生成两个赛季的比赛（绝对天数）
function buildFullSchedule() {
    const schedule = [];
    // 高一
    BASE_SCHEDULE.forEach((item, idx) => {
        schedule.push({
            ...item,
            triggerDay: item.dayOffset,
            season: 1,
            index: idx,
            difficulty: item.difficulty,
        });
    });
    // 高二（+365天，难度×1.2）
    BASE_SCHEDULE.forEach((item, idx) => {
        schedule.push({
            ...item,
            triggerDay: item.dayOffset + 365,
            season: 2,
            index: idx + 7,
            difficulty: item.difficulty * 1.2,
        });
    });
    return schedule;
}

let fullSchedule = buildFullSchedule();

// ======================== 分段参数（基础值） ========================
const SEGMENT_CONFIG = {
    10: { thinkSteps: 2, thinkReq: 5, codeSteps: 3, codeReq: 8, compareReq: 5 },
    30: { thinkSteps: 4, thinkReq: 12, codeSteps: 5, codeReq: 18, compareReq: 12 },
    50: { thinkSteps: 6, thinkReq: 20, codeSteps: 7, codeReq: 30, compareReq: 20 },
    80: { thinkSteps: 8, thinkReq: 35, codeSteps: 9, codeReq: 50, compareReq: 35 },
    100: { thinkSteps: 10, thinkReq: 55, codeSteps: 11, codeReq: 75, compareReq: 55 },
};

// ======================== UI 元素引用 ========================
const $ = id => document.getElementById(id);
const dayDisplay = $('dayDisplay');
const knowledgeDisplay = $('knowledgeDisplay');
const healthDisplay = $('healthDisplay');
const luckDisplay = $('luckDisplay');
const mentalityDisplay = $('mentalityDisplay');
const moneyDisplay = $('moneyDisplay');
const doingDisplay = $('doingDisplay');
const compCountdown = $('compCountdown');

const dailyPanel = $('daily-panel');
const compPanel = $('competition-panel');
const compTitle = $('compTitle');
const compInfo = $('compInfo');
const compContent = $('compContent');
const compLog = $('compLog');
const compContinueBtn = $('compContinueBtn');
const dailyLog = $('daily-log');

// ======================== 工具函数 ========================
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ======================== 核心逻辑 ========================

// 更新UI状态
function updateUI() {
    dayDisplay.textContent = G.day;
    knowledgeDisplay.textContent = Math.floor(G.knowledge);
    healthDisplay.textContent = Math.floor(G.health);
    luckDisplay.textContent = Math.floor(G.luck);
    mentalityDisplay.textContent = G.mentality.toFixed(2);
    moneyDisplay.textContent = Math.floor(G.money);
    doingDisplay.textContent = G.doing;

    // 检查下一个比赛
    const nextComp = getNextCompetition();
    if (nextComp) {
        const daysLeft = nextComp.triggerDay - G.day;
        compCountdown.textContent = `⏰ 距 ${nextComp.name} 还有 ${daysLeft} 天`;
    } else {
        compCountdown.textContent = '';
    }
}

// 获取下一个未完成的比赛
function getNextCompetition() {
    for (let comp of fullSchedule) {
        if (!G.completedCompIndices.has(comp.index) && comp.triggerDay >= G.day) {
            return comp;
        }
    }
    return null;
}

// 添加日志
function addLog(msg, cls = 'info') {
    G.logMessages.push({ msg, cls });
    // 只保留最近50条
    if (G.logMessages.length > 50) G.logMessages.shift();
    renderLogs();
}

function renderLogs(container = dailyLog, logs = G.logMessages) {
    container.innerHTML = logs.map(l => `<div class="${l.cls}">${l.msg}</div>`).join('');
    container.scrollTop = container.scrollHeight;
}

// 日常活动
function doAction(action) {
    if (G.state !== 'daily') return;
    if (G.doing <= 0) {
        addLog('今天已经没时间了，快去睡觉吧！', 'fail');
        return;
    }

    let logMsg = '';
    let healthCost = 0;
    let knowledgeGain = 0;
    let luckChange = 0;
    let doingCost = 1;

    switch (action) {
        case 'study': {
            if (G.health < 10) {
                addLog('你太累了，无法集中精力学习。', 'fail');
                return;
            }
            const x = rand(1, 3);
            knowledgeGain = x;
            healthCost = 2;
            luckChange = Math.random() < 0.5 ? 1 : -1;
            logMsg = `📖 学习：知识 +${x}，健康 -2，运气 ${luckChange > 0 ? '+' : ''}${luckChange}`;
            break;
        }
        case 'practice': {
            if (G.health < 20) {
                addLog('你太累了，无法集中精力刷题。', 'fail');
                return;
            }
            const x = rand(1, 2);
            knowledgeGain = x;
            healthCost = 8;
            luckChange = Math.random() < 0.5 ? 2 : -2;
            logMsg = `💻 刷题：知识 +${x}，健康 -8，运气 ${luckChange > 0 ? '+' : ''}${luckChange}`;
            break;
        }
        case 'game': {
            if (G.health < 30 || G.doing < 2) {
                addLog('健康或时间不足，不能玩游戏。', 'fail');
                return;
            }
            healthCost = 20;
            doingCost = 2;
            const win = Math.random() < 0.5;
            if (win) {
                luckChange = 3;
                logMsg = '🎮 杀戮之塔大获全胜！运气 +3';
            } else {
                luckChange = Math.random() < 0.5 ? -1 : -3;
                logMsg = `🎮 杀戮之塔失利，运气 ${luckChange}`;
            }
            break;
        }
        case 'forum': {
            if (G.health < 5) {
                addLog('你连鼠标都握不住了。', 'fail');
                return;
            }
            healthCost = 1;
            const gainKnow = Math.random() < 0.5 ? 1 : 0;
            knowledgeGain = gainKnow;
            const good = Math.random() < 0.5;
            if (good) {
                luckChange = 2;
                logMsg = '💬 水讨论区收获颇丰，运气 +2';
            } else {
                luckChange = Math.random() < 0.5 ? -1 : -2;
                logMsg = `💬 讨论区翻车，运气 ${luckChange}`;
            }
            if (gainKnow) logMsg += '，知识 +1';
            break;
        }
        case 'sleep': {
            // 主动睡觉，进入下一天
            nextDay();
            return;
        }
        default: return;
    }

    // 应用变化
    G.knowledge += knowledgeGain;
    G.health -= healthCost;
    G.luck += luckChange;
    G.doing -= doingCost;

    // 限制
    G.health = clamp(G.health, 0, 100);
    G.luck = clamp(G.luck, 0, 100);
    if (G.health <= 0) {
        addLog('💀 你的身体垮了，游戏结束！', 'fail');
        gameOver('健康归零');
        return;
    }

    addLog(logMsg, 'success');
    updateUI();

    // 检查是否触发比赛（在每日结束或睡觉后检查）
    checkCompetitionTrigger();
}

// 进入下一天
function nextDay() {
    G.day++;
    G.doing = G.maxDoing;
    G.health = Math.min(100, G.health + Math.floor(G.health * 0.2));
    G.health = clamp(G.health, 0, 100);
    addLog(`🌙 第 ${G.day-1} 天结束，进入第 ${G.day} 天，体力恢复。`, 'info');
    updateUI();

    // 检查比赛触发
    checkCompetitionTrigger();
}

// 检查是否有比赛触发
function checkCompetitionTrigger() {
    if (G.state === 'competition') return;
    const next = getNextCompetition();
    if (next && G.day >= next.triggerDay) {
        startCompetition(next);
    }
}

// ======================== 比赛系统 ========================

function startCompetition(comp) {
    G.state = 'competition';
    G.compInProgress = true;
    G.compIndex = comp.index;
    G.compDay = comp.triggerDay;
    G.currentProblem = 0;
    G.problemScores = [];
    G.actionPoints = 50;
    G.compResult = null;
    G.compPhase = 'selectProblem';

    // 初始化每道题分数为0
    for (let i = 0; i < comp.problems; i++) {
        G.problemScores[i] = 0;
    }

    // 隐藏日常，显示比赛
    dailyPanel.style.display = 'none';
    compPanel.style.display = 'block';
    compTitle.textContent = `🏆 ${comp.name}`;
    compInfo.innerHTML = `赛季 ${comp.season} | 难度系数 ${comp.difficulty.toFixed(1)} | 总分 ${comp.maxScore} | 晋级线 ${comp.passScore}`;
    compLog.innerHTML = '';
    compContinueBtn.style.display = 'none';

    addLog(`🚀 比赛 ${comp.name} 开始！`, 'info');
    renderCompContent();
    updateUI();
}

// 渲染比赛内容
function renderCompContent() {
    const comp = fullSchedule[G.compIndex];
    if (!comp) return;

    let html = '';
    const phase = G.compPhase;

    if (phase === 'selectProblem') {
        html += `<p>选择题目（共 ${comp.problems} 题）：</p>`;
        for (let i = 0; i < comp.problems; i++) {
            const score = G.problemScores[i] || 0;
            html += `<button class="comp-choice" data-problem="${i}">T${i+1} (当前得分 ${score})</button>`;
        }
        html += `<p style="margin-top:10px;">行动点剩余：${G.actionPoints}</p>`;
        compContent.innerHTML = html;
        // 绑定事件
        compContent.querySelectorAll('.comp-choice').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.problem);
                selectProblem(idx);
            });
        });
    } else if (phase === 'selectSegment') {
        const pIdx = G.currentProblem;
        html += `<p>选择 T${pIdx+1} 的目标分段：</p>`;
        const segments = [10, 30, 50, 80, 100];
        segments.forEach(seg => {
            html += `<button class="comp-choice" data-segment="${seg}">${seg} 分</button>`;
        });
        html += `<p style="margin-top:10px;">行动点剩余：${G.actionPoints}</p>`;
        compContent.innerHTML = html;
        compContent.querySelectorAll('.comp-choice').forEach(btn => {
            btn.addEventListener('click', () => {
                const seg = parseInt(btn.dataset.segment);
                selectSegment(seg);
            });
        });
    } else if (phase === 'execStep') {
        // 显示当前步骤信息
        const stepInfo = getCurrentStepInfo();
        html += `<p>${stepInfo.description}</p>`;
        html += `<p>成功率：${(stepInfo.successRate * 100).toFixed(1)}%</p>`;
        html += `<p>行动点剩余：${G.actionPoints}</p>`;
        compContent.innerHTML = html;
        // 显示继续按钮
        compContinueBtn.style.display = 'inline-block';
        compContinueBtn.textContent = '⚡ 进行判定';
        compContinueBtn.onclick = executeStep;
    } else if (phase === 'finished') {
        // 比赛结束
        const total = G.problemScores.reduce((a,b) => a+b, 0);
        const pass = comp.passScore;
        const passed = total >= pass;
        html += `<p>比赛结束！总分：${total} / ${comp.maxScore}</p>`;
        html += `<p>${passed ? '✅ 晋级成功！' : '❌ 未达到晋级线！'}</p>`;
        compContent.innerHTML = html;
        compContinueBtn.style.display = 'none';

        // 处理结果
        handleCompetitionResult(passed, total);
    }
}

// 获取当前步骤信息
function getCurrentStepInfo() {
    const comp = fullSchedule[G.compIndex];
    const seg = G.currentSegment;
    const config = SEGMENT_CONFIG[seg];
    const diff = comp.difficulty;
    let stepType = G.currentStepType;
    let stepIdx = G.currentStepIndex;
    let totalSteps = 0;
    let required = 0;
    let desc = '';

    if (stepType === 'think') {
        totalSteps = config.thinkSteps;
        required = config.thinkReq * diff;
        desc = `思考 (${stepIdx+1}/${totalSteps})`;
    } else if (stepType === 'code') {
        totalSteps = config.codeSteps;
        required = config.codeReq * diff;
        desc = `编写代码 (${stepIdx+1}/${totalSteps})`;
    } else if (stepType === 'compare') {
        totalSteps = 1;
        required = config.compareReq * diff;
        desc = `对拍 (1/1)`;
    }

    // 成功率 = (知识 / required) * (运气/100) * 心态
    let rate = (G.knowledge / required) * (G.luck / 100) * G.mentality;
    rate = Math.min(rate, 2.0); // 上限200% 防止无限大
    return {
        description: desc,
        successRate: rate,
        required: required,
    };
}

// 选择题目
function selectProblem(idx) {
    G.currentProblem = idx;
    G.compPhase = 'selectSegment';
    renderCompContent();
}

// 选择分段
function selectSegment(seg) {
    G.currentSegment = seg;
    // 初始化步骤
    const config = SEGMENT_CONFIG[seg];
    G.currentStepType = 'think';
    G.currentStepIndex = 0;
    G.totalSteps = config.thinkSteps + config.codeSteps + 1; // +1 for compare
    G.compPhase = 'execStep';
    renderCompContent();
}

// 执行一步
function executeStep() {
    const stepInfo = getCurrentStepInfo();
    const rate = stepInfo.successRate;
    const roll = Math.random();
    const success = roll < rate;

    let logMsg = '';
    if (success) {
        logMsg = `✅ ${stepInfo.description} 成功！ (${(rate*100).toFixed(1)}% 成功率)`;
        addLog(logMsg, 'success');
        // 前进到下一步
        advanceStep();
    } else {
        logMsg = `❌ ${stepInfo.description} 失败！ (${(rate*100).toFixed(1)}% 成功率)`;
        addLog(logMsg, 'fail');
        // 重试或放弃
        if (G.actionPoints <= 0) {
            addLog('行动点耗尽，该题得 0 分！', 'fail');
            // 该题得分0，进入下一题或结束
            finalizeProblem(0);
            return;
        }
        // 显示重试选项
        compContent.innerHTML += `<div style="margin-top:10px;">
            <button class="comp-choice" id="retryBtn">🔄 重试 (消耗1行动点)</button>
            <button class="comp-choice" id="giveupBtn">❌ 放弃该分段</button>
        </div>`;
        document.getElementById('retryBtn').addEventListener('click', () => {
            G.actionPoints--;
            G.compPhase = 'execStep'; // 重新执行当前步骤
            renderCompContent();
        });
        document.getElementById('giveupBtn').addEventListener('click', () => {
            finalizeProblem(0);
        });
        compContinueBtn.style.display = 'none';
        return;
    }
}

// 推进到下一步
function advanceStep() {
    const config = SEGMENT_CONFIG[G.currentSegment];
    let total = 0;
    if (G.currentStepType === 'think') {
        if (G.currentStepIndex + 1 < config.thinkSteps) {
            G.currentStepIndex++;
            renderCompContent();
            return;
        } else {
            // 切换到编写
            G.currentStepType = 'code';
            G.currentStepIndex = 0;
            renderCompContent();
            return;
        }
    } else if (G.currentStepType === 'code') {
        if (G.currentStepIndex + 1 < config.codeSteps) {
            G.currentStepIndex++;
            renderCompContent();
            return;
        } else {
            // 切换到对拍
            G.currentStepType = 'compare';
            G.currentStepIndex = 0;
            renderCompContent();
            return;
        }
    } else if (G.currentStepType === 'compare') {
        // 所有步骤完成，获得分段分数
        const score = G.currentSegment;
        finalizeProblem(score);
    }
}

// 完成一道题（获得分数或0）
function finalizeProblem(score) {
    G.problemScores[G.currentProblem] = score;
    addLog(`T${G.currentProblem+1} 得分：${score}`, score > 0 ? 'success' : 'fail');
    // 检查是否所有题目都完成了
    const comp = fullSchedule[G.compIndex];
    let allDone = true;
    for (let i = 0; i < comp.problems; i++) {
        if (G.problemScores[i] === undefined || G.problemScores[i] === null) {
            allDone = false;
            break;
        }
    }
    if (allDone) {
        // 比赛结束
        G.compPhase = 'finished';
        renderCompContent();
    } else {
        // 进入下一题
        G.currentProblem++;
        G.compPhase = 'selectProblem';
        renderCompContent();
    }
}

// 处理比赛结果
function handleCompetitionResult(passed, total) {
    const comp = fullSchedule[G.compIndex];
    // 标记完成
    G.completedCompIndices.add(comp.index);

    if (passed) {
        // 晋级成功
        // 奖励
        const rewardMoney = 500 + 100 * comp.season;
        G.money += rewardMoney;
        const rewardKnowledge = 2 + Math.floor(comp.difficulty * 2);
        G.knowledge += rewardKnowledge;
        G.mentality = Math.min(1.5, G.mentality + 0.01);
        addLog(`🎉 晋级成功！获得奖金 ${rewardMoney}，知识 +${rewardKnowledge}，心态 +0.01`, 'success');
        // 检查是否为IOI且金牌
        if (comp.name === 'IOI' && total >= comp.maxScore) {
            // 胜利！
            addLog('🏅 恭喜你 AK IOI！你成为了世界冠军！', 'success');
            gameWin();
            return;
        }
        // 检查是否赛季结束（高一IOI完成，进入高二）
        if (comp.name === 'IOI' && comp.season === 1) {
            addLog('📅 高一赛季结束，进入高二！', 'info');
            // 继续日常
            G.state = 'daily';
            dailyPanel.style.display = 'block';
            compPanel.style.display = 'none';
            updateUI();
            return;
        }
        // 正常继续
        G.state = 'daily';
        dailyPanel.style.display = 'block';
        compPanel.style.display = 'none';
        updateUI();
    } else {
        // 未晋级，游戏结束
        addLog(`💔 未达到晋级线 (${total}/${comp.passScore})，游戏结束！`, 'fail');
        gameOver(`在 ${comp.name} 中未晋级`);
    }
}

// ======================== 游戏结束/胜利 ========================

function gameOver(reason) {
    alert(`游戏结束！原因：${reason}\n最终状态：\n知识 ${Math.floor(G.knowledge)}\n金钱 ${Math.floor(G.money)}\n心态 ${G.mentality.toFixed(2)}`);
    // 可以重新加载页面重启
    if (confirm('是否重新开始？')) {
        location.reload();
    }
}

function gameWin() {
    alert(`🎉 恭喜你 AK IOI，获得金牌！\n最终状态：\n知识 ${Math.floor(G.knowledge)}\n金钱 ${Math.floor(G.money)}\n心态 ${G.mentality.toFixed(2)}`);
    if (confirm('你已经征服了OI，是否重新开始？')) {
        location.reload();
    }
}

// ======================== 初始化事件绑定 ========================

function init() {
    // 日常按钮
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action === 'sleep') {
                nextDay();
            } else {
                doAction(action);
            }
        });
    });

    // 初始检查比赛
    updateUI();
    checkCompetitionTrigger();

    // 如果无比赛，显示日常
    if (G.state === 'daily') {
        dailyPanel.style.display = 'block';
        compPanel.style.display = 'none';
    }
}

// 页面加载完成后启动
window.onload = init;
