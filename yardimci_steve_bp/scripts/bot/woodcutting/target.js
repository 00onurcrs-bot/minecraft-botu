import { LOG_IDS } from "../constants.js";
import { autoCraftAxe } from "../crafting.js";
import { smartMoveTo } from "./move.js";
import { findTreeBase, scanTreeTrunk } from "./treeScan.js";

function clearTreeLock(bot) {
    bot._targetTree = null;
    bot._treeQueue = null;
    bot._treeBasePos = null;
    bot._treeLockKeys = null;
    bot._treeTopY = null;
    bot._leafCleanupCenter = null;
}

function lockTree(bot, baseBlock) {
    const scan = scanTreeTrunk(bot, baseBlock);
    if (scan.tooTall) {
        clearTreeLock(bot);
        bot._cd = 4;
        bot._msg("§e[WOOD] Agac cok yuksek, baska agaca geciyorum...");
        return false;
    }

    bot._treeBasePos = { x: baseBlock.location.x, y: baseBlock.location.y, z: baseBlock.location.z };
    bot._treeLockKeys = scan.keys;
    bot._treeTopY = scan.maxY;
    bot._targetTree = { ...bot._treeBasePos };
    bot._treeQueue = [...scan.queue];
    bot._leafCleanupCenter = { ...bot._treeBasePos };
    bot._chopStuckCount = 0;
    bot._chopSideAttempt = 0;
    bot._lastChopPos = null;
    bot._msg(`§6[WOOD] Agac kilitlendi! ${scan.queue.length} kutuk kirilacak.`);
    bot._cd = 3;
    return true;
}

export function walkToTarget(bot, axeTier) {
    const tb = bot._getBlock(bot._targetTree);
    if (!tb || !LOG_IDS.includes(tb.typeId)) {
        clearTreeLock(bot);
        bot._cd = 3;
        return;
    }

    const dist = bot._distToBlock(tb);
    const pos = bot.entity.location;
    const lastPos = bot._lastChopPos;
    if (lastPos) {
        const moved = Math.abs(pos.x - lastPos.x) + Math.abs(pos.z - lastPos.z);
        if (moved < 0.05) bot._chopStuckCount = (bot._chopStuckCount ?? 0) + 1;
        else bot._chopStuckCount = 0;
    }
    bot._lastChopPos = { x: pos.x, y: pos.y, z: pos.z };

    if ((bot._chopStuckCount ?? 0) > 12) {
        const sideAngle = ((bot._chopSideAttempt ?? 0) % 4) * (Math.PI / 2);
        const sideX = tb.location.x + 0.5 + Math.cos(sideAngle) * 3;
        const sideZ = tb.location.z + 0.5 + Math.sin(sideAngle) * 3;
        bot._moveTo({ x: sideX, y: pos.y, z: sideZ });
        bot._chopSideAttempt = (bot._chopSideAttempt ?? 0) + 1;
        bot._chopStuckCount = 0;

        if ((bot._chopSideAttempt ?? 0) >= 4) {
            clearTreeLock(bot);
            bot._msg("§e[WOOD] Agaca ulasamiyorum, baska agac ariyorum...");
        }
        bot._cd = 3;
        return;
    }

    if (dist > 1.7) {
        smartMoveTo(bot, bot._blockCenter(tb), {
            treePos: tb.location,
            treeTopY: bot._treeTopY ?? tb.location.y,
            treeLockKeys: bot._treeLockKeys
        });
        bot._cd = 2;
        return;
    }

    if (axeTier === 0 && bot._countLogs() >= 2) autoCraftAxe(bot, axeTier);
    if (bot._treeQueue?.length > 0) return;

    lockTree(bot, tb);
}

export function findAndLockTree(bot, axeTier) {
    let block = findTreeBase(bot, 24);
    if (!block) block = findTreeBase(bot, 40);

    if (!block) {
        bot._wanderCount = (bot._wanderCount ?? 0) + 1;
        if (bot._wanderCount % 30 === 1) {
            const angle = Math.random() * Math.PI * 2;
            bot._wanderTarget = {
                x: bot.entity.location.x + Math.cos(angle) * 20,
                y: bot.entity.location.y,
                z: bot.entity.location.z + Math.sin(angle) * 20
            };
        }
        if (bot._wanderTarget) bot._moveTo(bot._wanderTarget);
        bot._cd = 3;
        if (bot._wanderCount % 100 === 0) bot._msg("§e[WOOD] Agac ariyorum...");
        return;
    }

    bot._wanderCount = 0;
    if (!lockTree(bot, block)) return;
    if (axeTier === 0 && bot._countLogs() >= 2) autoCraftAxe(bot, axeTier);
}
