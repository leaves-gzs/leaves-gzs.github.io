// ============================================================
// 猫国建设 · 终极版  JavaScript
// ============================================================

// ---------- 数据模型 ----------
const game = {
    // 资源
    rock: 0,
    oll: 0,
    ry: 0,
    jyr: 0,
    rb: 0,
    zt: 0,
    zg: 0,
    deep: 0,
    stj: 1,          // 基础采集量
    cjq: 0,          // 普通采石机数量
    // 高级资源
    alloy: 0,
    circuit: 0,
    part: 0,
    core: 0,
    ys1: 0, ys2: 0, ys3: 0, ys4: 0, ys5: 0,
    // 高级工具
    sg: false,
    jlg: false,
    alloy_pick: false,
    laser_drill: false,
    // 科技加成
    oil_bonus: 1.0,
    hang_efficiency: 1.0,
    auto_synth: false,
    // 新资源
    hfuel: 0,        // 高能燃料
    super_fuel: 0,   // 超级燃油
    // 高级设备
    super_cjq: 0,    // 超级采石机
    smart_cjq: 0,    // 智能采石机
    ultimate_cjq: 0, // 终极采石机
    // 钻具
    strong_zt: 0,    // 强化钻头
    strong_zg: 0,    // 强化钻管
    super_drill: 0,  // 超级钻具
    // 建筑
    advanced_furnace: false,
    auto_drill_platform: false,
    refinery: false,
    // 终极工具
    quantum_pick: false,
    quantum_drill: false,
    // 消耗品
    time_accelerator: 0,   // 时间加速器（使用后挂机速度翻倍持续1小时）
    // 科学点数
    step: 0,
    // 科技等级
    tech: {
        tool: { level: 1, max: 50 },
        fac: { level: 1, max: 100 },
        oil: { level: 1, max: 80 },
        hang: { level: 1, max: 60 },
        auto_syn: { level: 1, max: 40 }
    },
    // 成就
    achievements: [],
    // 任务
    quests: [],
    // 矿区
    minefields: [],
    // 统计
    stats: {
        total_rock: 0,
        total_oll: 0,
        total_jyr: 0,
        total_step: 0,
        play_time: 0  // 秒
    },
    // 上次保存时间
    last_save: Date.now(),
    // 挂机标志
    isAutoRunning: false,
    autoTimer: null,
    // 时间加速器剩余时间（秒）
    accelerator_time: 0,
};

