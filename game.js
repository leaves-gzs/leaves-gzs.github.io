// ================================================================
// game.js - 塔防游戏完整逻辑
// 移植自 C++ Win32 版本，使用 Canvas 2D 绘制
// ================================================================

// ---------- 严格模式 ----------
"use strict";

// ---------- 常量 ----------
const WIN_WIDTH = 800;
const WIN_HEIGHT = 600;
const INIT_GOLD = 800;
const INIT_LIVES = 20;
const SPAWN_INTERVAL = 0.8;
const MAX_DAMAGE_MULTIPLIER = 256.0;

// ---------- 颜色工具 ----------
function COLOR(r, g, b) {
    return `rgb(${r|0},${g|0},${b|0})`;
}

// ---------- 距离函数 ----------
function distance(x1, y1, x2, y2) {
    const dx = x1 - x2, dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

// ---------- 路径 ----------
let g_path = [];
function initPath() {
    g_path = [
        { x: 0, y: 300 },
        { x: 150, y: 300 },
        { x: 150, y: 100 },
        { x: 450, y: 100 },
        { x: 450, y: 400 },
        { x: 800, y: 400 }
    ];
}
initPath();

// ---------- 枚举 ----------
const GameDifficulty = {
    DIFF_EASY: 0,
    DIFF_NORMAL: 1,
    DIFF_HARD: 2,
    DIFF_HELL: 3
};

const EnemyType = {
    ET_NORMAL: 0,
    ET_FAST: 1,
    ET_TANK: 2,
    ET_ELITE: 3,
    ET_GHOST: 4,
    ET_GIANT: 5,
    ET_ATTACK_MELEE: 6,
    ET_ATTACK_RANGED: 7,
    ET_BOSS1: 8,
    ET_BOSS2: 9,
    ET_BOSS3: 10,
    ET_SUMMONER: 11,
    ET_WAR_CRY: 12
};

const TurretType = {
    TT_NORMAL: 0,
    TT_SNIPER: 1,
    TT_RAPID: 2,
    TT_TANK: 3,
    TT_HEAL: 4,
    TT_SPIKE: 5,
    TT_ICE: 6,
    TT_HEAT: 7,
    TT_GRAVITY: 8,
    TT_WIND: 9,
    TT_TELEPORT: 10,
    TT_RESONANCE: 11,
    TT_SOUL_LINK: 12,
    TT_TOXIC_CATALYST: 13,
    TT_STATIC_ATTACH: 14
};

const WeaponType = {
    WT_IRON_SWORD: 0,
    WT_THUNDER_BLADE: 1,
    WT_DEATH_SWORD: 2,
    WT_CRUSH_HAMMER: 3,
    WT_BLOOD_EDGE: 4,
    WT_INFINITY_EDGE: 5,
    WT_BLACK_CLEAVER: 6,
    WT_ENDLESS: 7,
    WT_CRESCENT: 8,
    WT_MASTER: 9,
    WT_DAWN: 10,
    WT_EXECUTIONER: 11,
    WT_HAT: 12,
    WT_BOOK: 13,
    WT_VOID: 14,
    WT_TORMENT: 15,
    WT_ECHO: 16,
    WT_VAMPIRE: 17,
    WT_MOON: 18,
    WT_NIGHTMARE: 19,
    WT_THORNS: 20,
    WT_FROST: 21,
    WT_OMEN: 22,
    WT_CLOAK: 23,
    WT_PHOENIX: 24,
    WT_BULWARK: 25
};

// ---------- 全局游戏指针 ----------
let g_gamePtr = null;

// ================================================================
// Bullet 类
// ================================================================
class Bullet {
    constructor(start, target, source, speed, damage, isCritical = false, critMultiplier = 1.5) {
        this.pos = { x: start.x, y: start.y };
        this.target = target;
        this.source = source;
        this.speed = speed;
        this.damage = damage;
        this.active = true;
        this.isCritical = isCritical;
        this.critMultiplier = critMultiplier;
    }

    update(dt) {
        if (!this.active || !this.target || !this.target.alive) {
            this.active = false;
            return;
        }
        const dx = this.target.pos.x - this.pos.x;
        const dy = this.target.pos.y - this.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const move = this.speed * dt;
        if (move >= dist) {
            let finalDamage = this.damage;
            if (this.isCritical) finalDamage = Math.floor(this.damage * this.critMultiplier);
            const killed = this.target.takeDamage(finalDamage);
            if (this.source && g_gamePtr) {
                const ls = g_gamePtr.getLifeStealBonus();
                if (ls > 0) {
                    const healAmount = Math.floor(finalDamage * ls);
                    this.source.heal(healAmount);
                }
            }
            this.active = false;
            return;
        }
        this.pos.x += (dx / dist) * move;
        this.pos.y += (dy / dist) * move;
    }

    draw(ctx) {
        if (!this.active) return;
        const color = this.isCritical ? COLOR(255, 50, 50) : COLOR(255, 255, 0);
        ctx.fillStyle = color;
        const size = this.isCritical ? 7 : 4;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ================================================================
// Turret 类
// ================================================================
class Turret {
    constructor(x, y, type = TurretType.TT_NORMAL) {
        this.pos = { x, y };
        this.type = type;
        this.level = 1;
        this.cooldown = 0;
        this.target = null;
        this.isDead = false;
        this.range = 180;
        this.baseRange = 180;
        this.damage = 12;
        this.fireRate = 1.2;
        this.cost = 50;
        this.hp = 120;
        this.maxHp = 120;
        this.healRate = 0;
        this.baseDamage = 12;
        this.baseFireRate = 1.2;
        this.baseBulletSpeed = 220;
        this.baseHealRate = 0;
        this.baseHp = 120;
        this.iceDuration = 0;
        this.iceTimer = 0;
        this.iceActive = false;
        this.icePos = { x: 0, y: 0 };
        this.invincible = false;
        this.autoHealTimer = 0;
        this.reviveTimer = 0;
        this.reviveCooldown = 0;
        this.soulReturnCD = 0;

        // 特殊炮塔状态
        this.heatTarget = null;
        this.heatAccumulate = 0;
        this.heatDamage = 0;
        this.gravityTimer = 0;
        this.gravityCenter = { x: 0, y: 0 };
        this.gravityActive = false;
        this.windBuffRange = 150;
        this.teleportCD = 10;
        this.teleportTimer = 0;

        // 新炮塔
        this.resonanceTargets = [];
        this.resonanceTimer = 0;
        this.soulLinkTarget = null;
        this.soulLinkTimer = 0;
        this.soulLinkDamageAccum = 0;
        this.poisonTimer = 0;
        this.staticTargets = [];

        // 根据类型初始化
        switch (type) {
            case TurretType.TT_NORMAL:
                this.range = 180;
                this.baseDamage = 12;
                this.baseFireRate = 1.2;
                this.baseBulletSpeed = 220;
                this.cost = 50;
                this.baseHp = 120;
                this.baseHealRate = 0;
                break;
            case TurretType.TT_SNIPER:
                this.range = 280;
                this.baseDamage = 30;
                this.baseFireRate = 0.6;
                this.baseBulletSpeed = 320;
                this.cost = 80;
                this.baseHp = 120;
                this.baseHealRate = 0;
                break;
            case TurretType.TT_RAPID:
                this.range = 120;
                this.baseDamage = 6;
                this.baseFireRate = 3.5;
                this.baseBulletSpeed = 280;
                this.cost = 40;
                this.baseHp = 120;
                this.baseHealRate = 0;
                break;
            case TurretType.TT_TANK:
                this.range = 130;
                this.baseDamage = 6;
                this.baseFireRate = 0.9;
                this.baseBulletSpeed = 220;
                this.cost = 60;
                this.baseHp = 1200;
                this.baseHealRate = 0;
                break;
            case TurretType.TT_HEAL:
                this.range = 160;
                this.baseDamage = 0;
                this.baseFireRate = 0;
                this.baseBulletSpeed = 0;
                this.cost = 70;
                this.baseHp = 160;
                this.baseHealRate = 12;
                break;
            case TurretType.TT_SPIKE:
                this.range = 0;
                this.baseDamage = 25;
                this.baseFireRate = 0.6;
                this.baseBulletSpeed = 0;
                this.cost = 30;
                this.baseHp = 9999;
                this.baseHealRate = 0;
                break;
            case TurretType.TT_ICE:
                this.range = 0;
                this.baseDamage = 0;
                this.baseFireRate = 0;
                this.baseBulletSpeed = 0;
                this.cost = 500;
                this.baseHp = 220;
                this.baseHealRate = 0;
                this.iceDuration = 3.5;
                break;
            case TurretType.TT_HEAT:
                this.range = 200;
                this.baseDamage = 5;
                this.baseFireRate = 0.1;
                this.baseBulletSpeed = 0;
                this.cost = 1000;
                this.baseHp = 300;
                this.baseHealRate = 0;
                break;
            case TurretType.TT_GRAVITY:
                this.range = 200;
                this.baseDamage = 0;
                this.baseFireRate = 0;
                this.baseBulletSpeed = 0;
                this.cost = 1000;
                this.baseHp = 300;
                this.baseHealRate = 0;
                break;
            case TurretType.TT_WIND:
                this.range = 0;
                this.baseDamage = 0;
                this.baseFireRate = 0;
                this.baseBulletSpeed = 0;
                this.cost = 1000;
                this.baseHp = 300;
                this.baseHealRate = 0;
                break;
            case TurretType.TT_TELEPORT:
                this.range = 0;
                this.baseDamage = 0;
                this.baseFireRate = 0;
                this.baseBulletSpeed = 0;
                this.cost = 500;
                this.baseHp = 200;
                this.baseHealRate = 0;
                break;
            case TurretType.TT_RESONANCE:
                this.range = 180;
                this.baseDamage = 2;
                this.baseFireRate = 1.5;
                this.baseBulletSpeed = 0;
                this.cost = 500;
                this.baseHp = 200;
                this.baseHealRate = 0;
                break;
            case TurretType.TT_SOUL_LINK:
                this.range = 250;
                this.baseDamage = 0;
                this.baseFireRate = 0;
                this.baseBulletSpeed = 0;
                this.cost = 500;
                this.baseHp = 200;
                this.baseHealRate = 0;
                break;
            case TurretType.TT_TOXIC_CATALYST:
                this.range = 180;
                this.baseDamage = 3;
                this.baseFireRate = 1.0;
                this.baseBulletSpeed = 0;
                this.cost = 500;
                this.baseHp = 200;
                this.baseHealRate = 0;
                break;
            case TurretType.TT_STATIC_ATTACH:
                this.range = 200;
                this.baseDamage = 2;
                this.baseFireRate = 1.2;
                this.baseBulletSpeed = 0;
                this.cost = 500;
                this.baseHp = 200;
                this.baseHealRate = 0;
                break;
        }
        this.damage = this.baseDamage * this.level;
        this.fireRate = this.baseFireRate * this.level;
        this.healRate = this.baseHealRate * this.level;
        this.maxHp = this.baseHp * this.level;
        this.hp = this.maxHp;
        this.baseRange = this.range;
    }

    autoHeal(dt) {
        if (this.type !== TurretType.TT_TANK || this.isDead || this.hp >= this.maxHp) return;
        this.autoHealTimer += dt;
        while (this.autoHealTimer >= 1.0) {
            this.autoHealTimer -= 1.0;
            this.hp += 15;
            if (this.hp > this.maxHp) this.hp = this.maxHp;
        }
    }

    triggerRevive() {
        if (this.isDead) return;
        this.invincible = true;
        this.reviveTimer = 2.5;
        this.hp = Math.floor(this.maxHp / 2);
        if (this.hp < 1) this.hp = 1;
        this.reviveCooldown = 5.0;
    }

    triggerSoulReturn() {
        if (this.isDead || this.soulReturnCD > 0 || this.hp / this.maxHp > 0.3) return;
        this.hp += 500 + Math.floor(Math.random() * 250);
        if (this.hp > this.maxHp) this.hp = this.maxHp;
        this.soulReturnCD = 18.0;
    }

    findTarget(enemies) {
        if (this.isDead) return;
        if (this.type === TurretType.TT_HEAT) {
            if (this.heatTarget && this.heatTarget.alive) {
                const d = distance(this.pos.x, this.pos.y, this.heatTarget.pos.x, this.heatTarget.pos.y);
                if (d <= this.range) { this.target = this.heatTarget; return; }
            }
            let maxHp = -1;
            let best = null;
            for (const e of enemies) {
                if (!e.alive) continue;
                const d = distance(this.pos.x, this.pos.y, e.pos.x, e.pos.y);
                if (d <= this.range && e.maxHp > maxHp) {
                    maxHp = e.maxHp;
                    best = e;
                }
            }
            this.heatTarget = best;
            this.target = best;
            if (!best) this.heatAccumulate = 0;
            return;
        }
        if (this.type === TurretType.TT_GRAVITY || this.type === TurretType.TT_WIND ||
            this.type === TurretType.TT_TELEPORT || this.type === TurretType.TT_SOUL_LINK) {
            this.target = null;
            return;
        }
        this.target = null;
        let minDist = this.range;
        for (const e of enemies) {
            if (!e.alive) continue;
            const d = distance(this.pos.x, this.pos.y, e.pos.x, e.pos.y);
            if (d < minDist) {
                minDist = d;
                this.target = e;
            }
        }
    }

    countEnemiesNearby(enemies, radius) {
        let c = 0;
        for (const e of enemies) {
            if (e.alive && distance(this.pos.x, this.pos.y, e.pos.x, e.pos.y) < radius) c++;
        }
        return c;
    }

    healNearby(turrets, dt) {
        if (this.isDead || this.type !== TurretType.TT_HEAL) return;
        for (const t of turrets) {
            if (!t.isDead && t !== this && distance(this.pos.x, this.pos.y, t.pos.x, t.pos.y) <= this.range) {
                t.hp += Math.floor(this.healRate * dt);
                if (t.hp > t.maxHp) t.hp = t.maxHp;
            }
        }
    }

    takeDamage(dmg) {
        if (this.isDead || this.invincible || this.type === TurretType.TT_SPIKE) return;
        this.hp -= dmg;
        if (this.hp <= 0) {
            this.hp = 0;
            if (g_gamePtr && g_gamePtr.hasReviveWeapon() && this.reviveCooldown <= 0) {
                this.triggerRevive();
                return;
            }
            this.isDead = true;
        }
    }

    heal(amount) {
        if (this.isDead) return;
        this.hp += amount;
        if (this.hp > this.maxHp) this.hp = this.maxHp;
    }

    getUpgradeCost() {
        if (this.type === TurretType.TT_HEAT || this.type === TurretType.TT_GRAVITY ||
            this.type === TurretType.TT_WIND || this.type === TurretType.TT_TELEPORT ||
            this.type === TurretType.TT_RESONANCE || this.type === TurretType.TT_SOUL_LINK ||
            this.type === TurretType.TT_TOXIC_CATALYST || this.type === TurretType.TT_STATIC_ATTACH) {
            const w = g_gamePtr ? g_gamePtr.wave : 1;
            return Math.floor(Math.pow(w, 6) * this.cost / 500) + 10;
        }
        if (this.type === TurretType.TT_ICE) return 450 * (1 << (this.level - 1));
        return this.level * this.level * this.level * 40;
    }

    upgrade() {
        this.level++;
        this.damage = this.baseDamage * this.level;
        this.fireRate = this.baseFireRate * this.level;
        this.healRate = this.baseHealRate * this.level;
        this.maxHp = this.baseHp * this.level;
        this.hp = this.maxHp;
    }

    teleportClosest(enemies) {
        if (this.isDead || this.type !== TurretType.TT_TELEPORT) return;
        this.teleportTimer -= 0.016;
        if (this.teleportTimer > 0) return;
        let closest = null;
        let maxIndex = -1;
        for (const e of enemies) {
            if (e.alive && e.pathIndex > maxIndex) {
                maxIndex = e.pathIndex;
                closest = e;
            }
        }
        if (closest) {
            closest.pos = { x: g_path[0].x, y: g_path[0].y };
            closest.pathIndex = 0;
            this.teleportTimer = this.teleportCD;
        }
    }

    // ---- 绘制 ----
    draw(ctx) {
        if (this.isDead) return;

        const px = this.pos.x, py = this.pos.y;

        // 根据类型绘制
        ctx.save();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        switch (this.type) {
            case TurretType.TT_NORMAL: {
                ctx.fillStyle = COLOR(0, 0, 255);
                ctx.beginPath();
                ctx.arc(px, py, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            }
            case TurretType.TT_SNIPER: {
                ctx.fillStyle = COLOR(255, 0, 0);
                ctx.fillRect(px - 15, py - 15, 30, 30);
                ctx.strokeRect(px - 15, py - 15, 30, 30);
                break;
            }
            case TurretType.TT_RAPID: {
                ctx.fillStyle = COLOR(0, 255, 0);
                ctx.beginPath();
                ctx.moveTo(px, py - 15);
                ctx.lineTo(px - 15, py + 15);
                ctx.lineTo(px + 15, py + 15);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            }
            case TurretType.TT_TANK: {
                ctx.fillStyle = COLOR(128, 128, 0);
                ctx.beginPath();
                ctx.moveTo(px, py - 18);
                ctx.lineTo(px + 18, py);
                ctx.lineTo(px, py + 18);
                ctx.lineTo(px - 18, py);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = COLOR(255, 215, 0);
                ctx.lineWidth = 3;
                ctx.stroke();
                break;
            }
            case TurretType.TT_HEAL: {
                ctx.fillStyle = COLOR(255, 192, 203);
                ctx.beginPath();
                ctx.ellipse(px, py, 12, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = COLOR(0, 255, 0);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(px - 8, py);
                ctx.lineTo(px + 8, py);
                ctx.moveTo(px, py - 8);
                ctx.lineTo(px, py + 8);
                ctx.stroke();
                break;
            }
            case TurretType.TT_SPIKE: {
                ctx.fillStyle = COLOR(139, 69, 19);
                ctx.beginPath();
                ctx.moveTo(px, py - 12);
                ctx.lineTo(px - 12, py + 12);
                ctx.lineTo(px + 12, py + 12);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            }
            case TurretType.TT_ICE: {
                ctx.fillStyle = COLOR(0, 191, 255);
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = i * Math.PI / 3 - Math.PI / 6;
                    const r = 15;
                    if (i === 0) ctx.moveTo(px + r * Math.cos(a), py + r * Math.sin(a));
                    else ctx.lineTo(px + r * Math.cos(a), py + r * Math.sin(a));
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(px - 8, py);
                ctx.lineTo(px + 8, py);
                ctx.moveTo(px, py - 8);
                ctx.lineTo(px, py + 8);
                ctx.stroke();
                break;
            }
            case TurretType.TT_HEAT: {
                ctx.fillStyle = COLOR(255, 100, 0);
                ctx.beginPath();
                ctx.moveTo(px, py - 18);
                ctx.lineTo(px - 12, py + 10);
                ctx.lineTo(px - 6, py + 6);
                ctx.lineTo(px + 6, py + 6);
                ctx.lineTo(px + 12, py + 10);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                if (this.heatAccumulate > 0) {
                    ctx.fillStyle = '#000';
                    ctx.font = '10px sans-serif';
                    ctx.fillText(this.heatAccumulate.toFixed(1), px - 8, py + 20);
                }
                break;
            }
            case TurretType.TT_GRAVITY: {
                ctx.fillStyle = COLOR(50, 50, 150);
                ctx.beginPath();
                ctx.arc(px, py, 16, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                if (this.gravityActive) {
                    ctx.strokeStyle = COLOR(200, 200, 255);
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(this.gravityCenter.x, this.gravityCenter.y, 60, 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;
            }
            case TurretType.TT_WIND: {
                ctx.fillStyle = COLOR(100, 200, 255);
                ctx.beginPath();
                ctx.arc(px, py, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    const a = i * 2.094;
                    const x1 = px + 10 * Math.cos(a);
                    const y1 = py + 10 * Math.sin(a);
                    const x2 = px + 18 * Math.cos(a + 0.5);
                    const y2 = py + 18 * Math.sin(a + 0.5);
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                break;
            }
            case TurretType.TT_TELEPORT: {
                ctx.fillStyle = COLOR(200, 50, 200);
                ctx.beginPath();
                ctx.arc(px, py, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = COLOR(255, 255, 0);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(px - 10, py);
                ctx.lineTo(px + 10, py);
                ctx.moveTo(px, py - 10);
                ctx.lineTo(px, py + 10);
                ctx.stroke();
                ctx.fillStyle = '#000';
                ctx.font = '10px sans-serif';
                ctx.fillText(this.teleportTimer.toFixed(1), px - 8, py + 18);
                break;
            }
            case TurretType.TT_RESONANCE: {
                ctx.fillStyle = COLOR(180, 0, 255);
                ctx.beginPath();
                ctx.arc(px, py, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(px - 6, py - 2);
                ctx.lineTo(px + 6, py - 2);
                ctx.moveTo(px - 2, py - 6);
                ctx.lineTo(px - 2, py + 6);
                ctx.stroke();
                break;
            }
            case TurretType.TT_SOUL_LINK: {
                ctx.fillStyle = COLOR(0, 200, 200);
                ctx.beginPath();
                ctx.arc(px, py, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(px - 5, py - 5, 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(px + 5, py + 5, 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(px - 5, py - 5);
                ctx.lineTo(px + 5, py + 5);
                ctx.stroke();
                break;
            }
            case TurretType.TT_TOXIC_CATALYST: {
                ctx.fillStyle = COLOR(0, 200, 0);
                ctx.beginPath();
                ctx.arc(px, py, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = COLOR(255, 255, 0);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, Math.PI * 2);
                ctx.stroke();
                break;
            }
            case TurretType.TT_STATIC_ATTACH: {
                ctx.fillStyle = COLOR(255, 200, 0);
                ctx.beginPath();
                ctx.arc(px, py, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(px - 2, py - 8);
                ctx.lineTo(px - 6, py - 2);
                ctx.lineTo(px, py - 2);
                ctx.lineTo(px - 4, py + 4);
                ctx.lineTo(px + 4, py + 4);
                ctx.stroke();
                break;
            }
        }

        ctx.restore();

        // 目标指示线
        if (this.type !== TurretType.TT_HEAL && this.type !== TurretType.TT_SPIKE &&
            this.type !== TurretType.TT_ICE && this.type !== TurretType.TT_WIND &&
            this.type !== TurretType.TT_GRAVITY && this.type !== TurretType.TT_TELEPORT &&
            this.type !== TurretType.TT_SOUL_LINK && this.target && this.target.alive) {
            const dx = this.target.pos.x - px;
            const dy = this.target.pos.y - py;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                ctx.save();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + (dx / len) * 22, py + (dy / len) * 22);
                ctx.stroke();
                ctx.restore();
            }
        }

        // 血条
        const ratio = this.hp / this.maxHp;
        const barWidth = 30;
        ctx.save();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(px - barWidth / 2, py - 24, barWidth, 6);
        ctx.fillStyle = COLOR(0, 255, 0);
        ctx.fillRect(px - barWidth / 2, py - 24, barWidth * ratio, 6);
        ctx.restore();

        // 等级
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Lv.' + this.level, px, py + 28);
        ctx.restore();

        // 特殊标记
        const labels = {
            [TurretType.TT_TANK]: '盾',
            [TurretType.TT_HEAT]: '热',
            [TurretType.TT_GRAVITY]: '引',
            [TurretType.TT_WIND]: '风',
            [TurretType.TT_TELEPORT]: '传',
            [TurretType.TT_RESONANCE]: '共',
            [TurretType.TT_SOUL_LINK]: '链',
            [TurretType.TT_TOXIC_CATALYST]: '毒',
            [TurretType.TT_STATIC_ATTACH]: '静'
        };
        if (labels[this.type]) {
            ctx.save();
            ctx.fillStyle = '#000';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels[this.type], px, py + 40);
            ctx.restore();
        }

        // 冰霜范围
        if (this.type === TurretType.TT_ICE && this.iceActive) {
            ctx.save();
            ctx.strokeStyle = COLOR(0, 200, 255);
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.icePos.x, this.icePos.y, 80, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = COLOR(0, 150, 255);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.icePos.x - 60, this.icePos.y - 60);
            ctx.lineTo(this.icePos.x + 60, this.icePos.y + 60);
            ctx.moveTo(this.icePos.x + 60, this.icePos.y - 60);
            ctx.lineTo(this.icePos.x - 60, this.icePos.y + 60);
            ctx.stroke();
            ctx.restore();
        }
    }

    // ---- 更新 ----
    update(dt, bullets, enemies) {
        if (this.isDead) return;
        if (this.type === TurretType.TT_HEAL) return;

        // ---- 热力塔 ----
        if (this.type === TurretType.TT_HEAT) {
            if (!this.target || !this.target.alive) { this.heatAccumulate = 0; return; }
            const d = distance(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y);
            if (d > this.range) { this.heatAccumulate = 0; return; }
            this.heatAccumulate += dt;
            let dmgMul = 1 + this.heatAccumulate * 0.2;
            if (dmgMul > 6) dmgMul = 6;
            const finalDamage = Math.floor(this.baseDamage * this.level * dmgMul);
            if (this.cooldown <= 0) {
                this.target.takeDamage(finalDamage);
                this.cooldown = 0.5;
            }
            return;
        }

        // ---- 引力塔 ----
        if (this.type === TurretType.TT_GRAVITY) {
            if (!this.gravityActive) {
                let nearest = null;
                let minD = 9999;
                for (const e of enemies) {
                    if (!e.alive) continue;
                    const d = distance(this.pos.x, this.pos.y, e.pos.x, e.pos.y);
                    if (d < minD) { minD = d;
                        nearest = e; }
                }
                if (nearest) {
                    this.gravityCenter = { x: nearest.pos.x, y: nearest.pos.y };
                    this.gravityActive = true;
                    this.gravityTimer = 5.0;
                }
            } else {
                this.gravityTimer -= dt;
                if (this.gravityTimer <= 0) { this.gravityActive = false; return; }
                for (const e of enemies) {
                    if (!e.alive) continue;
                    const d = distance(e.pos.x, e.pos.y, this.gravityCenter.x, this.gravityCenter.y);
                    if (d < 100) {
                        const dx = this.gravityCenter.x - e.pos.x;
                        const dy = this.gravityCenter.y - e.pos.y;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        if (len > 1) {
                            const ps = 30 * dt;
                            e.pos.x += (dx / len) * ps;
                            e.pos.y += (dy / len) * ps;
                        }
                    }
                }
            }
            return;
        }

        if (this.type === TurretType.TT_WIND || this.type === TurretType.TT_TELEPORT) return;

        // ---- 地刺 ----
        if (this.type === TurretType.TT_SPIKE) {
            if (this.cooldown > 0) this.cooldown -= dt;
            else {
                for (const e of enemies) {
                    if (e.alive && distance(this.pos.x, this.pos.y, e.pos.x, e.pos.y) < 20) {
                        e.takeDamage(this.damage);
                        this.cooldown = 1 / this.fireRate;
                        break;
                    }
                }
            }
            return;
        }

        // ---- 寒冰 ----
        if (this.type === TurretType.TT_ICE) {
            if (this.iceTimer > 0) this.iceTimer -= dt;
            else {
                const alive = [];
                for (const e of enemies) if (e.alive) alive.push(e);
                if (alive.length > 0) {
                    const idx = Math.floor(Math.random() * alive.length);
                    this.icePos = { x: alive[idx].pos.x, y: alive[idx].pos.y };
                    this.iceActive = true;
                    this.iceTimer = this.iceDuration;
                    for (const e of enemies) {
                        if (e.alive && distance(e.pos.x, e.pos.y, this.icePos.x, this.icePos.y) < 80) {
                            e.slowTimer = 1.5;
                            e.slowFactor = 0.5;
                        }
                    }
                }
            }
            if (this.iceActive) {
                this.iceTimer -= dt;
                if (this.iceTimer <= 0) this.iceActive = false;
                else {
                    for (const e of enemies) {
                        if (e.alive && distance(e.pos.x, e.pos.y, this.icePos.x, this.icePos.y) < 80) {
                            e.slowTimer = 1.5;
                            e.slowFactor = 0.5;
                        }
                    }
                }
            }
            return;
        }

        // ---- 共振水晶塔 ----
        if (this.type === TurretType.TT_RESONANCE) {
            if (this.cooldown > 0) this.cooldown -= dt;
            if (!this.target || !this.target.alive) { this.target = null; return; }
            const d = distance(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y);
            if (d > this.range) { this.target = null; return; }
            if (this.cooldown <= 0) {
                this.target.resonanceStacks = (this.target.resonanceStacks || 0) + 1;
                if (this.target.resonanceStacks >= 5) {
                    const explodeDmg = Math.floor(this.target.maxHp * 0.15);
                    for (const e of enemies) {
                        if (!e.alive) continue;
                        if (distance(e.pos.x, e.pos.y, this.target.pos.x, this.target.pos.y) < 80) {
                            e.hp -= explodeDmg;
                            if (e.hp <= 0) e.alive = false;
                        }
                    }
                    this.target.resonanceStacks = 0;
                }
                this.cooldown = 1 / this.fireRate;
            }
            return;
        }

        // ---- 灵魂链接塔 ----
        if (this.type === TurretType.TT_SOUL_LINK) {
            if (!this.soulLinkTarget || !this.soulLinkTarget.alive) {
                let best = null;
                let maxHp = -1;
                for (const e of enemies) {
                    if (!e.alive) continue;
                    const d = distance(this.pos.x, this.pos.y, e.pos.x, e.pos.y);
                    if (d <= this.range && e.maxHp > maxHp) {
                        maxHp = e.maxHp;
                        best = e;
                    }
                }
                this.soulLinkTarget = best;
                if (this.soulLinkTarget) {
                    this.soulLinkTarget.soulLinked = true;
                    this.soulLinkTimer = 3.0;
                    this.soulLinkDamageAccum = 0;
                }
            } else {
                this.soulLinkTimer -= dt;
                if (this.soulLinkTimer <= 0 || distance(this.pos.x, this.pos.y,
                        this.soulLinkTarget.pos.x, this.soulLinkTarget.pos.y) > this.range) {
                    this.soulLinkTarget.soulLinked = false;
                    this.soulLinkTarget = null;
                    return;
                }
            }
            return;
        }

        // ---- 剧毒催化塔 ----
        if (this.type === TurretType.TT_TOXIC_CATALYST) {
            if (this.cooldown > 0) this.cooldown -= dt;
            if (!this.target || !this.target.alive) { this.target = null; return; }
            const d = distance(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y);
            if (d > this.range) { this.target = null; return; }
            if (this.cooldown <= 0) {
                this.target.poisonStacks = Math.min((this.target.poisonStacks || 0) + 1, 10);
                this.cooldown = 1 / this.fireRate;
            }
            return;
        }

        // ---- 静电附着塔 ----
        if (this.type === TurretType.TT_STATIC_ATTACH) {
            if (this.cooldown > 0) this.cooldown -= dt;
            if (!this.target || !this.target.alive) { this.target = null; return; }
            const d = distance(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y);
            if (d > this.range) { this.target = null; return; }
            if (this.cooldown <= 0) {
                this.target.hasStaticMark = true;
                for (const e of enemies) {
                    if (!e.alive || e === this.target) continue;
                    if (e.hasStaticMark && distance(e.pos.x, e.pos.y, this.target.pos.x, this.target.pos.y) < 100) {
                        const dmg1 = Math.floor(this.target.hp * 0.08);
                        const dmg2 = Math.floor(e.hp * 0.08);
                        this.target.hp -= dmg1;
                        if (this.target.hp <= 0) this.target.alive = false;
                        e.hp -= dmg2;
                        if (e.hp <= 0) e.alive = false;
                    }
                }
                this.cooldown = 1 / this.fireRate;
            }
            return;
        }

        // ---- 普通攻击 ----
        if (this.cooldown > 0) this.cooldown -= dt;
        if (!this.target || !this.target.alive) { this.target = null; return; }
        const d = distance(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y);
        if (d > this.range) { this.target = null; return; }
        if (this.cooldown <= 0) {
            const bulletSpeed = this.baseBulletSpeed;
            let dmgMul = 1 + (g_gamePtr ? g_gamePtr.getDamageBonus() / 100 : 0);
            if (g_gamePtr && g_gamePtr.hasWeapon(WeaponType.WT_DEATH_SWORD)) dmgMul += 0.6;
            const baseDamage = Math.floor(this.damage * dmgMul);
            const critRate = g_gamePtr ? g_gamePtr.getCriticalRate() : 0;
            const critDmgBonus = g_gamePtr ? g_gamePtr.getCriticalDamageBonus() : 0;
            const isCritical = Math.random() < critRate;
            const critMultiplier = 1.5 + critDmgBonus;
            const fireRateMul = 1 + (g_gamePtr ? g_gamePtr.getAttackSpeedBonus() : 0);
            const actualFireRate = this.fireRate * fireRateMul;
            const b = new Bullet(this.pos, this.target, this, bulletSpeed, baseDamage, isCritical, critMultiplier);
            bullets.push(b);
            this.cooldown = 1 / actualFireRate;
        }
    }
}

// ================================================================
// Enemy 类
// ================================================================
class Enemy {
    constructor(wave, type = EnemyType.ET_NORMAL) {
        this.pos = { x: g_path[0].x, y: g_path[0].y };
        this.pathIndex = 0;
        this.alive = true;
        this.attackCooldown = 0;
        this.slowTimer = 0;
        this.slowFactor = 1;
        this.isSummoner = false;
        this.summonCount = 0;
        this.bossSkillTimer = 0;
        this.bossSkillType = 0;
        this.isWarCry = false;
        this.warCryRange = 150;
        this.resonanceStacks = 0;
        this.soulLinked = false;
        this.poisonStacks = 0;
        this.hasStaticMark = false;
        this.type = type;
        this.minions = [];

        let baseHp = 20,
            baseSpeed = 60,
            baseReward = 20,
            baseRadius = 10;
        let baseColor = COLOR(255, 0, 0);
        let canAttack = false,
            attackRateVal = 0,
            attackDmg = 0,
            attackRangeVal = 0;
        let baseArmorVal = 0;

        switch (type) {
            case EnemyType.ET_NORMAL:
                baseHp = 20;
                baseSpeed = 60;
                baseReward = 20;
                baseRadius = 10;
                baseColor = COLOR(255, 0, 0);
                baseArmorVal = 0;
                break;
            case EnemyType.ET_FAST:
                baseHp = 10;
                baseSpeed = 120;
                baseReward = 25;
                baseRadius = 8;
                baseColor = COLOR(255, 255, 0);
                baseArmorVal = 0;
                break;
            case EnemyType.ET_TANK:
                baseHp = 50;
                baseSpeed = 30;
                baseReward = 30;
                baseRadius = 15;
                baseColor = COLOR(0, 0, 255);
                baseArmorVal = 10;
                break;
            case EnemyType.ET_ELITE:
                baseHp = 35;
                baseSpeed = 45;
                baseReward = 35;
                baseRadius = 12;
                baseColor = COLOR(0, 255, 255);
                baseArmorVal = 5;
                break;
            case EnemyType.ET_GHOST:
                baseHp = 15;
                baseSpeed = 130;
                baseReward = 30;
                baseRadius = 9;
                baseColor = COLOR(255, 0, 255);
                baseArmorVal = 2;
                break;
            case EnemyType.ET_GIANT:
                baseHp = 80;
                baseSpeed = 20;
                baseReward = 45;
                baseRadius = 20;
                baseColor = COLOR(0, 128, 128);
                baseArmorVal = 15;
                break;
            case EnemyType.ET_ATTACK_MELEE:
                baseHp = 30;
                baseSpeed = 35;
                baseReward = 40;
                baseRadius = 12;
                baseColor = COLOR(128, 64, 0);
                canAttack = true;
                attackRateVal = 1.0;
                attackDmg = 25;
                attackRangeVal = 30;
                baseArmorVal = 5;
                break;
            case EnemyType.ET_ATTACK_RANGED:
                baseHp = 20;
                baseSpeed = 50;
                baseReward = 35;
                baseRadius = 10;
                baseColor = COLOR(0, 128, 255);
                canAttack = true;
                attackRateVal = 2.0;
                attackDmg = 10;
                attackRangeVal = 150;
                baseArmorVal = 3;
                break;
            case EnemyType.ET_BOSS1:
                baseHp = 200;
                baseSpeed = 20;
                baseReward = 100;
                baseRadius = 25;
                baseColor = COLOR(128, 0, 128);
                bossSkillType = 0;
                baseArmorVal = 20;
                break;
            case EnemyType.ET_BOSS2:
                baseHp = 300;
                baseSpeed = 15;
                baseReward = 150;
                baseRadius = 30;
                baseColor = COLOR(255, 140, 0);
                bossSkillType = 1;
                baseArmorVal = 30;
                break;
            case EnemyType.ET_BOSS3:
                baseHp = 500;
                baseSpeed = 10;
                baseReward = 200;
                baseRadius = 35;
                baseColor = COLOR(139, 0, 0);
                bossSkillType = 2;
                baseArmorVal = 40;
                break;
            case EnemyType.ET_SUMMONER:
                baseHp = 60;
                baseSpeed = 35;
                baseReward = 80;
                baseRadius = 18;
                baseColor = COLOR(128, 0, 128);
                this.isSummoner = true;
                this.summonCount = 2 + wave;
                baseArmorVal = 8;
                break;
            case EnemyType.ET_WAR_CRY:
                baseHp = 40;
                baseSpeed = 25;
                baseReward = 50;
                baseRadius = 14;
                baseColor = COLOR(255, 100, 0);
                this.isWarCry = true;
                baseArmorVal = 5;
                break;
        }

        const coeff = Math.pow(3, wave);
        this.maxHp = Math.floor(baseHp * coeff);
        this.hp = this.maxHp;
        this.reward = Math.floor(baseReward * coeff);
        const speedCoeff = Math.pow(2, wave);
        this.originalSpeed = baseSpeed;
        this.speed = baseSpeed * speedCoeff;
        if (this.speed > this.originalSpeed * 3) this.speed = this.originalSpeed * 3;
        this.radius = baseRadius;
        this.color = baseColor;
        this.canAttackTurret = canAttack;
        this.attackRate = attackRateVal;
        this.attackDamage = attackDmg;
        this.attackRange = attackRangeVal;
        this.armor = baseArmorVal;
        this.baseArmor = baseArmorVal;
        this.typeLabel = this.getTypeLabel();
    }

    getTypeLabel() {
        const labels = ['N', 'F', 'T', 'E', 'G', 'Gi', 'AM', 'AR', 'B1', 'B2', 'B3', 'S', 'WC'];
        return labels[this.type] || '?';
    }

    applyArmor(rawDamage) {
        if (this.armor <= 0) return rawDamage;
        return Math.floor(rawDamage * 100 / (100 + this.armor));
    }

    spawnMinions(wave, enemyList) {
        if (!this.isSummoner || !this.alive) return;
        for (let i = 0; i < this.summonCount; i++) {
            const m = new Enemy(wave, EnemyType.ET_NORMAL);
            m.maxHp = Math.floor(m.maxHp / 3);
            m.hp = m.maxHp;
            m.speed = m.originalSpeed * 1.5;
            m.reward = Math.floor(m.reward / 2);
            m.radius = 8;
            m.color = COLOR(255, 165, 0);
            m.pos.x = this.pos.x + (Math.random() * 60 - 30);
            m.pos.y = this.pos.y + (Math.random() * 60 - 30);
            this.minions.push(m);
            enemyList.push(m);
        }
    }

    update(dt) {
        if (!this.alive) return;
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            this.speed = this.originalSpeed * this.slowFactor;
            if (this.slowTimer <= 0) this.speed = this.originalSpeed;
        } else {
            this.speed = this.originalSpeed;
        }

        if (this.pathIndex >= g_path.length - 1) {
            this.alive = false;
            return;
        }
        const target = g_path[this.pathIndex + 1];
        const dx = target.x - this.pos.x;
        const dy = target.y - this.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const move = this.speed * dt;
        if (dist <= move) {
            this.pos = { x: target.x, y: target.y };
            this.pathIndex++;
        } else {
            this.pos.x += (dx / dist) * move;
            this.pos.y += (dy / dist) * move;
        }

        // Boss技能
        if (this.type >= EnemyType.ET_BOSS1 && this.type <= EnemyType.ET_BOSS3) {
            this.activateBossSkill(dt, g_gamePtr ? g_gamePtr.enemies : []);
        }
    }

    activateBossSkill(dt, enemies) {
        if (!this.alive || this.type < EnemyType.ET_BOSS1 || this.type > EnemyType.ET_BOSS3) return;
        this.bossSkillTimer += dt;
        if (this.bossSkillTimer < 5.0) return;
        this.bossSkillTimer = 0;
        const wave = g_gamePtr ? g_gamePtr.wave : 1;
        switch (this.bossSkillType) {
            case 0: {
                for (let i = 0; i < 3; i++) {
                    const m = new Enemy(wave, EnemyType.ET_NORMAL);
                    m.maxHp = Math.floor(m.maxHp / 2);
                    m.hp = m.maxHp;
                    m.speed *= 1.2;
                    m.reward = Math.floor(m.reward / 2);
                    m.radius = 8;
                    m.color = COLOR(200, 100, 200);
                    m.pos.x = this.pos.x + (Math.random() * 80 - 40);
                    m.pos.y = this.pos.y + (Math.random() * 80 - 40);
                    enemies.push(m);
                }
                break;
            }
            case 1: {
                for (const e of enemies) {
                    if (e.alive && e !== this && distance(e.pos.x, e.pos.y, this.pos.x, this.pos.y) < 150) {
                        e.slowTimer = 3.0;
                        e.slowFactor = 0.5;
                    }
                }
                break;
            }
            case 2: {
                this.hp += this.maxHp * 0.5;
                if (this.hp > this.maxHp * 1.5) this.hp = this.maxHp * 1.5;
                break;
            }
        }
    }

    takeDamage(dmg) {
        if (!this.alive) return false;
        const actualDmg = this.applyArmor(dmg);
        this.hp -= actualDmg;
        if (this.hp <= 0) { this.alive = false; return true; }
        return false;
    }

    attackTurret(turrets, dt) {
        if (!this.canAttackTurret || !this.alive) return false;
        this.attackCooldown -= dt;
        if (this.attackCooldown > 0) return false;
        let dmgMul = Math.pow(2, (g_gamePtr ? g_gamePtr.wave - 1 : 0));
        if (dmgMul > 64) dmgMul = 64;
        const actualDamage = Math.floor(this.attackDamage * dmgMul);
        let targetTurret = null;
        let minDist = this.attackRange;
        const prioritizeTank = (this.type === EnemyType.ET_ATTACK_RANGED && Math.random() < 0.9);
        if (prioritizeTank) {
            for (const t of turrets) {
                if (!t.isDead && t.type === TurretType.TT_TANK) {
                    const d = distance(this.pos.x, this.pos.y, t.pos.x, t.pos.y);
                    if (d < minDist) { minDist = d;
                        targetTurret = t; }
                }
            }
            if (targetTurret) {
                targetTurret.takeDamage(actualDamage);
                this.attackCooldown = 1 / this.attackRate;
                return true;
            }
        }
        for (const t of turrets) {
            if (!t.isDead) {
                const d = distance(this.pos.x, this.pos.y, t.pos.x, t.pos.y);
                if (d < minDist) { minDist = d;
                    targetTurret = t; }
            }
        }
        if (targetTurret) {
            targetTurret.takeDamage(actualDamage);
            this.attackCooldown = 1 / this.attackRate;
            return true;
        }
        return false;
    }

    draw(ctx) {
        if (!this.alive) return;
        const px = this.pos.x,
            py = this.pos.y,
            r = this.radius;

        // 主体
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Boss/召唤师/战争咆哮 边框
        if (this.type >= EnemyType.ET_BOSS1 || this.type === EnemyType.ET_SUMMONER || this.type === EnemyType.ET_WAR_CRY) {
            ctx.strokeStyle = COLOR(255, 215, 0);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, r + 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 战争咆哮光环
        if (this.isWarCry) {
            ctx.strokeStyle = COLOR(255, 200, 100);
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(px, py, this.warCryRange, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();

        // 血条
        const ratio = this.hp / this.maxHp;
        const barWidth = r * 2 + 4;
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.fillRect(px - barWidth / 2, py - r - 8, barWidth, 4);
        ctx.fillStyle = COLOR(0, 255, 0);
        ctx.fillRect(px - barWidth / 2, py - r - 8, barWidth * ratio, 4);
        ctx.restore();

        // 标签
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.typeLabel, px, py);
        ctx.restore();

        // 召唤师额外信息
        if (this.type === EnemyType.ET_SUMMONER) {
            ctx.save();
            ctx.fillStyle = '#000';
            ctx.font = '8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('+' + this.summonCount, px, py + r + 10);
            ctx.restore();
        }
    }
}

// ================================================================
// Game 类
// ================================================================
class Game {
    constructor() {
        this.enemies = [];
        this.turrets = [];
        this.bullets = [];
        this.gold = INIT_GOLD;
        this.lives = INIT_LIVES;
        this.wave = 0;
        this.enemiesThisWave = 0;
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        this.gameOver = false;
        this.selectedTurret = TurretType.TT_NORMAL;
        this.selectedTurretPtr = null;
        this.ownedWeapons = [];
        this.autoUpgradeLevel = 1;
        this.autoUpgradeTimer = 0;
        this.autoUpgradeInterval = 0.5;
        this.hoveredWeaponIndex = -1;
        this.showWeaponShop = false;
        this.gameState = 0; // 0=主菜单, 1=装备选择, 2=游戏中
        this.difficulty = GameDifficulty.DIFF_NORMAL;
        this.selectedWeapons = [-1, -1, -1, -1, -1, -1];
        this.selectedCount = 0;
        this.allWeaponList = [];
        for (let i = 0; i < 26; i++) this.allWeaponList.push(i);
        g_gamePtr = this;
    }

    // ---- 游戏状态管理 ----
    startGame() {
        this.gameState = 1;
        this.gold = INIT_GOLD;
        this.lives = INIT_LIVES;
        this.wave = 0;
        this.enemies = [];
        this.turrets = [];
        this.bullets = [];
        this.ownedWeapons = [];
        this.gameOver = false;
        this.selectedTurretPtr = null;
        this.selectedWeapons = [-1, -1, -1, -1, -1, -1];
        this.selectedCount = 0;
    }

    confirmEquipment() {
        for (let i = 0; i < 6; i++) {
            if (this.selectedWeapons[i] >= 0 && this.selectedWeapons[i] < 26) {
                this.ownedWeapons.push({ type: this.selectedWeapons[i], purchaseWave: 0 });
            }
        }
        this.gameState = 2;
        this.startWave();
    }

    restartGame() {
        this.enemies = [];
        this.turrets = [];
        this.bullets = [];
        this.ownedWeapons = [];
        this.gameState = 0;
        this.gameOver = false;
        this.gold = INIT_GOLD;
        this.lives = INIT_LIVES;
        this.wave = 0;
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        this.selectedTurretPtr = null;
        this.selectedWeapons = [-1, -1, -1, -1, -1, -1];
        this.selectedCount = 0;
    }

    // ---- 武器系统 ----
    hasWeapon(wt) {
        for (const ow of this.ownedWeapons) {
            if (ow.type === wt) return true;
        }
        return false;
    }

    getWeaponPrice(wt) {
        const prices = {
            [WeaponType.WT_IRON_SWORD]: 25000,
            [WeaponType.WT_THUNDER_BLADE]: 45000,
            [WeaponType.WT_DEATH_SWORD]: 190000,
            [WeaponType.WT_CRUSH_HAMMER]: 210000,
            [WeaponType.WT_BLOOD_EDGE]: 180000,
            [WeaponType.WT_INFINITY_EDGE]: 214000,
            [WeaponType.WT_BLACK_CLEAVER]: 209000,
            [WeaponType.WT_ENDLESS]: 216000,
            [WeaponType.WT_CRESCENT]: 295000,
            [WeaponType.WT_MASTER]: 212000,
            [WeaponType.WT_DAWN]: 340000,
            [WeaponType.WT_EXECUTIONER]: 180000,
            [WeaponType.WT_HAT]: 230000,
            [WeaponType.WT_BOOK]: 300000,
            [WeaponType.WT_VOID]: 211000,
            [WeaponType.WT_TORMENT]: 204000,
            [WeaponType.WT_ECHO]: 210000,
            [WeaponType.WT_VAMPIRE]: 209000,
            [WeaponType.WT_MOON]: 200000,
            [WeaponType.WT_NIGHTMARE]: 205000,
            [WeaponType.WT_THORNS]: 191000,
            [WeaponType.WT_FROST]: 210000,
            [WeaponType.WT_OMEN]: 218000,
            [WeaponType.WT_CLOAK]: 208000,
            [WeaponType.WT_PHOENIX]: 210000,
            [WeaponType.WT_BULWARK]: 207000
        };
        return prices[wt] || 0;
    }

    getWeaponName(wt) {
        const names = {
            [WeaponType.WT_IRON_SWORD]: '铁剑',
            [WeaponType.WT_THUNDER_BLADE]: '雷鸣刀',
            [WeaponType.WT_DEATH_SWORD]: '名刀·司命',
            [WeaponType.WT_CRUSH_HAMMER]: '碎星锤',
            [WeaponType.WT_BLOOD_EDGE]: '泣血之刃',
            [WeaponType.WT_INFINITY_EDGE]: '无尽战刃',
            [WeaponType.WT_BLACK_CLEAVER]: '暗影战斧',
            [WeaponType.WT_ENDLESS]: '末世',
            [WeaponType.WT_CRESCENT]: '破军',
            [WeaponType.WT_MASTER]: '宗师之力',
            [WeaponType.WT_DAWN]: '破晓',
            [WeaponType.WT_EXECUTIONER]: '制裁之刃',
            [WeaponType.WT_HAT]: '博学者之怒',
            [WeaponType.WT_BOOK]: '贤者之书',
            [WeaponType.WT_VOID]: '虚无法杖',
            [WeaponType.WT_TORMENT]: '痛苦面具',
            [WeaponType.WT_ECHO]: '回响之杖',
            [WeaponType.WT_VAMPIRE]: '噬神之书',
            [WeaponType.WT_MOON]: '辉月',
            [WeaponType.WT_NIGHTMARE]: '梦魇之牙',
            [WeaponType.WT_THORNS]: '反伤刺甲',
            [WeaponType.WT_FROST]: '极寒风暴',
            [WeaponType.WT_OMEN]: '不祥征兆',
            [WeaponType.WT_CLOAK]: '魔女斗篷',
            [WeaponType.WT_PHOENIX]: '不死鸟之眼',
            [WeaponType.WT_BULWARK]: '霸者重装'
        };
        return names[wt] || '';
    }

    getWeaponDescription(wt) {
        const descs = {
            [WeaponType.WT_IRON_SWORD]: '伤害+波数²×2',
            [WeaponType.WT_THUNDER_BLADE]: '伤害+波数²×4',
            [WeaponType.WT_DEATH_SWORD]: '炮塔复活2.5s,射速+100%,伤害+60%',
            [WeaponType.WT_CRUSH_HAMMER]: '伤害+波数²×8,射速+10%,穿透40%',
            [WeaponType.WT_BLOOD_EDGE]: '吸血25%,伤害+波数²×10,生命+500,回魂',
            [WeaponType.WT_INFINITY_EDGE]: '暴击率+50%,伤害+波数²×11.5',
            [WeaponType.WT_BLACK_CLEAVER]: '伤害+波数²×5,射速+15%,生命+400,穿透15%',
            [WeaponType.WT_ENDLESS]: '普攻附带当前生命8%伤害',
            [WeaponType.WT_CRESCENT]: '伤害+波数²×20,半血以下额外+30%',
            [WeaponType.WT_MASTER]: '技能后强化普攻+80%伤害',
            [WeaponType.WT_DAWN]: '伤害+波数²×15,攻速+35%,暴击+15%,穿透20%',
            [WeaponType.WT_EXECUTIONER]: '攻击使怪物治疗-50%',
            [WeaponType.WT_HAT]: '法强+波数²×12',
            [WeaponType.WT_BOOK]: '生命+1000,伤害+波数²×18',
            [WeaponType.WT_VOID]: '伤害+波数²×10,穿透40%',
            [WeaponType.WT_TORMENT]: '伤害+波数²×8,冷却+10%',
            [WeaponType.WT_ECHO]: '伤害+波数²×7,移速+5%',
            [WeaponType.WT_VAMPIRE]: '吸血20%,生命+800',
            [WeaponType.WT_MOON]: '无敌1.5秒,冷却30秒',
            [WeaponType.WT_NIGHTMARE]: '伤害+波数²×6,治疗-50%',
            [WeaponType.WT_THORNS]: '反伤25%伤害,护甲+200',
            [WeaponType.WT_FROST]: '冷却+20%,护甲+200',
            [WeaponType.WT_OMEN]: '生命+1200,减速攻击者',
            [WeaponType.WT_CLOAK]: '魔抗+300,护盾+800',
            [WeaponType.WT_PHOENIX]: '魔抗+200,治疗+30%',
            [WeaponType.WT_BULWARK]: '生命+2000,每秒回血+50'
        };
        return descs[wt] || '';
    }

    canBuyWeapon(wt) {
        if (this.hasWeapon(wt)) return false;
        const price = this.getWeaponPrice(wt);
        if (this.gold < price) return false;
        if (wt === WeaponType.WT_DEATH_SWORD) {
            if (!this.hasWeapon(WeaponType.WT_IRON_SWORD) || !this.hasWeapon(WeaponType.WT_THUNDER_BLADE)) return false;
        }
        return true;
    }

    buyWeapon(wt) {
        if (!this.canBuyWeapon(wt)) return false;
        const price = this.getWeaponPrice(wt);
        this.gold -= price;
        this.ownedWeapons.push({ type: wt, purchaseWave: this.wave });
        return true;
    }

    // ---- 属性计算 ----
    getDamageBonus() {
        let bonus = 0;
        for (const ow of this.ownedWeapons) {
            const wf = ow.purchaseWave || this.wave;
            switch (ow.type) {
                case WeaponType.WT_IRON_SWORD:
                    bonus += wf * wf * 2;
                    break;
                case WeaponType.WT_THUNDER_BLADE:
                    bonus += wf * wf * 4;
                    break;
                case WeaponType.WT_DEATH_SWORD:
                    bonus += 60;
                    break;
                case WeaponType.WT_CRUSH_HAMMER:
                    bonus += wf * wf * 8;
                    break;
                case WeaponType.WT_BLOOD_EDGE:
                    bonus += wf * wf * 10;
                    break;
                case WeaponType.WT_INFINITY_EDGE:
                    bonus += wf * wf * 11.5;
                    break;
                case WeaponType.WT_BLACK_CLEAVER:
                    bonus += wf * wf * 5;
                    break;
                case WeaponType.WT_ENDLESS:
                    bonus += wf * wf * 6;
                    break;
                case WeaponType.WT_CRESCENT:
                    bonus += wf * wf * 20;
                    break;
                case WeaponType.WT_MASTER:
                    bonus += wf * wf * 7;
                    break;
                case WeaponType.WT_DAWN:
                    bonus += wf * wf * 15;
                    break;
                case WeaponType.WT_EXECUTIONER:
                    bonus += wf * wf * 4;
                    break;
                case WeaponType.WT_HAT:
                    bonus += wf * wf * 12;
                    break;
                case WeaponType.WT_BOOK:
                    bonus += wf * wf * 18;
                    break;
                case WeaponType.WT_VOID:
                    bonus += wf * wf * 10;
                    break;
                case WeaponType.WT_TORMENT:
                    bonus += wf * wf * 8;
                    break;
                case WeaponType.WT_ECHO:
                    bonus += wf * wf * 7;
                    break;
                case WeaponType.WT_VAMPIRE:
                    bonus += wf * wf * 6;
                    break;
                case WeaponType.WT_NIGHTMARE:
                    bonus += wf * wf * 6;
                    break;
                case WeaponType.WT_THORNS:
                    bonus += wf * wf * 3;
                    break;
                case WeaponType.WT_FROST:
                    bonus += wf * wf * 2;
                    break;
                case WeaponType.WT_OMEN:
                    bonus += wf * wf * 3;
                    break;
                case WeaponType.WT_CLOAK:
                    bonus += wf * wf * 4;
                    break;
                case WeaponType.WT_PHOENIX:
                    bonus += wf * wf * 4;
                    break;
                case WeaponType.WT_BULWARK:
                    bonus += wf * wf * 5;
                    break;
            }
        }
        return bonus;
    }

    getAttackSpeedBonus() {
        let bonus = 0;
        for (const ow of this.ownedWeapons) {
            switch (ow.type) {
                case WeaponType.WT_DEATH_SWORD:
                    bonus += 1.0;
                    break;
                case WeaponType.WT_CRUSH_HAMMER:
                    bonus += 0.1;
                    break;
                case WeaponType.WT_BLACK_CLEAVER:
                    bonus += 0.15;
                    break;
                case WeaponType.WT_DAWN:
                    bonus += 0.35;
                    break;
            }
        }
        return bonus;
    }

    getLifeStealBonus() {
        for (const ow of this.ownedWeapons) {
            if (ow.type === WeaponType.WT_BLOOD_EDGE) return 0.25;
            if (ow.type === WeaponType.WT_VAMPIRE) return 0.20;
        }
        return 0;
    }

    getMaxHpBonus() {
        let bonus = 0;
        for (const ow of this.ownedWeapons) {
            switch (ow.type) {
                case WeaponType.WT_BLOOD_EDGE:
                    bonus += 500;
                    break;
                case WeaponType.WT_BLACK_CLEAVER:
                    bonus += 400;
                    break;
                case WeaponType.WT_BOOK:
                    bonus += 1000;
                    break;
                case WeaponType.WT_VAMPIRE:
                    bonus += 800;
                    break;
                case WeaponType.WT_OMEN:
                    bonus += 1200;
                    break;
                case WeaponType.WT_BULWARK:
                    bonus += 2000;
                    break;
            }
        }
        return bonus;
    }

    getCriticalRate() {
        let rate = 0;
        for (const ow of this.ownedWeapons) {
            if (ow.type === WeaponType.WT_INFINITY_EDGE) rate += 0.5;
            if (ow.type === WeaponType.WT_DAWN) rate += 0.15;
        }
        return Math.min(rate, 0.99);
    }

    getCriticalDamageBonus() {
        let bonus = 0;
        for (const ow of this.ownedWeapons) {
            if (ow.type === WeaponType.WT_INFINITY_EDGE) {
                const rate = this.getCriticalRate() * 100;
                let effect = rate / 2;
                if (effect > 50) effect = 50;
                bonus = effect / 100;
            }
        }
        return bonus;
    }

    hasReviveWeapon() {
        return this.hasWeapon(WeaponType.WT_DEATH_SWORD);
    }

    getArmorPenetration() {
        let pen = 0;
        for (const ow of this.ownedWeapons) {
            switch (ow.type) {
                case WeaponType.WT_CRUSH_HAMMER:
                    pen += 40;
                    break;
                case WeaponType.WT_VOID:
                    pen += 40;
                    break;
                case WeaponType.WT_DAWN:
                    pen += 20;
                    break;
                case WeaponType.WT_BLACK_CLEAVER:
                    pen += 15;
                    break;
            }
        }
        return pen;
    }

    // ---- 游戏逻辑 ----
    startWave() {
        this.wave++;
        let baseCount = 5 + this.wave * 2;
        switch (this.difficulty) {
            case GameDifficulty.DIFF_EASY:
                baseCount = Math.floor(baseCount * 0.7);
                break;
            case GameDifficulty.DIFF_HARD:
                baseCount = Math.floor(baseCount * 1.5);
                break;
            case GameDifficulty.DIFF_HELL:
                baseCount = Math.floor(baseCount * 2.0);
                break;
        }
        this.enemiesThisWave = baseCount + ((this.wave % 5 === 0) ? 1 : 0);
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
    }

    getNextEnemyType(wave, spawned, total) {
        if (wave % 5 === 0 && spawned === total - 1) {
            const bossIdx = Math.floor((wave / 5) % 3);
            return bossIdx === 0 ? EnemyType.ET_BOSS1 : bossIdx === 1 ? EnemyType.ET_BOSS2 : EnemyType.ET_BOSS3;
        }
        if (wave > 3 && Math.random() * 100 < 10 + wave / 2) {
            return EnemyType.ET_WAR_CRY;
        }
        let probNormal = 20,
            probFast = 12,
            probTank = 12,
            probElite = 10,
            probGhost = 8,
            probGiant = 5,
            probMelee = 10,
            probRanged = 8,
            probSummoner = 10;
        probNormal -= wave * 1;
        if (probNormal < 5) probNormal = 5;
        probElite += wave / 2;
        if (probElite > 25) probElite = 25;
        probGhost += wave / 3;
        if (probGhost > 18) probGhost = 18;
        probGiant += wave / 4;
        if (probGiant > 14) probGiant = 14;
        probMelee += wave / 3;
        if (probMelee > 20) probMelee = 20;
        probRanged += wave / 4;
        if (probRanged > 18) probRanged = 18;
        probSummoner += wave / 5;
        if (probSummoner > 25) probSummoner = 25;
        let sum = probNormal + probFast + probTank + probElite + probGhost + probGiant + probMelee + probRanged + probSummoner;
        if (sum < 100) probNormal += (100 - sum);
        else if (sum > 100) { probNormal -= (sum - 100); if (probNormal < 0) probNormal = 0; }
        const randVal = Math.random() * 100;
        let cumulative = 0;
        cumulative += probNormal;
        if (randVal < cumulative) return EnemyType.ET_NORMAL;
        cumulative += probFast;
        if (randVal < cumulative) return EnemyType.ET_FAST;
        cumulative += probTank;
        if (randVal < cumulative) return EnemyType.ET_TANK;
        cumulative += probElite;
        if (randVal < cumulative) return EnemyType.ET_ELITE;
        cumulative += probGhost;
        if (randVal < cumulative) return EnemyType.ET_GHOST;
        cumulative += probGiant;
        if (randVal < cumulative) return EnemyType.ET_GIANT;
        cumulative += probMelee;
        if (randVal < cumulative) return EnemyType.ET_ATTACK_MELEE;
        cumulative += probRanged;
        if (randVal < cumulative) return EnemyType.ET_ATTACK_RANGED;
        return EnemyType.ET_SUMMONER;
    }

    doAutoUpgrade() {
        if (this.gameOver || this.turrets.length === 0 || this.autoUpgradeLevel <= 0 || this.gameState !== 2) return;
        const candidates = [];
        for (const t of this.turrets) {
            if (!t.isDead && t.level < this.autoUpgradeLevel) candidates.push(t);
        }
        if (candidates.length === 0) return;
        candidates.sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            return a.countEnemiesNearby(this.enemies, 200) > b.countEnemiesNearby(this.enemies, 200) ? -1 : 1;
        });
        const target = candidates[0];
        const cost = target.getUpgradeCost();
        if (this.gold >= cost) { target.upgrade();
            this.gold -= cost; }
    }

    update(dt) {
        if (this.gameOver || this.gameState !== 2) return;

        // 风灵塔 buff
        for (const t of this.turrets) {
            if (t.isDead || t.type !== TurretType.TT_WIND) continue;
            for (const other of this.turrets) {
                if (other.isDead || other === t) continue;
                if (distance(t.pos.x, t.pos.y, other.pos.x, other.pos.y) <= t.windBuffRange) {
                    other.range += Math.floor(other.baseRange * 0.3);
                    other.fireRate += other.baseFireRate * other.level * 0.5;
                }
            }
        }

        // 传送塔
        for (const t of this.turrets) {
            if (!t.isDead && t.type === TurretType.TT_TELEPORT) t.teleportClosest(this.enemies);
        }

        // 战争咆哮光环
        for (const e of this.enemies) {
            if (!e.alive || !e.isWarCry) continue;
            for (const other of this.enemies) {
                if (!other.alive || other === e) continue;
                if (distance(e.pos.x, e.pos.y, other.pos.x, other.pos.y) < e.warCryRange) {
                    other.speed = other.originalSpeed * 1.3;
                    other.attackDamage = Math.floor(other.attackDamage * 1.5);
                } else {
                    other.speed = other.originalSpeed;
                }
            }
        }

        // 炮塔冷却/复活
        for (const t of this.turrets) {
            if (t.isDead) continue;
            if (t.soulReturnCD > 0) t.soulReturnCD -= dt;
            if (t.reviveCooldown > 0) t.reviveCooldown -= dt;
            if (t.invincible && t.reviveTimer > 0) {
                t.reviveTimer -= dt;
                if (t.reviveTimer <= 0) { t.invincible = false;
                    t.reviveTimer = 0; }
            }
            if (this.hasWeapon(WeaponType.WT_BLOOD_EDGE) && t.soulReturnCD <= 0 &&
                t.hp > 0 && t.hp / t.maxHp < 0.3) {
                t.triggerSoulReturn();
            }
        }

        // 自动升级
        if (this.autoUpgradeLevel > 0) {
            this.autoUpgradeTimer += dt;
            if (this.autoUpgradeTimer >= this.autoUpgradeInterval) {
                this.autoUpgradeTimer = 0;
                this.doAutoUpgrade();
            }
        }

        // 生成敌人
        if (this.enemiesSpawned < this.enemiesThisWave) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                const type = this.getNextEnemyType(this.wave, this.enemiesSpawned, this.enemiesThisWave);
                const e = new Enemy(this.wave, type);
                this.enemies.push(e);
                if (type === EnemyType.ET_SUMMONER) e.spawnMinions(this.wave, this.enemies);
                this.enemiesSpawned++;
                this.spawnTimer = SPAWN_INTERVAL;
            }
        }

        // 毒持续伤害
        for (const e of this.enemies) {
            if (!e.alive) continue;
            if (e.poisonStacks > 0) {
                const poisonDmg = e.poisonStacks * 5;
                e.hp -= poisonDmg;
                if (e.hp <= 0) {
                    e.alive = false;
                    for (const other of this.enemies) {
                        if (!other.alive || other === e) continue;
                        if (distance(e.pos.x, e.pos.y, other.pos.x, other.pos.y) < 80) {
                            other.armor = Math.floor(other.armor * 0.7);
                        }
                    }
                }
            }
        }

        // 更新敌人
        for (const e of this.enemies) {
            e.update(dt);
            if (!e.alive && e.pathIndex >= g_path.length - 1) {
                this.lives--;
                if (this.lives <= 0) this.gameOver = true;
            }
        }

        // 敌人攻击炮塔
        for (const e of this.enemies) {
            if (e.alive) e.attackTurret(this.turrets, dt);
        }

        // 更新炮塔
        for (const t of this.turrets) {
            if (!t.isDead) {
                t.findTarget(this.enemies);
                t.autoHeal(dt);
                t.update(dt, this.bullets, this.enemies);
            }
        }

        // 治疗塔
        for (const t of this.turrets) {
            if (!t.isDead) t.healNearby(this.turrets, dt);
        }

        // 更新子弹
        for (const b of this.bullets) {
            b.update(dt);
            if (!b.active && b.target && !b.target.alive) {
                this.gold += b.target.reward;
            }
        }

        // 清理
        this.enemies = this.enemies.filter(e => e.alive);
        this.bullets = this.bullets.filter(b => b.active);
        for (const t of this.turrets) {
            if (t.isDead && this.selectedTurretPtr === t) this.selectedTurretPtr = null;
        }
        this.turrets = this.turrets.filter(t => !t.isDead);

        // 下一波
        if (this.enemiesSpawned >= this.enemiesThisWave && this.enemies.length === 0) {
            this.startWave();
        }
    }

    // ---- 炮塔操作 ----
    placeTurret(x, y) {
        if (this.gameOver || this.gameState !== 2) return false;
        const cost = this.getTurretCost(this.selectedTurret);
        if (this.gold < cost) return false;
        if (this.selectedTurret !== TurretType.TT_SPIKE) {
            for (const p of g_path) {
                if (distance(x, y, p.x, p.y) < 25) return false;
            }
        }
        for (const t of this.turrets) {
            if (distance(x, y, t.pos.x, t.pos.y) < 35) return false;
        }
        const turret = new Turret(x, y, this.selectedTurret);
        this.turrets.push(turret);
        this.gold -= cost;
        return true;
    }

    selectTurretAt(x, y) {
        for (let i = this.turrets.length - 1; i >= 0; i--) {
            const t = this.turrets[i];
            if (t.isDead) continue;
            if (distance(x, y, t.pos.x, t.pos.y) < 20) {
                this.selectedTurretPtr = t;
                return true;
            }
        }
        this.selectedTurretPtr = null;
        return false;
    }

    upgradeSelectedTurret() {
        if (!this.selectedTurretPtr || this.selectedTurretPtr.isDead || this.gameState !== 2) {
            this.selectedTurretPtr = null;
            return false;
        }
        const cost = this.selectedTurretPtr.getUpgradeCost();
        if (this.gold < cost) return false;
        this.selectedTurretPtr.upgrade();
        this.gold -= cost;
        return true;
    }

    removeSelectedTurret() {
        if (!this.selectedTurretPtr || this.selectedTurretPtr.isDead || this.gameState !== 2) {
            this.selectedTurretPtr = null;
            return;
        }
        const idx = this.turrets.indexOf(this.selectedTurretPtr);
        if (idx !== -1) {
            this.turrets.splice(idx, 1);
            this.selectedTurretPtr = null;
        }
    }

    selectTurret(num) {
        const map = {
            '1': TurretType.TT_NORMAL,
            '2': TurretType.TT_SNIPER,
            '3': TurretType.TT_RAPID,
            '4': TurretType.TT_TANK,
            '5': TurretType.TT_HEAL,
            '6': TurretType.TT_SPIKE,
            '7': TurretType.TT_ICE,
            '8': TurretType.TT_HEAT,
            '9': TurretType.TT_GRAVITY,
            '0': TurretType.TT_WIND,
            '-': TurretType.TT_TELEPORT
        };
        if (map[num] !== undefined) {
            this.selectedTurret = map[num];
        }
    }

    getTurretCost(type) {
        const costs = {
            [TurretType.TT_NORMAL]: 50,
            [TurretType.TT_SNIPER]: 80,
            [TurretType.TT_RAPID]: 40,
            [TurretType.TT_TANK]: 60,
            [TurretType.TT_HEAL]: 70,
            [TurretType.TT_SPIKE]: 30,
            [TurretType.TT_ICE]: 500,
            [TurretType.TT_HEAT]: 1000,
            [TurretType.TT_GRAVITY]: 1000,
            [TurretType.TT_WIND]: 1000,
            [TurretType.TT_TELEPORT]: 500,
            [TurretType.TT_RESONANCE]: 500,
            [TurretType.TT_SOUL_LINK]: 500,
            [TurretType.TT_TOXIC_CATALYST]: 500,
            [TurretType.TT_STATIC_ATTACH]: 500
        };
        return costs[type] || 50;
    }

    upgradeAllBelowLevel(levelLimit) {
        if (this.gameState !== 2) return;
        for (const t of this.turrets) {
            if (!t.isDead && t.level < levelLimit) {
                const cost = t.getUpgradeCost();
                if (this.gold >= cost) { t.upgrade();
                    this.gold -= cost; }
            }
        }
    }

    // ---- UI 处理 ----
    handleWeaponClick(x, y) {
        if (this.gameState !== 2 || !this.showWeaponShop) return;
        const listX = WIN_WIDTH - 195,
            listY = 10 + 26 + 2;
        const listW = 185,
            listH = 180;
        if (x >= listX && x <= listX + listW && y >= listY && y <= listY + listH) {
            const itemH = 22;
            const idx = Math.floor((y - listY - 2) / itemH);
            if (idx >= 0 && idx < 6 && this.selectedWeapons[idx] >= 0 && this.selectedWeapons[idx] < 26) {
                this.buyWeapon(this.selectedWeapons[idx]);
            }
        }
    }

    handleWeaponHover(x, y) {
        this.hoveredWeaponIndex = -1;
    }

    // ---- 绘图 ----
    draw(ctx) {
        ctx.clearRect(0, 0, WIN_WIDTH, WIN_HEIGHT);
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, WIN_WIDTH, WIN_HEIGHT);

        // ---- 主菜单 ----
        if (this.gameState === 0) {
            this.drawMainMenu(ctx);
            return;
        }

        // ---- 装备选择 ----
        if (this.gameState === 1) {
            this.drawEquipmentSelect(ctx);
            return;
        }

        // ---- 游戏结束 ----
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, WIN_WIDTH, WIN_HEIGHT);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 48px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('游戏结束', WIN_WIDTH / 2, WIN_HEIGHT / 2 - 20);
            ctx.font = '20px sans-serif';
            ctx.fillText('按 R 键重新开始', WIN_WIDTH / 2, WIN_HEIGHT / 2 + 40);
            return;
        }

        // ---- 游戏主界面 ----
        this.drawGame(ctx);
    }

    drawMainMenu(ctx) {
        const diffNames = ['简单', '普通', '困难', '地狱'];
        const diffColors = [COLOR(0, 200, 0), COLOR(0, 0, 200), COLOR(200, 150, 0), COLOR(200, 0, 0)];

        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, WIN_WIDTH, WIN_HEIGHT);

        // 标题
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 52px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('🏰 塔防游戏', WIN_WIDTH / 2, 50);

        // 难度按钮
        for (let i = 0; i < 4; i++) {
            const x = 180 + i * 110,
                y = 160,
                w = 100,
                h = 40;
            const bg = this.difficulty === i ? diffColors[i] : '#7f8c8d';
            ctx.fillStyle = bg;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = '#fff';
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(diffNames[i], x + w / 2, y + h / 2);
        }

        // 开始按钮
        const bx = WIN_WIDTH / 2 - 60,
            by = 240,
            bw = 120,
            bh = 45;
        ctx.fillStyle = '#3498db';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('开始游戏', WIN_WIDTH / 2, by + bh / 2);

        // 操作说明
        ctx.fillStyle = '#bdc3c7';
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const tips = [
            '操作说明：',
            '1. 点击底部炮塔按钮选择炮塔类型',
            '2. 点击地图放置炮塔',
            '3. 点击已有炮塔选中，按 U 升级，按 D 删除',
            '4. 右上角装备商店购买装备',
            '5. 新炮塔：共振 | 灵魂 | 剧毒 | 静电'
        ];
        for (let i = 0; i < tips.length; i++) {
            ctx.fillText(tips[i], 50, 330 + i * 22);
        }
    }

    drawEquipmentSelect(ctx) {
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, WIN_WIDTH, WIN_HEIGHT);

        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('请选择6件初始装备', WIN_WIDTH / 2, 20);

        ctx.font = '18px sans-serif';
        ctx.fillText(`已选: ${this.selectedCount}/6`, WIN_WIDTH / 2, 60);

        const cols = 4,
            rows = 7,
            itemW = 180,
            itemH = 30,
            gap = 4;
        const startX = 20,
            startY = 90;

        for (let i = 0; i < 26; i++) {
            const col = i % cols,
                row = Math.floor(i / cols);
            const x = startX + col * (itemW + gap);
            const y = startY + row * (itemH + gap);
            const wt = this.allWeaponList[i];
            let isSelected = false;
            for (let j = 0; j < 6; j++) {
                if (this.selectedWeapons[j] === i) { isSelected = true; break; }
            }
            const bg = isSelected ? '#27ae60' : '#7f8c8d';
            ctx.fillStyle = bg;
            ctx.fillRect(x, y, itemW, itemH);
            ctx.strokeStyle = '#ecf0f1';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, itemW, itemH);
            ctx.fillStyle = '#fff';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const name = this.getWeaponName(wt);
            const text = isSelected ? `✓ ${name}` : name;
            ctx.fillText(text, x + 6, y + itemH / 2);
        }

        // 确认按钮
        const bx = WIN_WIDTH / 2 - 50,
            by = 520,
            bw = 100,
            bh = 35;
        const canConfirm = this.selectedCount === 6;
        ctx.fillStyle = canConfirm ? '#27ae60' : '#7f8c8d';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(canConfirm ? '确认' : '需选6件', WIN_WIDTH / 2, by + bh / 2);
    }

    drawGame(ctx) {
        // ---- 路径 ----
        ctx.save();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 6;
        ctx.beginPath();
        for (let i = 0; i < g_path.length; i++) {
            if (i === 0) ctx.moveTo(g_path[i].x, g_path[i].y);
            else ctx.lineTo(g_path[i].x, g_path[i].y);
        }
        ctx.stroke();
        ctx.restore();

        // 起点终点
        ctx.save();
        ctx.fillStyle = COLOR(0, 255, 0);
        ctx.beginPath();
        ctx.arc(g_path[0].x, g_path[0].y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLOR(255, 0, 0);
        ctx.beginPath();
        ctx.arc(g_path[g_path.length - 1].x, g_path[g_path.length - 1].y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ---- 绘制炮塔 ----
        for (const t of this.turrets) t.draw(ctx);

        // ---- 绘制敌人 ----
        for (const e of this.enemies) e.draw(ctx);

        // ---- 绘制子弹 ----
        for (const b of this.bullets) b.draw(ctx);

        // ---- UI 信息 ----
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const info = `金币: ${this.gold}  生命: ${this.lives}  波次: ${this.wave}  敌人: ${this.enemies.length}  炮塔: ${this.turrets.length}`;
        ctx.fillText(info, 10, 10);

        if (this.selectedTurretPtr && !this.selectedTurretPtr.isDead) {
            const cost = this.selectedTurretPtr.getUpgradeCost();
            ctx.fillText(`选中炮塔 Lv.${this.selectedTurretPtr.level}  升级费用: ${cost} [U升级] [D删除]`, 10, 30);
        } else {
            ctx.fillText('点击炮塔选中，U升级，D删除', 10, 30);
        }
        ctx.fillText(`自动升级等级: ${this.autoUpgradeLevel} [J降低 | K提高]`, 10, 50);
        ctx.fillText('I键一键升级 | R键重新开始', 10, 70);
        ctx.restore();

        // ---- 底部炮塔按钮 ----
        const btnData = [
            ['普通', 50, TurretType.TT_NORMAL],
            ['狙击', 80, TurretType.TT_SNIPER],
            ['速射', 40, TurretType.TT_RAPID],
            ['肉盾', 60, TurretType.TT_TANK],
            ['回血', 70, TurretType.TT_HEAL],
            ['地刺', 30, TurretType.TT_SPIKE],
            ['寒冰', 500, TurretType.TT_ICE],
            ['热力', 1000, TurretType.TT_HEAT],
            ['引力', 1000, TurretType.TT_GRAVITY],
            ['风灵', 1000, TurretType.TT_WIND],
            ['传送', 500, TurretType.TT_TELEPORT],
            ['共振', 500, TurretType.TT_RESONANCE],
            ['灵魂', 500, TurretType.TT_SOUL_LINK],
            ['剧毒', 500, TurretType.TT_TOXIC_CATALYST],
            ['静电', 500, TurretType.TT_STATIC_ATTACH]
        ];

        const bw = 55,
            bh = 24,
            gp = 2;
        const sx = 10,
            sy = WIN_HEIGHT - bh - 10;

        for (let i = 0; i < btnData.length; i++) {
            const x = sx + i * (bw + gp);
            const isSel = this.selectedTurret === btnData[i][2];
            ctx.save();
            ctx.fillStyle = isSel ? COLOR(255, 200, 100) : '#ddd';
            ctx.fillRect(x, sy, bw, bh);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, sy, bw, bh);
            ctx.fillStyle = '#000';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btnData[i][0], x + bw / 2, sy + bh / 2);
            ctx.restore();
        }

        // ---- 右上角装备商店 ----
        const btnX = WIN_WIDTH - 120,
            btnY = 10,
            btnW = 110,
            btnH = 26;
        ctx.save();
        ctx.fillStyle = this.showWeaponShop ? COLOR(100, 200, 255) : '#ddd';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(btnX, btnY, btnW, btnH);
        ctx.fillStyle = '#000';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.showWeaponShop ? '▼ 收起商店' : '📦 装备商店', btnX + btnW / 2, btnY + btnH / 2);
        ctx.restore();

        // ---- 商店列表 ----
        if (this.showWeaponShop) {
            const listX = WIN_WIDTH - 195,
                listY = btnY + btnH + 2;
            const listW = 185,
                listH = 180;
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.fillRect(listX, listY, listW, listH);
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1;
            ctx.strokeRect(listX, listY, listW, listH);

            const itemH = 22;
            for (let i = 0; i < 6; i++) {
                if (this.selectedWeapons[i] < 0 || this.selectedWeapons[i] >= 26) continue;
                const wt = this.selectedWeapons[i];
                const y = listY + 2 + i * itemH;
                const owned = this.hasWeapon(wt);
                const canBuy = this.canBuyWeapon(wt);
                const bg = owned ? COLOR(80, 200, 80) : (canBuy ? '#ddd' : '#bbb');
                ctx.fillStyle = bg;
                ctx.fillRect(listX + 2, y, listW - 4, itemH);
                ctx.fillStyle = '#000';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                const name = this.getWeaponName(wt);
                const price = this.getWeaponPrice(wt);
                const text = owned ? `✓ ${name}` : `${name} ${price}G`;
                ctx.fillText(text, listX + 8, y + itemH / 2);
            }
            ctx.restore();
        }
    }
}

// ================================================================
// 初始化 & 主循环
// ================================================================

const game = new Game();
let canvas = null;
let ctx = null;

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // 设置画布尺寸
    canvas.width = WIN_WIDTH;
    canvas.height = WIN_HEIGHT;

    // 事件监听
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        game.handleWeaponHover(x, y);
    });

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        handleClick(x, y);
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => {
        handleKey(e.key);
    });

    // 开始游戏循环
    let lastTime = 0;
    function gameLoop(timestamp) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;

        game.update(dt);
        game.draw(ctx);

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
}

