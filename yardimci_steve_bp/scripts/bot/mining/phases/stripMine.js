import { breakAndCount } from "../helpers.js";

const DANGER_BLOCKS = ["minecraft:lava", "minecraft:flowing_lava", "minecraft:water", "minecraft:flowing_water"];

export function doStripMine(bot, pickTier) {
    const pos = bot.entity.location;
    const dir = bot._mineDir;
    if (!dir) {
        bot._setMineDirection();
        bot._cd = 3;
        return;
    }

    const cx = Math.floor(pos.x);
    const cy = Math.floor(pos.y);
    const cz = Math.floor(pos.z);

    if (hasForwardDanger(bot, cx, cy, cz, dir)) {
        bot._mineDir = { x: dir.z, z: -dir.x };
        bot._msg("§c⚠ Lava/su var! Yön değiştiriliyor...");
        bot._cd = 5;
        return;
    }

    if (isStuck(bot, pos)) {
        bot._mineDir = { x: dir.z, z: -dir.x };
        bot._msg("§e↩ Takıldı, yön değiştiriliyor...");
        bot._stuckCount = 0;
        bot._cd = 5;
        return;
    }

    const feetBlock = bot._getBlock({ x: cx + dir.x, y: cy, z: cz + dir.z });
    if (feetBlock && feetBlock.typeId !== "minecraft:air") {
        if (!bot._canBreakWithTier(feetBlock.typeId, pickTier)) {
            rotateDueToUnbreakable(bot, dir);
            return;
        }
        return breakAndCount(bot, feetBlock, pickTier);
    }

    const headBlock = bot._getBlock({ x: cx + dir.x, y: cy + 1, z: cz + dir.z });
    if (headBlock && headBlock.typeId !== "minecraft:air") {
        if (!bot._canBreakWithTier(headBlock.typeId, pickTier)) {
            rotateDueToUnbreakable(bot, dir);
            return;
        }
        return breakAndCount(bot, headBlock, pickTier);
    }

    bot._moveTo({ x: cx + dir.x + 0.5, y: pos.y, z: cz + dir.z + 0.5 });
    bot._mineStep++;
    bot._cd = 3;

    if (bot._mineStep % 50 === 0) {
        bot._mineDir = { x: dir.z, z: -dir.x };
        bot._msg(`§b⛏ Şerit madencilik: ${bot._mineStep} adım, yeni şerit açılıyor...`);
    } else if (bot._mineStep % 10 === 0) {
        bot._msg(`§b⛏ Şerit madencilik: ${bot._mineStep} adım (Y=${cy})`);
    }
}

function hasForwardDanger(bot, cx, cy, cz, dir) {
    for (let ddx = -1; ddx <= 1; ddx++) {
        for (let ddz = -1; ddz <= 1; ddz++) {
            const chk = bot._getBlock({ x: cx + dir.x + ddx, y: cy, z: cz + dir.z + ddz });
            const chk2 = bot._getBlock({ x: cx + dir.x + ddx, y: cy + 1, z: cz + dir.z + ddz });
            if ((chk && DANGER_BLOCKS.includes(chk.typeId)) || (chk2 && DANGER_BLOCKS.includes(chk2.typeId))) {
                return true;
            }
        }
    }
    return false;
}

function isStuck(bot, pos) {
    // Blok kırma devam ediyorsa takılma değil, kırma süresi
    if (bot._breakingBlockKey) return false;

    const lastPos = bot._lastMinePos;
    if (lastPos) {
        const moved = Math.abs(pos.x - lastPos.x) + Math.abs(pos.z - lastPos.z);
        if (moved < 0.1) bot._stuckCount = (bot._stuckCount ?? 0) + 1;
        else bot._stuckCount = 0;
    }
    bot._lastMinePos = { x: pos.x, y: pos.y, z: pos.z };
    return (bot._stuckCount ?? 0) > 8;
}

function rotateDueToUnbreakable(bot, dir) {
    bot._mineDir = { x: dir.z, z: -dir.x };
    bot._msg("§e↩ Kıramıyorum, yön değiştiriliyor...");
    bot._cd = 5;
}