// ---------- 合成配方库（20级） ----------
const recipes = [
    // 1-5级 中级合成
    {
        id: 'r1',
        name: '强化合金',
        desc: '2合金 + 1电路板 → 1强化合金',
        cost: { alloy: 2, circuit: 1 },
        result: { strong_alloy: 1 },
        unlock: () => game.tech.oil.level >= 5 || game.circuit >= 10
    },
    {
        id: 'r2',
        name: '智能芯片',
        desc: '1核心模块 + 2电路板 → 1智能芯片',
        cost: { core: 1, circuit: 2 },
        result: { smart_chip: 1 },
        unlock: () => game.core >= 1 && game.step >= 200
    },
    {
        id: 'r3',
        name: '高级机械框架',
        desc: '10个1级压缩石板 + 2零件 → 1高级机械框架',
        cost: { ys1: 10, part: 2 },
        result: { frame: 1 },
        unlock: () => game.ys1 >= 10
    },
    {
        id: 'r4',
        name: '精密仪器',
        desc: '1合金 + 2电路板 + 5燃油 → 1精密仪器',
        cost: { alloy: 1, circuit: 2, ry: 5 },
        result: { instrument: 1 },
        unlock: () => game.circuit >= 5
    },
    {
        id: 'r5',
        name: '高能燃料',
        desc: '1石油 + 1个1级压缩石板 → 10高能燃料',
        cost: { oll: 1, ys1: 1 },
        result: { hfuel: 10 },
        unlock: () => game.ys1 >= 1
    },
    // 6-10级 高级设备与工具
    {
        id: 'r6',
        name: '超级采石机',
        desc: '1高级机械框架 + 3零件 + 5电路板 → 1超级采石机',
        cost: { frame: 1, part: 3, circuit: 5 },
        result: { super_cjq: 1 },
        unlock: () => game.cjq >= 5
    },
    {
        id: 'r7',
        name: '智能采石机',
        desc: '1超级采石机 + 1智能芯片 + 10燃油 → 1智能采石机',
        cost: { super_cjq: 1, smart_chip: 1, ry: 10 },
        result: { smart_cjq: 1 },
        unlock: () => game.super_cjq >= 1
    },
    {
        id: 'r8',
        name: '强化钻头',
        desc: '5钻头 + 1合金 → 1强化钻头',
        cost: { zt: 5, alloy: 1 },
        result: { strong_zt: 1 },
        unlock: () => game.zt >= 10
    },
    {
        id: 'r9',
        name: '强化钻管',
        desc: '5钻管 + 2石板 → 1强化钻管',
        cost: { zg: 5, rb: 2 },
        result: { strong_zg: 1 },
        unlock: () => game.zg >= 10
    },
    {
        id: 'r10',
        name: '超级钻具',
        desc: '1强化钻头 + 1强化钻管 + 2合金 → 1超级钻具',
        cost: { strong_zt: 1, strong_zg: 1, alloy: 2 },
        result: { super_drill: 1 },
        unlock: () => game.strong_zt >= 1 && game.strong_zg >= 1
    },
    // 11-15级 自动化与建筑
    {
        id: 'r11',
        name: '高级熔炉',
        desc: '15石板 + 10燃油 → 1高级熔炉 (自动合成精炼石)',
        cost: { rb: 15, ry: 10 },
        result: { advanced_furnace: 1 },
        unlock: () => game.tech.auto_syn.level >= 3
    },
    {
        id: 'r12',
        name: '自动钻井平台',
        desc: '1高级机械框架 + 2智能芯片 + 5燃油 → 1自动钻井平台',
        cost: { frame: 1, smart_chip: 2, ry: 5 },
        result: { auto_drill_platform: 1 },
        unlock: () => game.deep >= 100
    },
    {
        id: 'r13',
        name: '炼油厂',
        desc: '10合金 + 5电路板 + 20燃油 → 1炼油厂',
        cost: { alloy: 10, circuit: 5, ry: 20 },
        result: { refinery: 1 },
        unlock: () => game.oll >= 100
    },
    {
        id: 'r14',
        name: '量子镐',
        desc: '1合金镐 + 3强化合金 + 1核心模块 + 2个5级压缩石板 → 1量子镐',
        cost: { alloy_pick: 1, strong_alloy: 3, core: 1, ys5: 2 },
        result: { quantum_pick: 1 },
        unlock: () => game.alloy_pick && game.step >= 1000
    },
    {
        id: 'r15',
        name: '量子钻头',
        desc: '1激光钻头 + 3智能芯片 + 1能量核心 → 1量子钻头',
        cost: { laser_drill: 1, smart_chip: 3, energy_core: 1 },
        result: { quantum_drill: 1 },
        unlock: () => game.laser_drill && game.deep >= 500
    },
    // 16-20级 终极神器和消耗品
    {
        id: 'r16',
        name: '时空碎片',
        desc: '1个5级压缩石板 + 1核心模块 + 5高能燃料 → 1时空碎片',
        cost: { ys5: 1, core: 1, hfuel: 5 },
        result: { time_shard: 1 },
        unlock: () => game.ys5 >= 1
    },
    {
        id: 'r17',
        name: '时间加速器',
        desc: '1时空碎片 + 50科学点 → 1时间加速器',
        cost: { time_shard: 1, step: 50 },
        result: { time_accelerator: 1 },
        unlock: () => game.time_shard >= 1
    },
    {
        id: 'r18',
        name: '能量核心（高级版）',
        desc: '1核心模块 + 2个5级压缩石板 + 3强化合金 → 1能量核心',
        cost: { core: 1, ys5: 2, strong_alloy: 3 },
        result: { energy_core: 1 },
        unlock: () => game.core >= 1 && game.ys5 >= 2
    },
    {
        id: 'r19',
        name: '超级燃油',
        desc: '5高能燃料 + 1智能芯片 → 1超级燃油',
        cost: { hfuel: 5, smart_chip: 1 },
        result: { super_fuel: 1 },
        unlock: () => game.smart_chip >= 1
    },
    {
        id: 'r20',
        name: '终极采石机',
        desc: '1智能采石机 + 1能量核心 + 2量子镐 → 1终极采石机',
        cost: { smart_cjq: 1, energy_core: 1, quantum_pick: 2 },
        result: { ultimate_cjq: 1 },
        unlock: () => game.smart_cjq >= 1 && game.quantum_pick && game.energy_core >= 1 && game.step >= 5000
    }
];

// 额外中间物（用于配方结果）
// strong_alloy, smart_chip, frame, instrument, strong_zt, strong_zg, super_drill,
// advanced_furnace, auto_drill_platform, refinery, quantum_pick, quantum_drill,
// time_shard, time_accelerator, energy_core, super_fuel, ultimate_cjq, super_cjq, smart_cjq

// 资源显示名称映射
const resNames = {
    rock: '石头',
    oll: '石油',
    ry: '燃油',
    jyr: '精炼石',
    rb: '石板',
    zt: '钻头',
    zg: '钻管',
    deep: '深度',
    stj: '采集效率',
    cjq: '采石机',
    alloy: '合金',
    circuit: '电路板',
    part: '零件',
    core: '核心模块',
    ys1: '1级压缩石板',
    ys2: '2级压缩石板',
    ys3: '3级压缩石板',
    ys4: '4级压缩石板',
    ys5: '5级压缩石板',
    hfuel: '高能燃料',
    super_fuel: '超级燃油',
    strong_alloy: '强化合金',
    smart_chip: '智能芯片',
    frame: '高级机械框架',
    instrument: '精密仪器',
    strong_zt: '强化钻头',
    strong_zg: '强化钻管',
    super_drill: '超级钻具',
    advanced_furnace: '高级熔炉',
    auto_drill_platform: '自动钻井平台',
    refinery: '炼油厂',
    quantum_pick: '量子镐',
    quantum_drill: '量子钻头',
    time_shard: '时空碎片',
    time_accelerator: '时间加速器',
    energy_core: '能量核心',
    super_cjq: '超级采石机',
    smart_cjq: '智能采石机',
    ultimate_cjq: '终极采石机'
};