// ---- 事件处理 ----
function handleClick(x, y) {
    // 主菜单
    if (game.gameState === 0) {
        // 难度选择
        for (let i = 0; i < 4; i++) {
            const dx = 180 + i * 110,
                dy = 160,
                dw = 100,
                dh = 40;
            if (x >= dx && x <= dx + dw && y >= dy && y <= dy + dh) {
                game.difficulty = i;
                return;
            }
        }
        // 开始按钮
        if (x >= WIN_WIDTH / 2 - 60 && x <= WIN_WIDTH / 2 + 60 &&
            y >= 240 && y <= 285) {
            game.startGame();
        }
        return;
    }

    // 装备选择
    if (game.gameState === 1) {
        const cols = 4,
            itemW = 180,
            itemH = 30,
            gap = 4;
        const startX = 20,
            startY = 90;
        for (let i = 0; i < 26; i++) {
            const col = i % cols,
                row = Math.floor(i / cols);
            const dx = startX + col * (itemW + gap);
            const dy = startY + row * (itemH + gap);
            if (x >= dx && x <= dx + itemW && y >= dy && y <= dy + itemH) {
                let isSelected = false;
                let slotIdx = -1;
                for (let j = 0; j < 6; j++) {
                    if (game.selectedWeapons[j] === i) { isSelected = true;
                        slotIdx = j; break; }
                }
                if (isSelected) {
                    game.selectedWeapons[slotIdx] = -1;
                    game.selectedCount--;
                } else if (game.selectedCount < 6) {
                    for (let j = 0; j < 6; j++) {
                        if (game.selectedWeapons[j] === -1) {
                            game.selectedWeapons[j] = i;
                            game.selectedCount++;
                            break;
                        }
                    }
                }
                return;
            }
        }
        // 确认按钮
        if (game.selectedCount === 6 &&
            x >= WIN_WIDTH / 2 - 50 && x <= WIN_WIDTH / 2 + 50 &&
            y >= 520 && y <= 555) {
            game.confirmEquipment();
        }
        return;
    }

    // 游戏中
    if (game.gameState === 2) {
        // 底部炮塔按钮
        const btnData = [
            ['普通', 50, TurretType.TT_NORMAL],
            ['狙击', 80, TurretType.TT_SNIPER],
            ['速射', 40, TurretType.TT_RAPID],
            ['肉盾', 60, TurretType.TT_TANK],
            ['回血', 70, TurretType.TT_HEAL],
            ['地刺', 30, TurretType.TT_SPIKE],
            ['寒冰', 500, TurretType.TT_ICE],
            ['热力', 1000, TurretType.TT_HEAT],
            ['引力', 1000, TurretType.TT_GRAVITY],
            ['风灵', 1000, TurretType.TT_WIND],
            ['传送', 500, TurretType.TT_TELEPORT],
            ['共振', 500, TurretType.TT_RESONANCE],
            ['灵魂', 500, TurretType.TT_SOUL_LINK],
            ['剧毒', 500, TurretType.TT_TOXIC_CATALYST],
            ['静电', 500, TurretType.TT_STATIC_ATTACH]
        ];
        const bw = 55,
            bh = 24,
            gp = 2;
        const sx = 10,
            sy = WIN_HEIGHT - bh - 10;
        for (let i = 0; i < btnData.length; i++) {
            const bx = sx + i * (bw + gp);
            if (x >= bx && x <= bx + bw && y >= sy && y <= sy + bh) {
                game.selectedTurret = btnData[i][2];
                return;
            }
        }

        // 右上角商店按钮
        const btnX = WIN_WIDTH - 120,
            btnY = 10,
            btnW = 110,
            btnH = 26;
        if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
            game.showWeaponShop = !game.showWeaponShop;
            return;
        }

        // 商店点击购买
        if (game.showWeaponShop) {
            const listX = WIN_WIDTH - 195,
                listY = btnY + btnH + 2;
            const listW = 185,
                listH = 180;
            if (x >= listX && x <= listX + listW && y >= listY && y <= listY + listH) {
                const itemH = 22;
                const idx = Math.floor((y - listY - 2) / itemH);
                if (idx >= 0 && idx < 6 && game.selectedWeapons[idx] >= 0 && game.selectedWeapons[idx] < 26) {
                    game.buyWeapon(game.selectedWeapons[idx]);
                }
                return;
            }
        }

        // 选择炮塔或放置
        if (game.selectTurretAt(x, y)) return;
        game.placeTurret(x, y);
    }
}

function handleKey(key) {
    if (game.gameState === 2) {
        if (key >= '1' && key <= '9') {
            game.selectTurret(key);
        } else if (key === '0') {
            game.selectTurret('0');
        } else if (key === '-') {
            game.selectTurret('-');
        } else if (key === 'u' || key === 'U') {
            game.upgradeSelectedTurret();
        } else if (key === 'd' || key === 'D') {
            game.removeSelectedTurret();
        } else if (key === 'j' || key === 'J') {
            if (game.autoUpgradeLevel > 1) game.autoUpgradeLevel--;
        } else if (key === 'k' || key === 'K') {
            game.autoUpgradeLevel++;
        } else if (key === 'i' || key === 'I') {
            const level = parseInt(prompt('请输入等级（升级所有等级小于此值的炮塔）:'));
            if (!isNaN(level) && level > 0) {
                game.upgradeAllBelowLevel(level);
            }
        } else if (key === 'r' || key === 'R') {
            game.restartGame();
        }
    }
}

// ---- 启动 ----
window.onload = init;
