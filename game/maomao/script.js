// ============================================================
// 猫国建设 · 终极版  JavaScript
// ============================================================

// ---------- 数据模型 ----------
const game = {
    rock: 0, oll: 0, ry: 0, jyr: 0, rb: 0, zt: 0, zg: 0,
    deep: 0, stj: 1, cjq: 0,
    alloy: 0, circuit: 0, part: 0, core: 0,
    ys1: 0, ys2: 0, ys3: 0, ys4: 0, ys5: 0,
    sg: false, jlg: false, alloy_pick: false, laser_drill: false,
    oil_bonus: 1.0, hang_efficiency: 1.0, auto_synth: false,
    hfuel: 0, super_fuel: 0,
    super_cjq: 0, smart_cjq: 0, ultimate_cjq: 0,
    strong_zt: 0, strong_zg: 0, super_drill: 0,
    advanced_furnace: false, auto_drill_platform: false, refinery: false,
    quantum_pick: false, quantum_drill: false,
    time_accelerator: 0,
    step: 0,
    tech: {
        tool: { level: 1, max: 50, st_co: 10 },
        fac: { level: 1, max: 100, st_co: 100 },
        oil: { level: 1, max: 80, st_co: 50 },
        hang: { level: 1, max: 60, st_co: 30 },
        auto_syn: { level: 1, max: 40, st_co: 20 }
    },
    achievements: [],
    quests: [],
    minefields: [],
    stats: {
        total_rock: 0, total_oll: 0, total_jyr: 0, total_step: 0, play_time: 0
    },
    last_save: Date.now(),
    isAutoRunning: false,
    autoTimer: null,
    accelerator_time: 0,
    strong_alloy: 0,
    smart_chip: 0,
    frame: 0,
    instrument: 0,
    time_shard: 0,
    energy_core: 0
};

