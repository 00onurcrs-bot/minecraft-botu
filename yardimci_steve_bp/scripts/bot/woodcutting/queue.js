import { LOG_IDS, AXE_TIERS } from "../constants.js";
import { autoCraftAxe } from "../crafting.js";
import { smartMoveTo } from "./move.js";

export function chopFromQueue(bot, axeTier) {
    const next = bot._treeQueue[0];
    const block = bot._getBlock(next);
    if (!block || !LOG_IDS.includes(block.typeId)) {
        bot._treeQueue.shift();
        bot._cd = 2;
        return;
    }

    const dist = bot._distToBlock(block);
    if (dist > 1.8) {
        smartMoveTo(bot, bot._blockCenter(block), {
            treePos: block.location,
            treeTopY: block.location.y,
            treeLockKeys: bot._treeLockKeys
        });
        bot._cd = 2;
        return;
    }

    const loc = block.location;
    const vinePositions = [
        { x: loc.x + 1, y: loc.y, z: loc.z },
        { x: loc.x - 1, y: loc.y, z: loc.z },
        { x: loc.x, y: loc.y, z: loc.z + 1 },
        { x: loc.x, y: loc.y, z: loc.z - 1 }
    ];
    for (const vinePos of vinePositions) {
        const vineBlock = bot._getBlock(vinePos);
        if (vineBlock && (vineBlock.typeId === "minecraft:vine" || vineBlock.typeId.includes("vine"))) {
            bot._breakBlock(vineBlock);
            bot._sfx(vinePos, "dig.grass");
            bot._cd = 3;
            return;
        }
    }

    if (!bot._breakBlock(block)) {
        // breakBlock false = kırma devam ediyor (progress-based)
        // _cd=1 ile her tick çağrılmalı, yoksa progress duraksıyor
        bot._cd = 1;
        return;
    }

    bot._stats.woodChopped++;
    bot._leafCleanupCenter = { x: loc.x, y: loc.y, z: loc.z };
    bot._sfx(loc, "dig.wood");

    if (axeTier > 0) {
        const toolResult = bot._damageTool(AXE_TIERS);
        if (toolResult.broken) {
            bot._msg("§c[AXE] Balta kirildi! Yenisini yapiyorum...");
            autoCraftAxe(bot, 0);
        }
    }

    bot._treeQueue.shift();
    if (bot._treeQueue.length === 0) {
        bot._msg(`§6[WOOD] Agac govdesi temizlendi! §7(Toplam: ${bot._stats.woodChopped})`);
        bot._treeQueue = null;
        bot._targetTree = null;
        bot._chopStuckCount = 0;
        bot.setState("BREAKING_LEAVES");
        bot._cd = 3;
        return;
    }

    bot._cd = axeTier > 0 ? 4 : 10;
}
