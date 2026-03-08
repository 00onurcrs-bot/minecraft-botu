import { BlockPermutation } from "@minecraft/server";
import { STRIP_MINE_Y, isStoneBlock } from "../constants.js";
import { breakAndCount } from "../helpers.js";

const DANGER_BLOCKS = ["minecraft:lava", "minecraft:flowing_lava", "minecraft:water", "minecraft:flowing_water"];
const SUPPORT_BLOCK_IDS = ["minecraft:cobblestone", "minecraft:cobbled_deepslate"];

function isAirLike(block) {
    return !block || block.typeId === "minecraft:air" || block.typeId === "minecraft:cave_air" || block.typeId === "minecraft:void_air";
}

function getSupportBlockId(bot) {
    for (const blockId of SUPPORT_BLOCK_IDS) {
        if (bot._countItem(blockId) > 0) return blockId;
    }
    return null;
}

function placeSupportBlock(bot, pos) {
    const supportId = getSupportBlockId(bot);
    if (!supportId) return false;
    if (!isAirLike(bot._getBlock(pos))) return false;

    try {
        bot.entity.dimension.setBlockPermutation(pos, BlockPermutation.resolve(supportId));
        bot._removeItem(supportId, 1);
        bot._sfx(pos, "use.stone");
        return true;
    } catch {
        return false;
    }
}

function ensureStairSupport(bot, cx, cy, cz, dir) {
    const belowCurrentPos = { x: cx, y: cy - 1, z: cz };
    if (isAirLike(bot._getBlock(belowCurrentPos))) {
        if (placeSupportBlock(bot, belowCurrentPos)) {
            bot._msg("§7[MINE] Merdiven destegi duzeltildi.");
            bot._cd = 3;
            return true;
        }
    }

    const nextStepPos = { x: cx + dir.x, y: cy - 1, z: cz + dir.z };
    const nextFloorPos = { x: cx + dir.x, y: cy - 2, z: cz + dir.z };
    if (isAirLike(bot._getBlock(nextStepPos)) && isAirLike(bot._getBlock(nextFloorPos))) {
        if (placeSupportBlock(bot, nextFloorPos)) {
            bot._msg("§7[MINE] Merdiven inisi kirik tasla duzeltildi.");
            bot._cd = 3;
            return true;
        }
    }

    return false;
}

export function doStaircaseMine(bot, pickTier) {
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

    if (ensureStairSupport(bot, cx, cy, cz, dir)) return;

    if (hasForwardDanger(bot, cx, cy, cz, dir)) {
        bot._mineDir = { x: dir.z, z: -dir.x };
        bot._msg("§c[MINE] Tehlike! Yon degistiriliyor...");
        bot._cd = 5;
        return;
    }

    if (isStuck(bot, pos)) {
        bot._mineDir = { x: dir.z, z: -dir.x };
        bot._msg("§e[MINE] Takildi, yon degistiriliyor...");
        bot._stuckCount = 0;
        bot._cd = 5;
        return;
    }

    if (cy <= STRIP_MINE_Y) {
        bot._minePhase = "STRIP_MINE";
        bot._mineStep = 0;
        bot._stuckCount = 0;
        bot._setMineDirection();
        bot._msg(`§b[MINE] Elmas seviyesine ulasildi (Y=${cy})! Serit madencilige geciliyor...`);
        bot._cd = 3;
        return;
    }

    const downTarget = { x: cx + dir.x, y: cy - 1, z: cz + dir.z };
    const downBlock = bot._getBlock(downTarget);
    if (downBlock && !isAirLike(downBlock)) {
        if (!bot._canBreakWithTier(downBlock.typeId, pickTier)) {
            rotateDueToUnbreakable(bot, dir);
            return;
        }
        return breakAndCount(bot, downBlock, pickTier);
    }

    const feetBlock = bot._getBlock({ x: cx + dir.x, y: cy, z: cz + dir.z });
    if (feetBlock && !isAirLike(feetBlock)) {
        if (!bot._canBreakWithTier(feetBlock.typeId, pickTier)) {
            rotateDueToUnbreakable(bot, dir);
            return;
        }
        return breakAndCount(bot, feetBlock, pickTier);
    }

    const headBlock = bot._getBlock({ x: cx + dir.x, y: cy + 1, z: cz + dir.z });
    if (headBlock && !isAirLike(headBlock)) {
        if (!bot._canBreakWithTier(headBlock.typeId, pickTier)) {
            rotateDueToUnbreakable(bot, dir);
            return;
        }
        return breakAndCount(bot, headBlock, pickTier);
    }

    const targetX = cx + dir.x + 0.5;
    const targetZ = cz + dir.z + 0.5;
    if (isAirLike(downBlock)) bot._moveTo({ x: targetX, y: pos.y - 1, z: targetZ });
    else bot._moveTo({ x: targetX, y: pos.y, z: targetZ });

    bot._mineStep++;
    bot._cd = 3;
    if (bot._mineStep % 10 === 0) bot._msg(`§b[MINE] Merdiven: ${bot._mineStep} adim, Y=${cy}`);
}

function hasForwardDanger(bot, cx, cy, cz, dir) {
    for (let ddx = -1; ddx <= 1; ddx++) {
        for (let ddy = -2; ddy <= 0; ddy++) {
            for (let ddz = -1; ddz <= 1; ddz++) {
                const chk = bot._getBlock({ x: cx + dir.x + ddx, y: cy + ddy, z: cz + dir.z + ddz });
                if (chk && DANGER_BLOCKS.includes(chk.typeId)) return true;
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
        const moved = Math.abs(pos.x - lastPos.x) + Math.abs(pos.y - lastPos.y) + Math.abs(pos.z - lastPos.z);
        if (moved < 0.1) bot._stuckCount = (bot._stuckCount ?? 0) + 1;
        else bot._stuckCount = 0;
    }
    bot._lastMinePos = { x: pos.x, y: pos.y, z: pos.z };
    return (bot._stuckCount ?? 0) > 8;
}

function rotateDueToUnbreakable(bot, dir) {
    bot._mineDir = { x: dir.z, z: -dir.x };
    bot._msg("§e[MINE] Kiramiyorum, yon degistiriliyor...");
    bot._cd = 5;
}
