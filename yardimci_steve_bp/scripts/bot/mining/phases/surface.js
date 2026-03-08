import { LOG_IDS, HAND_BLOCKS } from "../../constants.js";
import { isStoneBlock } from "../constants.js";
import { breakAndCount } from "../helpers.js";

export function doSurfaceMine(bot, pickTier) {
    const pos = bot.entity.location;
    const cx = Math.floor(pos.x);
    const cy = Math.floor(pos.y);
    const cz = Math.floor(pos.z);

    const feetBlock = bot._getBlock({ x: cx, y: cy, z: cz });
    if (feetBlock && ["minecraft:short_grass", "minecraft:tall_grass", "minecraft:fern", "minecraft:large_fern"].includes(feetBlock.typeId)) {
        bot._clearHeldTool();
        bot._breakBlock(feetBlock);
        bot._cd = 3;
        return;
    }

    const belowBlock = bot._getBlock({ x: cx, y: cy - 1, z: cz });
    const twoBelowBlock = bot._getBlock({ x: cx, y: cy - 2, z: cz });
    if (!belowBlock || belowBlock.typeId === "minecraft:air") {
        if (twoBelowBlock && twoBelowBlock.typeId !== "minecraft:air") {
            bot._moveTo({ x: cx + 0.5, y: pos.y - 1, z: cz + 0.5 });
        } else {
            bot._moveTo({ x: cx + 0.5, y: pos.y, z: cz + 0.5 });
        }
        bot._cd = 3;
        return;
    }

    if (isStoneBlock(belowBlock.typeId)) {
        bot._minePhase = "STAIRCASE";
        bot._mineStep = 0;
        bot._setMineDirection();
        bot._msg("§b⛏ Taşa ulaşıldı! Merdiven kazma başlıyor...");
        return;
    }

    if (twoBelowBlock && isStoneBlock(twoBelowBlock.typeId)) {
        bot._moveTo({ x: cx + 0.5, y: pos.y - 1, z: cz + 0.5 });
        bot._cd = 3;
        return;
    }

    const stoneTarget = findNearbyStone(bot, 10);
    if (stoneTarget) {
        const dist = bot._distToBlock(stoneTarget);
        if (dist > 2) {
            bot._moveTo(bot._blockCenter(stoneTarget));
            bot._cd = 3;
            return;
        }
        bot._minePhase = "STAIRCASE";
        bot._mineStep = 0;
        bot._setMineDirection();
        bot._msg("§b⛏ Taşa yönelindi! Merdiven kazma başlıyor...");
        return;
    }

    if (HAND_BLOCKS.includes(belowBlock.typeId) && !LOG_IDS.includes(belowBlock.typeId)) {
        return breakAndCount(bot, belowBlock, pickTier);
    }

    if (bot._canBreakWithTier(belowBlock.typeId, pickTier)) {
        return breakAndCount(bot, belowBlock, pickTier);
    }

    bot._minePhase = "STAIRCASE";
    bot._mineStep = 0;
    bot._setMineDirection();
    bot._msg("§b⛏ Merdiven kazma başlıyor...");
}

function findNearbyStone(bot, radius) {
    const pos = bot.entity.location;
    const dim = bot.entity.dimension;
    let best = null;
    let bestD = Infinity;

    for (let dx = -radius; dx <= radius; dx += 2) {
        for (let dy = -8; dy <= 2; dy++) {
            for (let dz = -radius; dz <= radius; dz += 2) {
                try {
                    const bp = { x: Math.floor(pos.x) + dx, y: Math.floor(pos.y) + dy, z: Math.floor(pos.z) + dz };
                    const b = dim.getBlock(bp);
                    if (b && isStoneBlock(b.typeId)) {
                        const d = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
                        if (d < bestD) {
                            bestD = d;
                            best = b;
                        }
                    }
                } catch { continue; }
            }
        }
    }

    return best;
}