// ---------- 辅助函数 ----------
function getRes(name) {
    if (name === 'step') return game.step;
    if (name === 'deep') return game.deep;
    if (name === 'stj') return game.stj;
    // 布尔值
    if (['sg','jlg','alloy_pick','laser_drill','auto_synth','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].includes(name)) {
        return game[name] ? 1 : 0;
    }
    return game[name] || 0;
}

function setRes(name, value) {
    if (name === 'step') { game.step = value; return; }
    if (name === 'deep') { game.deep = value; return; }
    if (name === 'stj') { game.stj = value; return; }
    if (['sg','jlg','alloy_pick','laser_drill','auto_synth','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].includes(name)) {
        game[name] = !!value;
        return;
    }
    game[name] = value;
}

// 检查配方是否可合成
function canCraft(recipe) {
    // 检查解锁条件
    if (recipe.unlock && !recipe.unlock()) return false;
    // 检查资源
    for (let key in recipe.cost) {
        let need = recipe.cost[key];
        let have = getRes(key);
        if (have < need) return false;
    }
    return true;
}

// 执行合成
function doCraft(recipe) {
    if (!canCraft(recipe)) return false;
    // 扣除
    for (let key in recipe.cost) {
        let need = recipe.cost[key];
        if (key === 'step') game.step -= need;
        else if (key === 'deep') game.deep -= need;
        else if (['sg','jlg','alloy_pick','laser_drill','auto_synth','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].includes(key)) {
            game[key] = false; // 消耗掉工具？
        } else {
            game[key] -= need;
        }
    }
    // 增加结果
    for (let key in recipe.result) {
        let amount = recipe.result[key];
        if (key === 'step') game.step += amount;
        else if (key === 'deep') game.deep += amount;
        else if (['sg','jlg','alloy_pick','laser_drill','auto_synth','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].includes(key)) {
            game[key] = true;
        } else {
            game[key] = (game[key] || 0) + amount;
        }
    }
    // 统计
    game.stats.total_jyr += 1;
    return true;
}

// ---------- 任务系统 ----------
const questTemplates = [
    { id: 'q1', desc: '采集 1000 石头', check: () => game.rock >= 1000, reward: { step: 10, rock: 500 } },
    { id: 'q2', desc: '合成 50 精炼石', check: () => game.jyr >= 50, reward: { step: 15, oll: 20 } },
    { id: 'q3', desc: '拥有 5 台采石机', check: () => game.cjq >= 5, reward: { step: 20, ry: 30 } },
    { id: 'q4', desc: '钻井深度达到 50 米', check: () => game.deep >= 50, reward: { step: 25, zt: 3 } },
    { id: 'q5', desc: '获得 10 个1级压缩石板', check: () => game.ys1 >= 10, reward: { step: 30, alloy: 2 } },
];

function initQuests() {
    game.quests = questTemplates.map(q => ({
        ...q,
        done: false,
        claimed: false
    }));
}

// ---------- 矿区系统 ----------
function initMinefields() {
    // 5个矿区，每个有储量
    game.minefields = [
        { id: 'm1', name: '浅层矿脉', depth: 0, rock: 5000, oll: 200, maxRock: 5000, maxOll: 200, cooldown: 0 },
        { id: 'm2', name: '中层矿脉', depth: 100, rock: 20000, oll: 800, maxRock: 20000, maxOll: 800, cooldown: 0 },
        { id: 'm3', name: '深层矿脉', depth: 500, rock: 50000, oll: 2000, maxRock: 50000, maxOll: 2000, cooldown: 0 },
        { id: 'm4', name: '稀有矿脉', depth: 1000, rock: 100000, oll: 5000, maxRock: 100000, maxOll: 5000, cooldown: 0 },
        { id: 'm5', name: '传奇矿脉', depth: 2000, rock: 500000, oll: 20000, maxRock: 500000, maxOll: 20000, cooldown: 0 }
    ];
}

// ---------- 统计面板 ----------
function getStats() {
    return {
        '总采集石头': game.stats.total_rock,
        '总获得石油': game.stats.total_oll,
        '总合成精炼石': game.stats.total_jyr,
        '总获得科学点': game.stats.total_step,
        '游玩时间(秒)': Math.floor(game.stats.play_time),
        '采石机总数': game.cjq + game.super_cjq + game.smart_cjq + game.ultimate_cjq,
        '钻井深度': game.deep,
        '当前采集效率': game.stj,
        '石油产量/分钟': Math.floor(game.deep*(game.deep+1)/2 * game.oil_bonus * (game.quantum_drill ? 4 : 1) * (game.laser_drill ? 2 : 1))
    };
}

// ---------- 挂机逻辑 ----------
function autoTick() {
    if (!game.isAutoRunning) return;
    // 计算每秒收益
    let rockPerSec = 0;
    let ollPerSec = 0;
    // 普通采石机
    rockPerSec += game.cjq * game.stj;
    // 超级采石机 (3倍)
    rockPerSec += game.super_cjq * game.stj * 3;
    // 智能采石机 (3*1.2=3.6倍)
    rockPerSec += game.smart_cjq * game.stj * 3.6;
    // 终极采石机 (100倍 + 自动石油)
    if (game.ultimate_cjq > 0) {
        rockPerSec += game.ultimate_cjq * game.stj * 100;
        ollPerSec += game.ultimate_cjq * 1;
    }
    // 时间加速器效果 (翻倍)
    let accel = 1;
    if (game.accelerator_time > 0) {
        accel = 2;
        game.accelerator_time -= 1;
        if (game.accelerator_time < 0) game.accelerator_time = 0;
    }
    // 超级燃油消耗（如果有，不消耗普通燃油）
    let fuelConsume = 0;
    if (game.super_fuel > 0) {
        // 超级燃油不消耗，挂机无限
        fuelConsume = 0;
    } else {
        // 普通燃油消耗：每分钟消耗 (采石机数 * 1/hang_efficiency)
        let machines = game.cjq + game.super_cjq + game.smart_cjq + game.ultimate_cjq;
        let consumePerMin = machines * (1 / game.hang_efficiency);
        fuelConsume = consumePerMin / 60; // 每秒
        if (game.ry >= fuelConsume) {
            game.ry -= fuelConsume;
        } else {
            // 燃油不足，停止挂机
            stopAuto();
            updateUI();
            return;
        }
    }
    // 获得资源
    let rockGain = rockPerSec * accel;
    let ollGain = ollPerSec * accel;
    // 钻井产量（每分钟产量/60）
    let baseOll = game.deep * (game.deep + 1) / 2 * game.oil_bonus;
    if (game.quantum_drill) baseOll *= 4;
    if (game.laser_drill) baseOll *= 2;
    ollGain += baseOll / 60;
    // 高能燃料不自动生产，需合成
    game.rock += Math.floor(rockGain);
    game.oll += Math.floor(ollGain);
    game.stats.total_rock += Math.floor(rockGain);
    game.stats.total_oll += Math.floor(ollGain);
    // 自动合成精炼石（高级熔炉）
    if (game.advanced_furnace) {
        // 每5秒自动合成一次，这里每秒检查
        if (Math.floor(Date.now() / 5000) % 2 === 0) { // 每5秒一次
            if (game.rock >= 100) {
                let can = Math.min(100, Math.floor(game.rock / 100));
                game.rock -= can * 100;
                game.jyr += can;
                game.stats.total_jyr += can;
            }
        }
    }
    // 自动钻井平台（每10分钟1格）
    if (game.auto_drill_platform) {
        if (game.zt > 0 && game.zg > 0 && Math.floor(Date.now() / 600000) % 1 === 0) {
            game.zt -= 1;
            game.zg -= 1;
            game.deep += 1;
        }
    }
    // 炼油厂自动转化石油→燃油
    if (game.refinery) {
        if (game.oll >= 1) {
            let convert = Math.min(1, game.oll);
            game.oll -= convert;
            game.ry += convert * 5;
        }
    }
    // 更新统计数据
    game.stats.play_time += 1;
    // 检查成就
    checkAchievements();
    // 更新UI
    updateUI();
}

let autoInterval = null;

function startAuto() {
    if (game.isAutoRunning) return;
    game.isAutoRunning = true;
    autoInterval = setInterval(autoTick, 1000);
    updateUI();
}

function stopAuto() {
    game.isAutoRunning = false;
    if (autoInterval) {
        clearInterval(autoInterval);
        autoInterval = null;
    }
    updateUI();
}

// ---------- 成就系统 ----------
const achievementDefs = [
    { id: 'a1', name: '采石新手', desc: '累计1000石头', check: () => game.stats.total_rock >= 1000, reward: 5 },
    { id: 'a2', name: '采石专家', desc: '累计100000石头', check: () => game.stats.total_rock >= 100000, reward: 20 },
    { id: 'a3', name: '石油大亨', desc: '累计100石油', check: () => game.stats.total_oll >= 100, reward: 10 },
    { id: 'a4', name: '钻井先锋', desc: '深度100米', check: () => game.deep >= 100, reward: 15 },
    { id: 'a5', name: '机械狂人', desc: '拥有10台采石机', check: () => (game.cjq+game.super_cjq+game.smart_cjq+game.ultimate_cjq) >= 10, reward: 25 },
    { id: 'a6', name: '合成大师', desc: '合成1000精炼石', check: () => game.stats.total_jyr >= 1000, reward: 30 },
    { id: 'a7', name: '石板收藏家', desc: '拥有100压缩石板', check: () => (game.ys1+game.ys2+game.ys3+game.ys4+game.ys5) >= 100, reward: 50 },
    { id: 'a8', name: '科技达人', desc: '科学点500', check: () => game.step >= 500, reward: 40 },
    { id: 'a9', name: '富甲一方', desc: '拥有1000燃油', check: () => game.ry >= 1000, reward: 60 },
    { id: 'a10', name: '终极钻探', desc: '深度1000米', check: () => game.deep >= 1000, reward: 100 }
];

function initAchievements() {
    game.achievements = achievementDefs.map(a => ({ ...a, unlocked: false }));
}

function checkAchievements() {
    game.achievements.forEach(ach => {
        if (!ach.unlocked && ach.check()) {
            ach.unlocked = true;
            game.step += ach.reward;
            game.stats.total_step += ach.reward;
            // 提示
            showMessage(`🏆 成就解锁: ${ach.name}，奖励 ${ach.reward} 科学点！`);
        }
    });
}

// ---------- 消息提示 ----------
function showMessage(msg) {
    const el = document.getElementById('save-msg');
    if (el) {
        el.textContent = msg;
        setTimeout(() => { el.textContent = ''; }, 5000);
    }
}

// ---------- UI渲染 ----------
function updateUI() {
    // 更新顶栏
    document.getElementById('stat-rock').textContent = Math.floor(game.rock);
    document.getElementById('stat-oll').textContent = Math.floor(game.oll);
    document.getElementById('stat-ry').textContent = Math.floor(game.ry);
    document.getElementById('stat-step').textContent = Math.floor(game.step);
    document.getElementById('stat-hfuel').textContent = game.hfuel;
    let offline = Math.floor((Date.now() - game.last_save) / 60000);
    document.getElementById('stat-offline').textContent = offline;
    // 更新当前标签页内容（如果可见）
    const active = document.querySelector('.tab-btn.active');
    if (active) {
        const tab = active.dataset.tab;
        switch (tab) {
            case 'main': renderMain(); break;
            case 'mine': renderMine(); break;
            case 'craft': renderCraft(); break;
            case 'inventory': renderInventory(); break;
            case 'science': renderScience(); break;
            case 'drill': renderDrill(); break;
            case 'auto': renderAuto(); break;
            case 'market': renderMarket(); break;
            case 'achievement': renderAchievement(); break;
            case 'quest': renderQuest(); break;
            case 'minefield': renderMinefield(); break;
            case 'stats': renderStats(); break;
        }
    }
}

// ---------- 渲染各页面 ----------
function renderMain() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h2>🏠 主菜单</h2>
        <p>欢迎来到猫国建设 · 终极版！</p>
        <div class="resource-row">
            <span>⛰️ 石头: ${Math.floor(game.rock)}</span>
            <span>🛢️ 石油: ${Math.floor(game.oll)}</span>
            <span>⛽ 燃油: ${Math.floor(game.ry)}</span>
            <span>🔮 科学点: ${Math.floor(game.step)}</span>
            <span>💰 高能燃料: ${game.hfuel}</span>
        </div>
        <div style="margin-top:12px;">
            <p>深度: ${game.deep} 米 | 采集效率: ${game.stj}</p>
            <p>采石机: ${game.cjg||0} 普通, ${game.super_cjq||0} 超级, ${game.smart_cjq||0} 智能, ${game.ultimate_cjq||0} 终极</p>
            <p>挂机状态: ${game.isAutoRunning ? '🟢 运行中' : '🔴 停止'}</p>
            <button onclick="startAuto()" ${game.isAutoRunning?'disabled':''}>▶ 开始挂机</button>
            <button onclick="stopAuto()" ${!game.isAutoRunning?'disabled':''}>⏹ 停止挂机</button>
        </div>
    `;
}

function renderMine() {
    const content = document.getElementById('content');
    let html = `<h2>⛏️ 采石模式</h2><p>点击按钮采集石头 (1%概率获得石油)</p>`;
    html += `<button onclick="doMine()">⛏️ 采集一次 (获得 ${game.stj} 石头)</button>`;
    html += `<div style="margin-top:10px;"><button onclick="doMine10()">⛏️ 采集10次</button></div>`;
    html += `<div style="margin-top:10px;">最近收获: <span id="mine-msg"></span></div>`;
    content.innerHTML = html;
}

function doMine() {
    let gain = game.stj;
    if (game.quantum_pick) gain *= 5;
    game.rock += gain;
    game.stats.total_rock += gain;
    let msg = `获得 ${gain} 石头`;
    if (Math.random() < 0.01) {
        game.oll += 1;
        game.stats.total_oll += 1;
        msg += ' 并获得1石油！';
    }
    document.getElementById('mine-msg').textContent = msg;
    updateUI();
}

function doMine10() {
    for (let i=0; i<10; i++) {
        let gain = game.stj;
        if (game.quantum_pick) gain *= 5;
        game.rock += gain;
        game.stats.total_rock += gain;
        if (Math.random() < 0.01) {
            game.oll += 1;
            game.stats.total_oll += 1;
        }
    }
    document.getElementById('mine-msg').textContent = '采集10次完成！';
    updateUI();
}

function renderCraft() {
    const content = document.getElementById('content');
    let html = `<h2>🔧 合成 (共${recipes.length}种)</h2><div class="craft-grid">`;
    recipes.forEach((recipe, idx) => {
        let can = canCraft(recipe);
        let unlock = recipe.unlock ? recipe.unlock() : true;
        let disabled = !can || !unlock;
        let reason = '';
        if (!unlock) reason = ' (未解锁)';
        else if (!can) reason = ' (资源不足)';
        html += `<div class="craft-item" style="${disabled?'opacity:0.6;':''}">
            <strong>${recipe.name}</strong><br>
            <small>${recipe.desc}</small><br>
            <span style="font-size:0.8rem;color:#aaa;">${reason}</span><br>
            <button onclick="doCraftById('${recipe.id}')" ${disabled?'disabled':''}>合成</button>
        </div>`;
    });
    html += `</div>`;
    content.innerHTML = html;
}

function doCraftById(id) {
    const recipe = recipes.find(r => r.id === id);
    if (recipe && doCraft(recipe)) {
        showMessage(`✅ 合成 ${recipe.name} 成功！`);
        updateUI();
    } else {
        showMessage('❌ 合成失败！');
    }
}

function renderInventory() {
    const content = document.getElementById('content');
    let html = `<h2>🎒 背包</h2><div class="resource-row">`;
    // 显示所有资源
    const resKeys = ['rock','oll','ry','jyr','rb','zt','zg','deep','stj','cjq','alloy','circuit','part','core',
        'ys1','ys2','ys3','ys4','ys5','hfuel','super_fuel','strong_alloy','smart_chip','frame','instrument',
        'strong_zt','strong_zg','super_drill','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill',
        'time_shard','time_accelerator','energy_core','super_cjq','smart_cjq','ultimate_cjq'];
    resKeys.forEach(k => {
        let val = getRes(k);
        if (val > 0 || (typeof val === 'boolean' && val)) {
            let display = (typeof val === 'boolean') ? (val ? '✅' : '❌') : val;
            html += `<span>${resNames[k]||k}: ${display}</span>`;
        }
    });
    html += `</div>`;
    content.innerHTML = html;
}

function renderScience() {
    const content = document.getElementById('content');
    let html = `<h2>🔬 科技升级</h2><p>科学点: ${Math.floor(game.step)}</p>`;
    const techs = [
        { key: 'tool', label: '工具升级', desc: '采集效率 +1%', max: 50, baseCost: 10 },
        { key: 'fac', label: '自动机械', desc: '采石机数量 +1%', max: 100, baseCost: 100 },
        { key: 'oil', label: '石油增产', desc: '石油产量 +2%', max: 80, baseCost: 50 },
        { key: 'hang', label: '挂机效率', desc: '燃油消耗 -2%', max: 60, baseCost: 30 },
        { key: 'auto_syn', label: '自动合成', desc: '开启/加速自动合成', max: 40, baseCost: 20 }
    ];
    techs.forEach(t => {
        let level = game.tech[t.key].level;
        let max = t.max;
        let cost = t.baseCost * level;
        let can = game.step >= cost && level < max;
        html += `<div style="background:#0f3460;padding:8px;border-radius:8px;margin:6px 0;">
            <strong>${t.label}</strong> 等级 ${level}/${max} ${level>=max?'[满级]':''}<br>
            <span>${t.desc}</span><br>
            ${level<max ? `升级费用: ${cost} 科学点` : ''}
            <button onclick="upgradeTech('${t.key}')" ${!can?'disabled':''}>升级</button>
        </div>`;
    });
    content.innerHTML = html;
}

function upgradeTech(key) {
    const tech = game.tech[key];
    if (!tech || tech.level >= tech.max) return;
    let cost = tech.st_co || 10 * tech.level; // 简化
    // 实际成本计算根据等级
    let baseCost = 10;
    if (key === 'tool') baseCost = 10;
    else if (key === 'fac') baseCost = 100;
    else if (key === 'oil') baseCost = 50;
    else if (key === 'hang') baseCost = 30;
    else if (key === 'auto_syn') baseCost = 20;
    let costNow = baseCost * tech.level;
    if (game.step < costNow) { showMessage('科学点不足'); return; }
    game.step -= costNow;
    tech.level++;
    // 应用效果
    if (key === 'tool') game.stj = Math.floor(game.stj * 1.01);
    else if (key === 'fac') game.cjq = Math.floor(game.cjq * 1.01);
    else if (key === 'oil') game.oil_bonus *= 1.02;
    else if (key === 'hang') game.hang_efficiency *= 1.02;
    else if (key === 'auto_syn') game.auto_synth = true;
    showMessage(`升级成功！`);
    updateUI();
}

function renderDrill() {
    const content = document.getElementById('content');
    let maxDrill = Math.min(game.zt, game.zg);
    let html = `<h2>🛠️ 钻井</h2><p>当前深度: ${game.deep} 米</p>
        <p>钻头: ${game.zt} | 钻管: ${game.zg}</p>
        <p>强化钻头: ${game.strong_zt} | 强化钻管: ${game.strong_zg} | 超级钻具: ${game.super_drill}</p>
        <p>石油产量: ${Math.floor(game.deep*(game.deep+1)/2 * game.oil_bonus * (game.quantum_drill?4:1) * (game.laser_drill?2:1))} 桶/分钟</p>`;
    html += `<div><input type="number" id="drill-count" value="1" min="1" max="${maxDrill}"> 
        <button onclick="doDrill()">下钻</button></div>`;
    if (game.super_drill > 0) {
        html += `<button onclick="doSuperDrill()">使用超级钻具 (1次下钻5格)</button>`;
    }
    content.innerHTML = html;
}

function doDrill() {
    let count = parseInt(document.getElementById('drill-count').value) || 1;
    let max = Math.min(game.zt, game.zg);
    if (count > max) { showMessage('钻头/钻管不足'); return; }
    game.zt -= count;
    game.zg -= count;
    game.deep += count;
    showMessage(`下钻 ${count} 格，当前深度 ${game.deep}`);
    updateUI();
}

function doSuperDrill() {
    if (game.super_drill <= 0) { showMessage('没有超级钻具'); return; }
    game.super_drill -= 1;
    game.deep += 5;
    showMessage('使用超级钻具，深度 +5');
    updateUI();
}

function renderAuto() {
    const content = document.getElementById('content');
    let html = `<h2>⚙️ 挂机管理</h2>
        <p>状态: ${game.isAutoRunning ? '🟢 运行中' : '🔴 停止'}</p>
        <p>普通采石机: ${game.cjq} | 超级: ${game.super_cjq} | 智能: ${game.smart_cjq} | 终极: ${game.ultimate_cjq}</p>
        <p>当前采集效率: ${game.stj} 石头/秒 (加成后)</p>
        <p>燃油消耗: ${(game.cjq+game.super_cjq+game.smart_cjq+game.ultimate_cjq) * (1/game.hang_efficiency)} 桶/分钟</p>
        <p>时间加速器剩余: ${game.accelerator_time}秒</p>
        <button onclick="startAuto()" ${game.isAutoRunning?'disabled':''}>▶ 启动挂机</button>
        <button onclick="stopAuto()" ${!game.isAutoRunning?'disabled':''}>⏹ 停止</button>
        <div style="margin-top:10px;">
            <button onclick="useAccelerator()">🚀 使用时间加速器 (剩余${game.time_accelerator}个)</button>
        </div>
    `;
    content.innerHTML = html;
}

function useAccelerator() {
    if (game.time_accelerator <= 0) { showMessage('没有时间加速器'); return; }
    game.time_accelerator -= 1;
    game.accelerator_time += 3600; // 1小时
    showMessage('使用时间加速器，挂机速度翻倍持续1小时！');
    updateUI();
}

function renderMarket() {
    const content = document.getElementById('content');
    let html = `<h2>🏪 市场</h2><div class="market-grid">`;
    const marketItems = [
        { name: '科学点数(小)', cost: { rock: 1000 }, reward: { step: 10 } },
        { name: '科学点数(大)', cost: { rock: 5000 }, reward: { step: 60 } },
        { name: '合金镐', cost: { oll: 50, jyr: 100 }, reward: { alloy_pick: true } },
        { name: '激光钻头', cost: { oll: 200, ry: 100, rb: 50 }, reward: { laser_drill: true } },
        { name: '核心模块', cost: { ry: 500, ys1: 10 }, reward: { core: 1 } },
    ];
    marketItems.forEach(item => {
        let can = true;
        let costStr = '';
        for (let k in item.cost) {
            if (getRes(k) < item.cost[k]) can = false;
            costStr += `${resNames[k]||k}:${item.cost[k]} `;
        }
        html += `<div class="market-item">
            <strong>${item.name}</strong><br>
            <span>${costStr}</span><br>
            <button onclick="buyMarketItem('${item.name}')" ${!can?'disabled':''}>购买</button>
        </div>`;
    });
    html += `</div>`;
    content.innerHTML = html;
}

function buyMarketItem(name) {
    // 简化，根据名称查找
    const items = [
        { name: '科学点数(小)', cost: { rock: 1000 }, reward: { step: 10 } },
        { name: '科学点数(大)', cost: { rock: 5000 }, reward: { step: 60 } },
        { name: '合金镐', cost: { oll: 50, jyr: 100 }, reward: { alloy_pick: true } },
        { name: '激光钻头', cost: { oll: 200, ry: 100, rb: 50 }, reward: { laser_drill: true } },
        { name: '核心模块', cost: { ry: 500, ys1: 10 }, reward: { core: 1 } },
    ];
    const item = items.find(i => i.name === name);
    if (!item) return;
    // 检查资源
    for (let k in item.cost) {
        if (getRes(k) < item.cost[k]) { showMessage('资源不足'); return; }
    }
    // 扣除
    for (let k in item.cost) {
        if (k === 'step') game.step -= item.cost[k];
        else if (k === 'deep') game.deep -= item.cost[k];
        else if (['sg','jlg','alloy_pick','laser_drill','auto_synth','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].includes(k)) {
            game[k] = false;
        } else {
            game[k] -= item.cost[k];
        }
    }
    // 奖励
    for (let k in item.reward) {
        if (k === 'step') game.step += item.reward[k];
        else if (k === 'deep') game.deep += item.reward[k];
        else if (['sg','jlg','alloy_pick','laser_drill','auto_synth','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].includes(k)) {
            game[k] = true;
        } else {
            game[k] = (game[k]||0) + item.reward[k];
        }
    }
    showMessage(`购买 ${item.name} 成功！`);
    updateUI();
}

function renderAchievement() {
    const content = document.getElementById('content');
    let html = `<h2>🏆 成就</h2>`;
    game.achievements.forEach(a => {
        html += `<div class="achieve-item ${a.unlocked?'done':''}">
            ${a.unlocked?'✅':'⬜'} <strong>${a.name}</strong> - ${a.desc} ${a.unlocked?'(已解锁)':''}
        </div>`;
    });
    content.innerHTML = html;
}

function renderQuest() {
    const content = document.getElementById('content');
    let html = `<h2>📋 任务</h2>`;
    game.quests.forEach(q => {
        let done = q.check();
        let claimed = q.claimed;
        html += `<div class="quest-item ${claimed?'done':''}">
            ${claimed?'✅':'⬜'} ${q.desc} ${done?'(已完成)':''}
            ${done && !claimed ? `<button onclick="claimQuest('${q.id}')">领取奖励</button>` : ''}
        </div>`;
    });
    content.innerHTML = html;
}

function claimQuest(id) {
    const q = game.quests.find(q => q.id === id);
    if (!q || !q.check() || q.claimed) return;
    q.claimed = true;
    for (let k in q.reward) {
        if (k === 'step') game.step += q.reward[k];
        else if (k === 'deep') game.deep += q.reward[k];
        else game[k] = (game[k]||0) + q.reward[k];
    }
    showMessage('任务奖励领取成功！');
    updateUI();
}

function renderMinefield() {
    const content = document.getElementById('content');
    let html = `<h2>🗺️ 矿区探索</h2><div class="minefield-grid">`;
    game.minefields.forEach(m => {
        let depleted = (m.rock <= 0 && m.oll <= 0);
        html += `<div class="mine-node ${depleted?'depleted':''}" onclick="exploreMine('${m.id}')">
            <strong>${m.name}</strong><br>
            石头: ${m.rock}/${m.maxRock}<br>
            石油: ${m.oll}/${m.maxOll}<br>
            ${depleted?'已枯竭':'点击探索'}
        </div>`;
    });
    html += `</div>`;
    content.innerHTML = html;
}

function exploreMine(id) {
    const mine = game.minefields.find(m => m.id === id);
    if (!mine) return;
    if (mine.rock <= 0 && mine.oll <= 0) { showMessage('矿区已枯竭'); return; }
    // 随机获取
    let rockGain = Math.floor(Math.random() * 50) + 10;
    let ollGain = Math.floor(Math.random() * 5) + 1;
    if (mine.rock < rockGain) rockGain = mine.rock;
    if (mine.oll < ollGain) ollGain = mine.oll;
    mine.rock -= rockGain;
    mine.oll -= ollGain;
    game.rock += rockGain;
    game.oll += ollGain;
    game.stats.total_rock += rockGain;
    game.stats.total_oll += ollGain;
    showMessage(`探索 ${mine.name}，获得 ${rockGain} 石头，${ollGain} 石油`);
    updateUI();
}

function renderStats() {
    const content = document.getElementById('content');
    let stats = getStats();
    let html = `<h2>📊 实时统计</h2><div class="stat-panel">`;
    for (let k in stats) {
        html += `<div class="stat-card"><strong>${k}</strong><br>${stats[k]}</div>`;
    }
    html += `</div>`;
    content.innerHTML = html;
}

// ---------- 存档 ----------
function saveGame() {
    game.last_save = Date.now();
    let data = JSON.stringify(game);
    localStorage.setItem('cat_game', data);
    showMessage('游戏已保存！');
}

function loadGame() {
    let data = localStorage.getItem('cat_game');
    if (!data) { showMessage('没有存档'); return; }
    try {
        let loaded = JSON.parse(data);
        // 合并到game，但保留一些结构
        Object.assign(game, loaded);
        // 重新初始化一些东西
        if (!game.quests || game.quests.length === 0) initQuests();
        if (!game.minefields || game.minefields.length === 0) initMinefields();
        if (!game.achievements || game.achievements.length === 0) initAchievements();
        // 计算离线收益
        let offlineSec = (Date.now() - game.last_save) / 1000;
        if (offlineSec > 10) {
            // 简单离线收益：按挂机效率计算
            let machines = game.cjq + game.super_cjq + game.smart_cjq + game.ultimate_cjq;
            let rockPerSec = machines * game.stj;
            if (game.ultimate_cjq > 0) rockPerSec += game.ultimate_cjq * game.stj * 100;
            let gain = Math.floor(rockPerSec * offlineSec * 0.5); // 离线效率50%
            game.rock += gain;
            game.stats.total_rock += gain;
            showMessage(`离线收益: ${gain} 石头`);
        }
        updateUI();
        showMessage('读取存档成功！');
    } catch(e) {
        showMessage('存档损坏');
    }
}

function resetGame() {
    if (!confirm('确定重置所有进度吗？')) return;
    localStorage.removeItem('cat_game');
    location.reload();
}

// ---------- 初始化 ----------
function init() {
    // 尝试加载
    let data = localStorage.getItem('cat_game');
    if (data) {
        try {
            let loaded = JSON.parse(data);
            Object.assign(game, loaded);
        } catch(e) {}
    }
    if (!game.quests || game.quests.length === 0) initQuests();
    if (!game.minefields || game.minefields.length === 0) initMinefields();
    if (!game.achievements || game.achievements.length === 0) initAchievements();
    // 设置初始资源（如果为空）
    if (game.rock === 0 && game.oll === 0 && game.ry === 0) {
        game.rock = 100;
        game.oll = 10;
        game.ry = 20;
    }
    // 挂机状态重置
    game.isAutoRunning = false;
    if (game.autoTimer) clearInterval(game.autoTimer);

    // 标签切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderPage(this.dataset.tab);
        });
    });
    // 默认显示主菜单
    document.querySelector('.tab-btn[data-tab="main"]').classList.add('active');
    renderPage('main');

    // 保存按钮
    document.getElementById('save-btn').addEventListener('click', saveGame);
    document.getElementById('load-btn').addEventListener('click', loadGame);
    document.getElementById('reset-btn').addEventListener('click', resetGame);

    // 每秒更新UI
    setInterval(updateUI, 1000);
}

function renderPage(tab) {
    switch(tab) {
        case 'main': renderMain(); break;
        case 'mine': renderMine(); break;
        case 'craft': renderCraft(); break;
        case 'inventory': renderInventory(); break;
        case 'science': renderScience(); break;
        case 'drill': renderDrill(); break;
        case 'auto': renderAuto(); break;
        case 'market': renderMarket(); break;
        case 'achievement': renderAchievement(); break;
        case 'quest': renderQuest(); break;
        case 'minefield': renderMinefield(); break;
        case 'stats': renderStats(); break;
        default: renderMain();
    }
}

window.onload = init;
