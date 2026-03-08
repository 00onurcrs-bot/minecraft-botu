import { BlockPermutation } from "@minecraft/server";
import { PICKAXE_TIERS } from "../constants.js";
import { craftPlanksAndSticks, tryCraftPickaxe, upgradePickaxe } from "../crafting.js";
import { checkAndTriggerStore } from "../storage.js";
import { doSurfaceMine, doStaircaseMine, doStripMine } from "./phases.js";
import { checkOrePriority } from "./helpers.js";

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

function placeResumeSupport(bot, pos) {
    const supportId = getSupportBlockId(bot);
    if (!supportId) return false;
    if (!isAirLike(bot._getBlock(pos))) return false;

    try {
        bot.entity.dimension.setBlockPermutation(pos, BlockPermutation.resolve(supportId));
        bot._removeItem(supportId, 1);
        bot._sfx(pos, "use.stone");
        bot._msg("§7[MINE] Donus yolu kirik tasla desteklendi.");
        return true;
    } catch {
        return false;
    }
}

function ensureResumeSupport(bot) {
    const pos = bot.entity.location;
    const anchor = bot._resumeMinePos;
    if (!anchor) return false;

    const currentBelow = {
        x: Math.floor(pos.x),
        y: Math.floor(pos.y) - 1,
        z: Math.floor(pos.z)
    };
    if (isAirLike(bot._getBlock(currentBelow)) && placeResumeSupport(bot, currentBelow)) {
        bot._cd = 2;
        return true;
    }

    const anchorBelow = {
        x: Math.floor(anchor.x),
        y: Math.floor(anchor.y) - 1,
        z: Math.floor(anchor.z)
    };
    if (isAirLike(bot._getBlock(anchorBelow)) && placeResumeSupport(bot, anchorBelow)) {
        bot._cd = 2;
        return true;
    }

    return false;
}

function resumeMinePath(bot) {
    if (!bot._resumeMinePos) return false;
    if (ensureResumeSupport(bot)) return true;

    if (bot._distTo(bot._resumeMinePos) > 1.25) {
        bot._moveTo(bot._resumeMinePos);
        bot._cd = 3;
        return true;
    }

    bot._resumeMinePos = null;
    bot._oreAnchorPos = null;
    bot._msg("§b[MINE] Kazma rotasina geri donuldu.");
    return false;
}

export function doMine(bot) {
    if (bot._tickCd()) return;
    if (resumeMinePath(bot)) return;
    if (checkAndTriggerStore(bot)) return;

    const pickTier = bot._getToolTier(PICKAXE_TIERS);

    if (bot._minePhase === "PREP") {
        if (pickTier >= 1) {
            bot._minePhase = "SURFACE";
            bot._msg("§b[MINE] Kazma hazir! Yuzey temizleniyor...");
            bot._setMineDirection();
            bot._pickWait = 0;
            return;
        }

        bot._pickWait = (bot._pickWait ?? 0) + 1;
        if (bot._pickWait <= 100) {
            if (bot._pickWait === 1) bot._msg("§e[MINE] Kazma bekleniyor... (5 sn icinde kazma ver veya bekle)");
            if (bot._pickWait === 50) bot._msg("§e[MINE] Kazma bekleniyor... 2.5 sn kaldi");
            bot._cd = 1;
            return;
        }

        bot._pickWait = 0;
        if (tryCraftPickaxe(bot, pickTier)) {
            bot._cd = 20;
            return;
        }

        if (bot._countLogs() === 0) {
            bot._msg("§e[MINE] Kazma yok, odun kiriyorum...");
            bot.setState("CHOPPING_WOOD");
            return;
        }

        craftPlanksAndSticks(bot);
        bot._cd = 10;
        return;
    }

    if (pickTier === 0) {
        bot._minePhase = "PREP";
        bot._cd = 5;
        return;
    }

    upgradePickaxe(bot, pickTier);
    if (checkOrePriority(bot, pickTier)) return;

    if (bot._minePhase === "SURFACE") {
        doSurfaceMine(bot, pickTier);
        return;
    }

    if (bot._minePhase === "STAIRCASE") {
        doStaircaseMine(bot, pickTier);
        return;
    }

    if (bot._minePhase === "STRIP_MINE") doStripMine(bot, pickTier);
}
