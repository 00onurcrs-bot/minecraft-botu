import { AXE_TIERS } from "../constants.js";
import { autoCraftAxe } from "../crafting.js";
import { checkAndTriggerStore } from "../storage.js";
import { chopFromQueue } from "./queue.js";
import { walkToTarget, findAndLockTree } from "./target.js";

export function doChop(bot) {
    if (bot._tickCd()) return;
    if (checkAndTriggerStore(bot)) return;

    const axeTier = bot._getToolTier(AXE_TIERS);
    if (axeTier === 0 && bot._countLogs() >= 2) {
        autoCraftAxe(bot, axeTier);
        bot._cd = 30;
        return;
    }

    if (bot._treeQueue && bot._treeQueue.length > 0) {
        chopFromQueue(bot, axeTier);
        return;
    }
    if (bot._targetTree) {
        walkToTarget(bot, axeTier);
        return;
    }
    findAndLockTree(bot, axeTier);
}