// ---------- 资源名称映射 ----------
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
    if (['sg','jlg','alloy_pick','laser_drill','auto_synth','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].includes(name))
        return game[name] ? 1 : 0;
    return game[name] || 0;
}

function setRes(name, value) {
    if (name === 'step') { game.step = value; return; }
    if (name === 'deep') { game.deep = value; return; }
    if (name === 'stj') { game.stj = value; return; }
    if (['sg','jlg','alloy_pick','laser_drill','auto_synth','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].includes(name)) {
        game[name] = !!value; return;
    }
    game[name] = value;
}

// ---------- 基础合成配方 ----------
const baseRecipes = [
    { id: 'b1', name: '精炼石', desc: '100石头 -> 1精炼石', cost: { rock: 100 }, result: { jyr: 1 }, unlock: null },
    { id: 'b2', name: '石板', desc: '100精炼石 -> 1石板', cost: { jyr: 100 }, result: { rb: 1 }, unlock: null },
    { id: 'b3', name: '石镐', desc: '50石头 -> 1石镐 (采集效率变为5)', cost: { rock: 50 }, result: { sg: true, stj: 5 }, unlock: function() { return !game.sg; } },
    { id: 'b4', name: '精炼镐', desc: '50精炼石 -> 1精炼镐 (采集效率+45)', cost: { jyr: 50 }, result: { jlg: true }, unlock: function() { return !game.jlg && game.sg; } },
    { id: 'b5', name: '自动采石机', desc: '10精炼石 -> 1自动采石机', cost: { jyr: 10 }, result: { cjq: 1 }, unlock: null },
    { id: 'b6', name: '燃油', desc: '1石油 -> 5燃油', cost: { oll: 1 }, result: { ry: 5 }, unlock: null },
    { id: 'b7', name: '钻头', desc: '10石板 -> 1钻头', cost: { rb: 10 }, result: { zt: 1 }, unlock: null },
    { id: 'b8', name: '钻管', desc: '100精炼石 -> 1钻管', cost: { jyr: 100 }, result: { zg: 1 }, unlock: null },
    { id: 'b10', name: '合金', desc: '50石板 + 50精炼石 -> 1合金', cost: { rb: 50, jyr: 50 }, result: { alloy: 1 }, unlock: null },
    { id: 'b11', name: '电路板', desc: '10合金 + 20石油 -> 1电路板', cost: { alloy: 10, oll: 20 }, result: { circuit: 1 }, unlock: null },
    { id: 'b12', name: '零件', desc: '5电路板 + 50燃油 -> 1零件', cost: { circuit: 5, ry: 50 }, result: { part: 1 }, unlock: null },
    { id: 'b13', name: '核心模块', desc: '3零件 + 2个1级压缩石板 -> 1核心模块', cost: { part: 3, ys1: 2 }, result: { core: 1 }, unlock: null }
];

// ---------- 高级合成配方 (20级) ----------
const advancedRecipes = [
    { id: 'r1', name: '强化合金', desc: '2合金 + 1电路板 -> 1强化合金', cost: { alloy: 2, circuit: 1 }, result: { strong_alloy: 1 }, unlock: function() { return game.tech.oil.level >= 5 || game.circuit >= 10; } },
    { id: 'r2', name: '智能芯片', desc: '1核心模块 + 2电路板 -> 1智能芯片', cost: { core: 1, circuit: 2 }, result: { smart_chip: 1 }, unlock: function() { return game.core >= 1 && game.step >= 200; } },
    { id: 'r3', name: '高级机械框架', desc: '10个1级压缩石板 + 2零件 -> 1高级机械框架', cost: { ys1: 10, part: 2 }, result: { frame: 1 }, unlock: function() { return game.ys1 >= 10; } },
    { id: 'r4', name: '精密仪器', desc: '1合金 + 2电路板 + 5燃油 -> 1精密仪器', cost: { alloy: 1, circuit: 2, ry: 5 }, result: { instrument: 1 }, unlock: function() { return game.circuit >= 5; } },
    { id: 'r5', name: '高能燃料', desc: '1石油 + 1个1级压缩石板 -> 10高能燃料', cost: { oll: 1, ys1: 1 }, result: { hfuel: 10 }, unlock: function() { return game.ys1 >= 1; } },
    { id: 'r6', name: '超级采石机', desc: '1高级机械框架 + 3零件 + 5电路板 -> 1超级采石机', cost: { frame: 1, part: 3, circuit: 5 }, result: { super_cjq: 1 }, unlock: function() { return game.cjq >= 5; } },
    { id: 'r7', name: '智能采石机', desc: '1超级采石机 + 1智能芯片 + 10燃油 -> 1智能采石机', cost: { super_cjq: 1, smart_chip: 1, ry: 10 }, result: { smart_cjq: 1 }, unlock: function() { return game.super_cjq >= 1; } },
    { id: 'r8', name: '强化钻头', desc: '5钻头 + 1合金 -> 1强化钻头', cost: { zt: 5, alloy: 1 }, result: { strong_zt: 1 }, unlock: function() { return game.zt >= 10; } },
    { id: 'r9', name: '强化钻管', desc: '5钻管 + 2石板 -> 1强化钻管', cost: { zg: 5, rb: 2 }, result: { strong_zg: 1 }, unlock: function() { return game.zg >= 10; } },
    { id: 'r10', name: '超级钻具', desc: '1强化钻头 + 1强化钻管 + 2合金 -> 1超级钻具', cost: { strong_zt: 1, strong_zg: 1, alloy: 2 }, result: { super_drill: 1 }, unlock: function() { return game.strong_zt >= 1 && game.strong_zg >= 1; } },
    { id: 'r11', name: '高级熔炉', desc: '15石板 + 10燃油 -> 1高级熔炉', cost: { rb: 15, ry: 10 }, result: { advanced_furnace: true }, unlock: function() { return game.tech.auto_syn.level >= 3; } },
    { id: 'r12', name: '自动钻井平台', desc: '1高级机械框架 + 2智能芯片 + 5燃油 -> 1自动钻井平台', cost: { frame: 1, smart_chip: 2, ry: 5 }, result: { auto_drill_platform: true }, unlock: function() { return game.deep >= 100; } },
    { id: 'r13', name: '炼油厂', desc: '10合金 + 5电路板 + 20燃油 -> 1炼油厂', cost: { alloy: 10, circuit: 5, ry: 20 }, result: { refinery: true }, unlock: function() { return game.oll >= 100; } },
    { id: 'r14', name: '量子镐', desc: '1合金镐 + 3强化合金 + 1核心模块 + 2个5级压缩石板 -> 1量子镐', cost: { alloy_pick: 1, strong_alloy: 3, core: 1, ys5: 2 }, result: { quantum_pick: true }, unlock: function() { return game.alloy_pick && game.step >= 1000; } },
    { id: 'r15', name: '量子钻头', desc: '1激光钻头 + 3智能芯片 + 1能量核心 -> 1量子钻头', cost: { laser_drill: 1, smart_chip: 3, energy_core: 1 }, result: { quantum_drill: true }, unlock: function() { return game.laser_drill && game.deep >= 500; } },
    { id: 'r16', name: '时空碎片', desc: '1个5级压缩石板 + 1核心模块 + 5高能燃料 -> 1时空碎片', cost: { ys5: 1, core: 1, hfuel: 5 }, result: { time_shard: 1 }, unlock: function() { return game.ys5 >= 1; } },
    { id: 'r17', name: '时间加速器', desc: '1时空碎片 + 50科学点 -> 1时间加速器', cost: { time_shard: 1, step: 50 }, result: { time_accelerator: 1 }, unlock: function() { return game.time_shard >= 1; } },
    { id: 'r18', name: '能量核心', desc: '1核心模块 + 2个5级压缩石板 + 3强化合金 -> 1能量核心', cost: { core: 1, ys5: 2, strong_alloy: 3 }, result: { energy_core: 1 }, unlock: function() { return game.core >= 1 && game.ys5 >= 2; } },
    { id: 'r19', name: '超级燃油', desc: '5高能燃料 + 1智能芯片 -> 1超级燃油', cost: { hfuel: 5, smart_chip: 1 }, result: { super_fuel: 1 }, unlock: function() { return game.smart_chip >= 1; } },
    { id: 'r20', name: '终极采石机', desc: '1智能采石机 + 1能量核心 + 2量子镐 -> 1终极采石机', cost: { smart_cjq: 1, energy_core: 1, quantum_pick: 2 }, result: { ultimate_cjq: 1 }, unlock: function() { return game.smart_cjq >= 1 && game.quantum_pick && game.energy_core >= 1 && game.step >= 5000; } }
];

// 合并所有配方
const allRecipes = baseRecipes.concat(advancedRecipes);

// ---------- 合成函数 ----------
function canCraft(recipe) {
    if (recipe.unlock && !recipe.unlock()) return false;
    for (var key in recipe.cost) {
        var need = recipe.cost[key];
        var have = getRes(key);
        if (have < need) return false;
    }
    return true;
}

function doCraft(recipe) {
    if (!canCraft(recipe)) return false;
    for (var key in recipe.cost) {
        var need = recipe.cost[key];
        if (key === 'step') game.step -= need;
        else if (key === 'deep') game.deep -= need;
        else if (['sg','jlg','alloy_pick','laser_drill','auto_synth','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].indexOf(key) !== -1) {
            game[key] = false;
        } else {
            game[key] -= need;
        }
    }
    for (var key2 in recipe.result) {
        var amount = recipe.result[key2];
        if (key2 === 'step') game.step += amount;
        else if (key2 === 'deep') game.deep += amount;
        else if (['sg','jlg','alloy_pick','laser_drill','auto_synth','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].indexOf(key2) !== -1) {
            game[key2] = true;
        } else {
            game[key2] = (game[key2] || 0) + amount;
        }
    }
    game.stats.total_jyr += 1;
    return true;
}

// 压缩石板
function compressStone() {
    var changed = false;
    while (game.rb >= 1000) {
        var cnt = Math.floor(game.rb / 1000);
        game.ys1 += cnt;
        game.rb %= 1000;
        changed = true;
    }
    while (game.ys1 >= 1000) {
        var cnt2 = Math.floor(game.ys1 / 1000);
        game.ys2 += cnt2;
        game.ys1 %= 1000;
        changed = true;
    }
    while (game.ys2 >= 1000) {
        var cnt3 = Math.floor(game.ys2 / 1000);
        game.ys3 += cnt3;
        game.ys2 %= 1000;
        changed = true;
    }
    while (game.ys3 >= 1000) {
        var cnt4 = Math.floor(game.ys3 / 1000);
        game.ys4 += cnt4;
        game.ys3 %= 1000;
        changed = true;
    }
    while (game.ys4 >= 1000) {
        var cnt5 = Math.floor(game.ys4 / 1000);
        game.ys5 += cnt5;
        game.ys4 %= 1000;
        changed = true;
    }
    if (changed) {
        showMessage('压缩石板完成！');
        updateUI();
    } else {
        showMessage('没有足够的石板进行压缩');
    }
}

// ---------- 任务系统 ----------
var questTemplates = [
    { id: 'q1', desc: '采集 1000 石头', check: function() { return game.rock >= 1000; }, reward: { step: 10, rock: 500 } },
    { id: 'q2', desc: '合成 50 精炼石', check: function() { return game.jyr >= 50; }, reward: { step: 15, oll: 20 } },
    { id: 'q3', desc: '拥有 5 台采石机', check: function() { return game.cjq >= 5; }, reward: { step: 20, ry: 30 } },
    { id: 'q4', desc: '钻井深度达到 50 米', check: function() { return game.deep >= 50; }, reward: { step: 25, zt: 3 } },
    { id: 'q5', desc: '获得 10 个1级压缩石板', check: function() { return game.ys1 >= 10; }, reward: { step: 30, alloy: 2 } }
];

function initQuests() {
    game.quests = questTemplates.map(function(q) {
        return { id: q.id, desc: q.desc, check: q.check, reward: q.reward, done: false, claimed: false };
    });
}

// ---------- 矿区系统 ----------
function initMinefields() {
    game.minefields = [
        { id: 'm1', name: '浅层矿脉', depth: 0, rock: 5000, oll: 200, maxRock: 5000, maxOll: 200, cooldown: 0 },
        { id: 'm2', name: '中层矿脉', depth: 100, rock: 20000, oll: 800, maxRock: 20000, maxOll: 800, cooldown: 0 },
        { id: 'm3', name: '深层矿脉', depth: 500, rock: 50000, oll: 2000, maxRock: 50000, maxOll: 2000, cooldown: 0 },
        { id: 'm4', name: '稀有矿脉', depth: 1000, rock: 100000, oll: 5000, maxRock: 100000, maxOll: 5000, cooldown: 0 },
        { id: 'm5', name: '传奇矿脉', depth: 2000, rock: 500000, oll: 20000, maxRock: 500000, maxOll: 20000, cooldown: 0 }
    ];
}

// ---------- 成就系统 ----------
var achievementDefs = [
    { id: 'a1', name: '采石新手', desc: '累计1000石头', check: function() { return game.stats.total_rock >= 1000; }, reward: 5 },
    { id: 'a2', name: '采石专家', desc: '累计100000石头', check: function() { return game.stats.total_rock >= 100000; }, reward: 20 },
    { id: 'a3', name: '石油大亨', desc: '累计100石油', check: function() { return game.stats.total_oll >= 100; }, reward: 10 },
    { id: 'a4', name: '钻井先锋', desc: '深度100米', check: function() { return game.deep >= 100; }, reward: 15 },
    { id: 'a5', name: '机械狂人', desc: '拥有10台采石机', check: function() { return (game.cjq + game.super_cjq + game.smart_cjq + game.ultimate_cjq) >= 10; }, reward: 25 },
    { id: 'a6', name: '合成大师', desc: '合成1000精炼石', check: function() { return game.stats.total_jyr >= 1000; }, reward: 30 },
    { id: 'a7', name: '石板收藏家', desc: '拥有100压缩石板', check: function() { return (game.ys1 + game.ys2 + game.ys3 + game.ys4 + game.ys5) >= 100; }, reward: 50 },
    { id: 'a8', name: '科技达人', desc: '科学点500', check: function() { return game.step >= 500; }, reward: 40 },
    { id: 'a9', name: '富甲一方', desc: '拥有1000燃油', check: function() { return game.ry >= 1000; }, reward: 60 },
    { id: 'a10', name: '终极钻探', desc: '深度1000米', check: function() { return game.deep >= 1000; }, reward: 100 }
];

function initAchievements() {
    game.achievements = achievementDefs.map(function(a) {
        return { id: a.id, name: a.name, desc: a.desc, check: a.check, reward: a.reward, unlocked: false };
    });
}

function checkAchievements() {
    for (var i = 0; i < game.achievements.length; i++) {
        var ach = game.achievements[i];
        if (!ach.unlocked && ach.check()) {
            ach.unlocked = true;
            game.step += ach.reward;
            game.stats.total_step += ach.reward;
            alert('成就解锁: ' + ach.name + '\n奖励 ' + ach.reward + ' 科学点！');
            showMessage('成就解锁: ' + ach.name + '，奖励 ' + ach.reward + ' 科学点！');
        }
    }
}

// ---------- 消息提示 ----------
function showMessage(msg) {
    var el = document.getElementById('save-msg');
    if (el) {
        el.textContent = msg;
        setTimeout(function() { el.textContent = ''; }, 5000);
    }
}

// ---------- 挂机逻辑 ----------
function autoTick() {
    if (!game.isAutoRunning) return;
    var rockPerSec = 0;
    var ollPerSec = 0;
    rockPerSec += game.cjq * game.stj;
    rockPerSec += game.super_cjq * game.stj * 3;
    rockPerSec += game.smart_cjq * game.stj * 3.6;
    if (game.ultimate_cjq > 0) {
        rockPerSec += game.ultimate_cjq * game.stj * 100;
        ollPerSec += game.ultimate_cjq * 1;
    }
    var accel = 1;
    if (game.accelerator_time > 0) {
        accel = 2;
        game.accelerator_time -= 1;
        if (game.accelerator_time < 0) game.accelerator_time = 0;
    }
    var fuelConsume = 0;
    if (game.super_fuel > 0) {
        // 不消耗
    } else {
        var machines = game.cjq + game.super_cjq + game.smart_cjq + game.ultimate_cjq;
        var consumePerMin = machines * (1 / game.hang_efficiency);
        fuelConsume = consumePerMin / 60;
        if (game.ry >= fuelConsume) {
            game.ry -= fuelConsume;
        } else {
            stopAuto();
            showMessage('燃油不足，挂机停止');
            updateUI();
            return;
        }
    }
    var rockGain = rockPerSec * accel;
    var ollGain = ollPerSec * accel;
    var baseOll = game.deep * (game.deep + 1) / 2 * game.oil_bonus;
    if (game.quantum_drill) baseOll *= 4;
    if (game.laser_drill) baseOll *= 2;
    ollGain += baseOll / 60;
    game.rock += Math.floor(rockGain);
    game.oll += Math.floor(ollGain);
    game.stats.total_rock += Math.floor(rockGain);
    game.stats.total_oll += Math.floor(ollGain);
    if (game.advanced_furnace) {
        if (Math.floor(Date.now() / 5000) % 2 === 0) {
            if (game.rock >= 100) {
                var can = Math.min(100, Math.floor(game.rock / 100));
                game.rock -= can * 100;
                game.jyr += can;
                game.stats.total_jyr += can;
            }
        }
    }
    if (game.auto_drill_platform) {
        if (game.zt > 0 && game.zg > 0 && Math.floor(Date.now() / 600000) % 1 === 0) {
            game.zt -= 1;
            game.zg -= 1;
            game.deep += 1;
        }
    }
    if (game.refinery) {
        if (game.oll >= 1) {
            var convert = Math.min(1, game.oll);
            game.oll -= convert;
            game.ry += convert * 5;
        }
    }
    game.stats.play_time += 1;
    checkAchievements();
    updateUI();
}

var autoInterval = null;

function startAuto() {
    if (game.isAutoRunning) return;
    game.isAutoRunning = true;
    autoInterval = setInterval(autoTick, 1000);
    showMessage('挂机已启动');
    updateUI();
}

function stopAuto() {
    game.isAutoRunning = false;
    if (autoInterval) {
        clearInterval(autoInterval);
        autoInterval = null;
    }
    showMessage('挂机已停止');
    updateUI();
}

// ---------- 统计 ----------
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
        '石油产量/分钟': Math.floor(game.deep * (game.deep + 1) / 2 * game.oil_bonus * (game.quantum_drill ? 4 : 1) * (game.laser_drill ? 2 : 1))
    };
}

// ---------- UI更新 ----------
function updateUI() {
    document.getElementById('stat-rock').textContent = Math.floor(game.rock);
    document.getElementById('stat-oll').textContent = Math.floor(game.oll);
    document.getElementById('stat-ry').textContent = Math.floor(game.ry);
    document.getElementById('stat-step').textContent = Math.floor(game.step);
    document.getElementById('stat-hfuel').textContent = game.hfuel;
    var offline = Math.floor((Date.now() - game.last_save) / 60000);
    document.getElementById('stat-offline').textContent = offline;
    var active = document.querySelector('.tab-btn.active');
    if (active) {
        var tab = active.dataset.tab;
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

// ---------- 页面渲染 ----------
function renderMain() {
    var content = document.getElementById('content');
    content.innerHTML = '<h2>主菜单</h2>' +
        '<p>欢迎来到猫国建设 · 终极版</p>' +
        '<div class="resource-row">' +
            '<span>石头: ' + Math.floor(game.rock) + '</span>' +
            '<span>石油: ' + Math.floor(game.oll) + '</span>' +
            '<span>燃油: ' + Math.floor(game.ry) + '</span>' +
            '<span>科学点: ' + Math.floor(game.step) + '</span>' +
            '<span>高能燃料: ' + game.hfuel + '</span>' +
        '</div>' +
        '<div style="margin-top:12px;">' +
            '<p>深度: ' + game.deep + ' 米 | 采集效率: ' + game.stj + '</p>' +
            '<p>采石机: ' + game.cjq + ' 普通, ' + (game.super_cjq||0) + ' 超级, ' + (game.smart_cjq||0) + ' 智能, ' + (game.ultimate_cjq||0) + ' 终极</p>' +
            '<p>挂机状态: ' + (game.isAutoRunning ? '运行中' : '停止') + '</p>' +
            '<button class="btn btn-success" onclick="startAuto()" ' + (game.isAutoRunning ? 'disabled' : '') + '>启动挂机</button> ' +
            '<button class="btn btn-danger" onclick="stopAuto()" ' + (!game.isAutoRunning ? 'disabled' : '') + '>停止挂机</button>' +
        '</div>';
}

function renderMine() {
    var content = document.getElementById('content');
    content.innerHTML = '<h2>采石模式</h2>' +
        '<p>当前采集效率: ' + game.stj + ' 石头/次 ' + (game.quantum_pick ? '(量子镐x5)' : '') + (game.alloy_pick ? '(合金镐x2)' : '') + '</p>' +
        '<p>点击按钮采集石头，1%概率获得石油</p>' +
        '<div style="margin:10px 0;">' +
            '<button class="btn btn-primary" onclick="doMine()">采集一次</button> ' +
            '<button class="btn btn-warning" onclick="doMine10()">采集10次</button>' +
        '</div>' +
        '<div>最近收获: <span id="mine-msg"></span></div>';
}

function doMine() {
    var gain = game.stj;
    if (game.quantum_pick) gain *= 5;
    game.rock += gain;
    game.stats.total_rock += gain;
    var msg = '获得 ' + gain + ' 石头';
    if (Math.random() < 0.01) {
        game.oll += 1;
        game.stats.total_oll += 1;
        msg += ' 并获得1石油！';
    }
    document.getElementById('mine-msg').textContent = msg;
    checkAchievements();
    updateUI();
}

function doMine10() {
    for (var i = 0; i < 10; i++) {
        var gain = game.stj;
        if (game.quantum_pick) gain *= 5;
        game.rock += gain;
        game.stats.total_rock += gain;
        if (Math.random() < 0.01) {
            game.oll += 1;
            game.stats.total_oll += 1;
        }
    }
    document.getElementById('mine-msg').textContent = '采集10次完成！';
    checkAchievements();
    updateUI();
}

function renderCraft() {
    var content = document.getElementById('content');
    var html = '<h2>合成</h2>';
    html += '<div class="section-title">基础合成</div><div class="craft-grid">';
    for (var i = 0; i < baseRecipes.length; i++) {
        var recipe = baseRecipes[i];
        var can = canCraft(recipe);
        var unlock = recipe.unlock ? recipe.unlock() : true;
        var disabled = !can || !unlock;
        var reason = '';
        if (!unlock) reason = ' (未解锁)';
        else if (!can) reason = ' (资源不足)';
        var hasBoolCost = false;
        for (var key in recipe.cost) {
            if (['sg','jlg','alloy_pick','laser_drill','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill','auto_synth'].indexOf(key) !== -1) {
                hasBoolCost = true;
                break;
            }
        }
        var inputHtml = '';
        if (!hasBoolCost) {
            inputHtml = '<input type="number" id="craft-count-' + recipe.id + '" value="1" min="1" step="1" style="width:70px;padding:5px;border-radius:8px;border:1px solid #555;background:#1a1a2e;color:#eee;text-align:center;">';
        }
        html += '<div class="craft-item" style="' + (disabled ? 'opacity:0.6;' : '') + '">' +
            '<strong>' + recipe.name + '</strong><br>' +
            '<small>' + recipe.desc + '</small><br>' +
            '<span style="font-size:0.8rem;color:#aaa;">' + reason + '</span><br>' +
            '<div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:6px; align-items:center;">' +
                inputHtml +
                '<button class="btn btn-primary" onclick="doCraftWithCount(\'' + recipe.id + '\')" ' + (disabled ? 'disabled' : '') + '>合成</button>' +
                (!hasBoolCost ? '<button class="btn btn-warning" onclick="doCraftMax(\'' + recipe.id + '\')" ' + (disabled ? 'disabled' : '') + '>一键合成</button>' : '') +
            '</div>' +
        '</div>';
    }
    html += '</div>';
    html += '<div class="section-title">高级合成 (20级)</div><div class="craft-grid">';
    for (var j = 0; j < advancedRecipes.length; j++) {
        var recipe2 = advancedRecipes[j];
        var can2 = canCraft(recipe2);
        var unlock2 = recipe2.unlock ? recipe2.unlock() : true;
        var disabled2 = !can2 || !unlock2;
        var reason2 = '';
        if (!unlock2) reason2 = ' (未解锁)';
        else if (!can2) reason2 = ' (资源不足)';
        var hasBoolCost2 = false;
        for (var key2 in recipe2.cost) {
            if (['sg','jlg','alloy_pick','laser_drill','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill','auto_synth'].indexOf(key2) !== -1) {
                hasBoolCost2 = true;
                break;
            }
        }
        var inputHtml2 = '';
        if (!hasBoolCost2) {
            inputHtml2 = '<input type="number" id="craft-count-' + recipe2.id + '" value="1" min="1" step="1" style="width:70px;padding:5px;border-radius:8px;border:1px solid #555;background:#1a1a2e;color:#eee;text-align:center;">';
        }
        html += '<div class="craft-item" style="' + (disabled2 ? 'opacity:0.6;' : '') + '">' +
            '<strong>' + recipe2.name + '</strong><br>' +
            '<small>' + recipe2.desc + '</small><br>' +
            '<span style="font-size:0.8rem;color:#aaa;">' + reason2 + '</span><br>' +
            '<div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:6px; align-items:center;">' +
                inputHtml2 +
                '<button class="btn btn-purple" onclick="doCraftWithCount(\'' + recipe2.id + '\')" ' + (disabled2 ? 'disabled' : '') + '>合成</button>' +
                (!hasBoolCost2 ? '<button class="btn btn-warning" onclick="doCraftMax(\'' + recipe2.id + '\')" ' + (disabled2 ? 'disabled' : '') + '>一键合成</button>' : '') +
            '</div>' +
        '</div>';
    }
    html += '</div>';
    html += '<div style="margin-top:16px;">' +
        '<button class="btn btn-warning" onclick="compressStone()">压缩石板 (1000合1)</button>' +
    '</div>';
    content.innerHTML = html;
}

function doCraftById(id) {
    var recipe = null;
    for (var i = 0; i < allRecipes.length; i++) {
        if (allRecipes[i].id === id) { recipe = allRecipes[i]; break; }
    }
    if (recipe && doCraft(recipe)) {
        showMessage('合成 ' + recipe.name + ' 成功！');
        checkAchievements();
        updateUI();
    } else {
        showMessage('合成失败！');
    }
}

function doCraftWithCount(id) {
    var recipe = null;
    for (var i = 0; i < allRecipes.length; i++) {
        if (allRecipes[i].id === id) { recipe = allRecipes[i]; break; }
    }
    if (!recipe) return;
    var count = 1;
    var hasBoolCost = false;
    for (var key in recipe.cost) {
        if (['sg','jlg','alloy_pick','laser_drill','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill','auto_synth'].indexOf(key) !== -1) {
            hasBoolCost = true;
            break;
        }
    }
    if (!hasBoolCost) {
        var input = document.getElementById('craft-count-' + id);
        if (input) {
            count = parseInt(input.value) || 1;
            if (count < 1) count = 1;
        }
    }
    doCraftMultiple(recipe, count);
}

function doCraftMax(id) {
    var recipe = null;
    for (var i = 0; i < allRecipes.length; i++) {
        if (allRecipes[i].id === id) { recipe = allRecipes[i]; break; }
    }
    if (!recipe) return;
    var maxCount = Infinity;
    for (var key in recipe.cost) {
        var need = recipe.cost[key];
        var have = getRes(key);
        var can = Math.floor(have / need);
        if (can < maxCount) maxCount = can;
    }
    if (maxCount === Infinity || maxCount < 1) {
        showMessage('无法合成');
        return;
    }
    doCraftMultiple(recipe, maxCount);
}

function doCraftMultiple(recipe, count) {
    if (count < 1) { showMessage('数量必须大于0'); return; }
    for (var key in recipe.cost) {
        var need = recipe.cost[key];
        var have = getRes(key);
        if (have < need * count) {
            showMessage('资源不足，最多可合成 ' + Math.floor(have/need) + ' 个');
            return;
        }
    }
    for (var i = 0; i < count; i++) {
        for (var key2 in recipe.cost) {
            var need2 = recipe.cost[key2];
            if (key2 === 'step') game.step -= need2;
            else if (key2 === 'deep') game.deep -= need2;
            else if (['sg','jlg','alloy_pick','laser_drill','auto_synth','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].indexOf(key2) !== -1) {
                game[key2] = false;
            } else {
                game[key2] -= need2;
            }
        }
        for (var key3 in recipe.result) {
            var amount = recipe.result[key3];
            if (key3 === 'step') game.step += amount;
            else if (key3 === 'deep') game.deep += amount;
            else if (['sg','jlg','alloy_pick','laser_drill','auto_synth','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].indexOf(key3) !== -1) {
                game[key3] = true;
            } else {
                game[key3] = (game[key3] || 0) + amount;
            }
        }
    }
    game.stats.total_jyr += count;
    showMessage('成功合成 ' + count + ' 个 ' + recipe.name);
    checkAchievements();
    updateUI();
}

function renderInventory() {
    var content = document.getElementById('content');
    var html = '<h2>背包</h2><div class="resource-row">';
    var resKeys = ['rock','oll','ry','jyr','rb','zt','zg','deep','stj','cjq','alloy','circuit','part','core',
        'ys1','ys2','ys3','ys4','ys5','hfuel','super_fuel','strong_alloy','smart_chip','frame','instrument',
        'strong_zt','strong_zg','super_drill','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill',
        'time_shard','time_accelerator','energy_core','super_cjq','smart_cjq','ultimate_cjq'];
    for (var i = 0; i < resKeys.length; i++) {
        var k = resKeys[i];
        var val = getRes(k);
        if (val > 0 || (typeof val === 'boolean' && val)) {
            var display = (typeof val === 'boolean') ? (val ? '有' : '无') : val;
            html += '<span>' + (resNames[k] || k) + ': ' + display + '</span>';
        }
    }
    html += '</div>';
    content.innerHTML = html;
}

function renderScience() {
    var content = document.getElementById('content');
    var html = '<h2>科技升级</h2><p>科学点: ' + Math.floor(game.step) + '</p>';
    var techs = [
        { key: 'tool', label: '工具升级', desc: '采集效率 +1%', max: 50, baseCost: 10 },
        { key: 'fac', label: '自动机械', desc: '采石机数量 +1%', max: 100, baseCost: 100 },
        { key: 'oil', label: '石油增产', desc: '石油产量 +2%', max: 80, baseCost: 50 },
        { key: 'hang', label: '挂机效率', desc: '燃油消耗 -2%', max: 60, baseCost: 30 },
        { key: 'auto_syn', label: '自动合成', desc: '开启/加速自动合成', max: 40, baseCost: 20 }
    ];
    for (var i = 0; i < techs.length; i++) {
        var t = techs[i];
        var level = game.tech[t.key].level;
        var max = t.max;
        var cost = t.baseCost * level;
        var can = game.step >= cost && level < max;
        html += '<div style="background:#0f3460;padding:8px;border-radius:8px;margin:6px 0;">' +
            '<strong>' + t.label + '</strong> 等级 ' + level + '/' + max + (level >= max ? ' [满级]' : '') + '<br>' +
            '<span>' + t.desc + '</span><br>' +
            (level < max ? '升级费用: ' + cost + ' 科学点' : '') +
            '<button class="btn btn-info" onclick="upgradeTech(\'' + t.key + '\')" ' + (!can ? 'disabled' : '') + '>升级</button>' +
        '</div>';
    }
    content.innerHTML = html;
}

function upgradeTech(key) {
    var tech = game.tech[key];
    if (!tech || tech.level >= tech.max) return;
    var cost = tech.st_co * tech.level;
    if (game.step < cost) { showMessage('科学点不足'); return; }
    game.step -= cost;
    tech.level++;
    if (key === 'tool') game.stj = Math.floor(game.stj * 1.01);
    else if (key === 'fac') game.cjq = Math.floor(game.cjq * 1.01);
    else if (key === 'oil') game.oil_bonus *= 1.02;
    else if (key === 'hang') game.hang_efficiency *= 1.02;
    else if (key === 'auto_syn') game.auto_synth = true;
    showMessage('升级成功！');
    checkAchievements();
    updateUI();
}

function renderDrill() {
    var content = document.getElementById('content');
    var maxDrill = Math.min(game.zt, game.zg);
    var html = '<h2>钻井</h2>' +
        '<p>当前深度: ' + game.deep + ' 米</p>' +
        '<p>钻头: ' + game.zt + ' | 钻管: ' + game.zg + '</p>' +
        '<p>强化钻头: ' + game.strong_zt + ' | 强化钻管: ' + game.strong_zg + ' | 超级钻具: ' + game.super_drill + '</p>' +
        '<p>石油产量: ' + Math.floor(game.deep * (game.deep + 1) / 2 * game.oil_bonus * (game.quantum_drill ? 4 : 1) * (game.laser_drill ? 2 : 1)) + ' 桶/分钟</p>' +
        '<div style="margin:10px 0; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">' +
            '<label style="display:flex; align-items:center; gap:6px;">' +
                '下钻格数: ' +
                '<input type="number" id="drill-count" value="1" min="1" max="' + maxDrill + '" style="width:80px; padding:6px 10px; border-radius:8px; border:1px solid #555; background:#1a1a2e; color:#eee; font-size:1rem; text-align:center;">' +
            '</label>' +
            '<button class="btn btn-primary" onclick="doDrill()">下钻</button>' +
            (game.super_drill > 0 ? '<button class="btn btn-warning" onclick="doSuperDrill()">超级钻具 (5格)</button>' : '') +
        '</div>';
    content.innerHTML = html;
}

function doDrill() {
    var count = parseInt(document.getElementById('drill-count').value) || 1;
    var max = Math.min(game.zt, game.zg);
    if (count > max) { showMessage('钻头/钻管不足'); return; }
    game.zt -= count;
    game.zg -= count;
    game.deep += count;
    showMessage('下钻 ' + count + ' 格，当前深度 ' + game.deep);
    checkAchievements();
    updateUI();
}

function doSuperDrill() {
    if (game.super_drill <= 0) { showMessage('没有超级钻具'); return; }
    game.super_drill -= 1;
    game.deep += 5;
    showMessage('使用超级钻具，深度 +5');
    checkAchievements();
    updateUI();
}

function renderAuto() {
    var content = document.getElementById('content');
    var html = '<h2>挂机管理</h2>' +
        '<p>状态: ' + (game.isAutoRunning ? '运行中' : '停止') + '</p>' +
        '<p>普通采石机: ' + game.cjq + ' | 超级: ' + game.super_cjq + ' | 智能: ' + game.smart_cjq + ' | 终极: ' + game.ultimate_cjq + '</p>' +
        '<p>当前采集效率: ' + game.stj + ' 石头/秒</p>' +
        '<p>燃油消耗: ' + ((game.cjq + game.super_cjq + game.smart_cjq + game.ultimate_cjq) * (1 / game.hang_efficiency)) + ' 桶/分钟</p>' +
        '<p>时间加速器剩余: ' + game.accelerator_time + '秒</p>' +
        '<div style="margin:10px 0;">' +
            '<button class="btn btn-success" onclick="startAuto()" ' + (game.isAutoRunning ? 'disabled' : '') + '>启动挂机</button> ' +
            '<button class="btn btn-danger" onclick="stopAuto()" ' + (!game.isAutoRunning ? 'disabled' : '') + '>停止</button> ' +
            '<button class="btn btn-cyan" onclick="useAccelerator()">使用时间加速器 (剩余' + game.time_accelerator + '个)</button>' +
        '</div>';
    content.innerHTML = html;
}

function useAccelerator() {
    if (game.time_accelerator <= 0) { showMessage('没有时间加速器'); return; }
    game.time_accelerator -= 1;
    game.accelerator_time += 3600;
    showMessage('使用时间加速器，挂机速度翻倍持续1小时！');
    updateUI();
}

function renderMarket() {
    var content = document.getElementById('content');
    var html = '<h2>市场</h2><div class="market-grid">';
    var marketItems = [
        { name: '科学点数(小)', cost: { rock: 1000 }, reward: { step: 10 } },
        { name: '科学点数(大)', cost: { rock: 5000 }, reward: { step: 60 } },
        { name: '合金镐', cost: { oll: 50, jyr: 100 }, reward: { alloy_pick: true } },
        { name: '激光钻头', cost: { oll: 200, ry: 100, rb: 50 }, reward: { laser_drill: true } },
        { name: '核心模块', cost: { ry: 500, ys1: 10 }, reward: { core: 1 } }
    ];
    for (var i = 0; i < marketItems.length; i++) {
        var item = marketItems[i];
        var can = true;
        var costStr = '';
        for (var key in item.cost) {
            if (getRes(key) < item.cost[key]) can = false;
            costStr += (resNames[key] || key) + ':' + item.cost[key] + ' ';
        }
        html += '<div class="market-item">' +
            '<strong>' + item.name + '</strong><br>' +
            '<span>' + costStr + '</span><br>' +
            '<button class="btn btn-primary" onclick="buyMarketItem(\'' + item.name + '\')" ' + (!can ? 'disabled' : '') + '>购买</button>' +
        '</div>';
    }
    html += '</div>';
    content.innerHTML = html;
}

function buyMarketItem(name) {
    var items = [
        { name: '科学点数(小)', cost: { rock: 1000 }, reward: { step: 10 } },
        { name: '科学点数(大)', cost: { rock: 5000 }, reward: { step: 60 } },
        { name: '合金镐', cost: { oll: 50, jyr: 100 }, reward: { alloy_pick: true } },
        { name: '激光钻头', cost: { oll: 200, ry: 100, rb: 50 }, reward: { laser_drill: true } },
        { name: '核心模块', cost: { ry: 500, ys1: 10 }, reward: { core: 1 } }
    ];
    var item = null;
    for (var i = 0; i < items.length; i++) {
        if (items[i].name === name) { item = items[i]; break; }
    }
    if (!item) return;
    for (var key in item.cost) {
        if (getRes(key) < item.cost[key]) { showMessage('资源不足'); return; }
    }
    for (var key2 in item.cost) {
        if (key2 === 'step') game.step -= item.cost[key2];
        else if (key2 === 'deep') game.deep -= item.cost[key2];
        else if (['sg','jlg','alloy_pick','laser_drill','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].indexOf(key2) !== -1) {
            game[key2] = false;
        } else {
            game[key2] -= item.cost[key2];
        }
    }
    for (var key3 in item.reward) {
        if (key3 === 'step') game.step += item.reward[key3];
        else if (key3 === 'deep') game.deep += item.reward[key3];
        else if (['sg','jlg','alloy_pick','laser_drill','advanced_furnace','auto_drill_platform','refinery','quantum_pick','quantum_drill'].indexOf(key3) !== -1) {
            game[key3] = true;
        } else {
            game[key3] = (game[key3] || 0) + item.reward[key3];
        }
    }
    showMessage('购买 ' + item.name + ' 成功！');
    checkAchievements();
    updateUI();
}

function renderAchievement() {
    var content = document.getElementById('content');
    var html = '<h2>成就</h2>';
    for (var i = 0; i < game.achievements.length; i++) {
        var a = game.achievements[i];
        html += '<div class="achieve-item ' + (a.unlocked ? 'done' : '') + '">' +
            (a.unlocked ? '[解锁]' : '[未解锁]') + ' <strong>' + a.name + '</strong> - ' + a.desc + (a.unlocked ? ' (已解锁)' : '') +
        '</div>';
    }
    content.innerHTML = html;
}

function renderQuest() {
    var content = document.getElementById('content');
    var html = '<h2>任务</h2>';
    for (var i = 0; i < game.quests.length; i++) {
        var q = game.quests[i];
        var done = q.check();
        var claimed = q.claimed;
        html += '<div class="quest-item ' + (claimed ? 'done' : '') + '">' +
            (claimed ? '[完成]' : '[进行中]') + ' ' + q.desc + (done ? ' (已完成)' : '') +
            (done && !claimed ? '<button class="btn btn-success" onclick="claimQuest(\'' + q.id + '\')">领取奖励</button>' : '') +
        '</div>';
    }
    content.innerHTML = html;
}

function claimQuest(id) {
    var q = null;
    for (var i = 0; i < game.quests.length; i++) {
        if (game.quests[i].id === id) { q = game.quests[i]; break; }
    }
    if (!q || !q.check() || q.claimed) return;
    q.claimed = true;
    for (var key in q.reward) {
        if (key === 'step') game.step += q.reward[key];
        else if (key === 'deep') game.deep += q.reward[key];
        else game[key] = (game[key] || 0) + q.reward[key];
    }
    showMessage('任务奖励领取成功！');
    checkAchievements();
    updateUI();
}

function renderMinefield() {
    var content = document.getElementById('content');
    var html = '<h2>矿区探索</h2><div class="minefield-grid">';
    for (var i = 0; i < game.minefields.length; i++) {
        var m = game.minefields[i];
        var depleted = (m.rock <= 0 && m.oll <= 0);
        html += '<div class="mine-node ' + (depleted ? 'depleted' : '') + '" onclick="exploreMine(\'' + m.id + '\')">' +
            '<strong>' + m.name + '</strong><br>' +
            '石头: ' + m.rock + '/' + m.maxRock + '<br>' +
            '石油: ' + m.oll + '/' + m.maxOll + '<br>' +
            (depleted ? '已枯竭' : '点击探索') +
        '</div>';
    }
    html += '</div>';
    content.innerHTML = html;
}

function exploreMine(id) {
    var mine = null;
    for (var i = 0; i < game.minefields.length; i++) {
        if (game.minefields[i].id === id) { mine = game.minefields[i]; break; }
    }
    if (!mine) return;
    if (mine.rock <= 0 && mine.oll <= 0) { showMessage('矿区已枯竭'); return; }
    var rockGain = Math.floor(Math.random() * 50) + 10;
    var ollGain = Math.floor(Math.random() * 5) + 1;
    if (mine.rock < rockGain) rockGain = mine.rock;
    if (mine.oll < ollGain) ollGain = mine.oll;
    mine.rock -= rockGain;
    mine.oll -= ollGain;
    game.rock += rockGain;
    game.oll += ollGain;
    game.stats.total_rock += rockGain;
    game.stats.total_oll += ollGain;
    showMessage('探索 ' + mine.name + '，获得 ' + rockGain + ' 石头，' + ollGain + ' 石油');
    checkAchievements();
    updateUI();
}

function renderStats() {
    var content = document.getElementById('content');
    var stats = getStats();
    var html = '<h2>实时统计</h2><div class="stat-panel">';
    for (var key in stats) {
        html += '<div class="stat-card"><strong>' + key + '</strong><br>' + stats[key] + '</div>';
    }
    html += '</div>';
    content.innerHTML = html;
}

// ---------- 存档 ----------
function saveGame() {
    game.last_save = Date.now();
    localStorage.setItem('cat_game', JSON.stringify(game));
    showMessage('游戏已保存！');
}

function loadGame() {
    var data = localStorage.getItem('cat_game');
    if (!data) { showMessage('没有存档'); return; }
    try {
        var loaded = JSON.parse(data);
        for (var key in loaded) {
            game[key] = loaded[key];
        }
        if (!game.quests || game.quests.length === 0) initQuests();
        if (!game.minefields || game.minefields.length === 0) initMinefields();
        if (!game.achievements || game.achievements.length === 0) initAchievements();
        var offlineSec = (Date.now() - game.last_save) / 1000;
        if (offlineSec > 10) {
            var machines = game.cjq + game.super_cjq + game.smart_cjq + game.ultimate_cjq;
            var rockPerSec = machines * game.stj;
            if (game.ultimate_cjq > 0) rockPerSec += game.ultimate_cjq * game.stj * 100;
            var gain = Math.floor(rockPerSec * offlineSec * 0.5);
            game.rock += gain;
            game.stats.total_rock += gain;
            showMessage('离线收益: ' + gain + ' 石头');
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
    var data = localStorage.getItem('cat_game');
    if (data) {
        try {
            var loaded = JSON.parse(data);
            for (var key in loaded) {
                game[key] = loaded[key];
            }
        } catch(e) {}
    }
    if (!game.quests || game.quests.length === 0) initQuests();
    if (!game.minefields || game.minefields.length === 0) initMinefields();
    if (!game.achievements || game.achievements.length === 0) initAchievements();
    if (game.rock === 0 && game.oll === 0 && game.ry === 0) {
        game.rock = 100;
        game.oll = 10;
        game.ry = 20;
    }
    game.isAutoRunning = false;
    if (game.autoTimer) clearInterval(game.autoTimer);

    var tabs = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < tabs.length; i++) {
        (function(btn) {
            btn.addEventListener('click', function() {
                var allTabs = document.querySelectorAll('.tab-btn');
                for (var j = 0; j < allTabs.length; j++) {
                    allTabs[j].classList.remove('active');
                }
                this.classList.add('active');
                renderPage(this.dataset.tab);
            });
        })(tabs[i]);
    }
    document.querySelector('.tab-btn[data-tab="main"]').classList.add('active');
    renderPage('main');

    document.getElementById('save-btn').addEventListener('click', saveGame);
    document.getElementById('load-btn').addEventListener('click', loadGame);
    document.getElementById('reset-btn').addEventListener('click', resetGame);

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
