import { BlockPermutation } from "@minecraft/server";
import { LOG_IDS } from "../../constants.js";

function isReplaceable(block) {
    return block && (
        block.typeId === "minecraft:air" ||
        block.typeId === "minecraft:cave_air" ||
        block.typeId === "minecraft:void_air" ||
        block.typeId.includes("grass") ||
        block.typeId.includes("fern")
    );
}

function hasSupport(block) {
    return block && block.typeId !== "minecraft:air" && block.typeId !== "minecraft:cave_air" && block.typeId !== "minecraft:void_air";
}

function craftMissingChests(bot) {
    let chestCount = bot._countItem("minecraft:chest");
    if (chestCount >= 2) return true;

    let planks = bot._countItem("minecraft:oak_planks");
    const missingPlanks = Math.max(0, (2 - chestCount) * 8 - planks);
    const neededLogs = Math.ceil(missingPlanks / 4);
    if (neededLogs > 0) {
        if (bot._countLogs() < neededLogs) return chestCount > 0 || planks >= 8;

        for (let i = 0; i < neededLogs; i++) {
            for (const logId of LOG_IDS) {
                if (bot._countItem(logId) > 0) {
                    bot._removeItem(logId, 1);
                    bot._addItem("minecraft:oak_planks", 4);
                    break;
                }
            }
        }
    }

    planks = bot._countItem("minecraft:oak_planks");
    chestCount = bot._countItem("minecraft:chest");
    const craftable = Math.min(2 - chestCount, Math.floor(planks / 8));
    for (let i = 0; i < craftable; i++) {
        bot._removeItem("minecraft:oak_planks", 8);
        bot._addItem("minecraft:chest", 1);
        bot._stats.itemsCrafted++;
    }

    return bot._countItem("minecraft:chest") > 0;
}

function findChestPositions(bot, origin) {
    const dirs = [
        { x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 },
        { x: 2, z: 0 }, { x: -2, z: 0 }, { x: 0, z: 2 }, { x: 0, z: -2 },
        { x: 1, z: 1 }, { x: -1, z: -1 }, { x: 1, z: -1 }, { x: -1, z: 1 }
    ];

    const wantDouble = bot._countItem("minecraft:chest") >= 2;

    for (const d of dirs) {
        const pos1 = { x: origin.x + d.x, y: origin.y, z: origin.z + d.z };
        const block1 = bot._getBlock(pos1);
        const below1 = bot._getBlock({ x: pos1.x, y: pos1.y - 1, z: pos1.z });
        if (!isReplaceable(block1) || !hasSupport(below1)) continue;

        if (!wantDouble) return { chest1Pos: pos1, chest2Pos: null };

        const neighbors = [
            { x: pos1.x + 1, y: pos1.y, z: pos1.z },
            { x: pos1.x - 1, y: pos1.y, z: pos1.z },
            { x: pos1.x, y: pos1.y, z: pos1.z + 1 },
            { x: pos1.x, y: pos1.y, z: pos1.z - 1 }
        ];

        for (const pos2 of neighbors) {
            const block2 = bot._getBlock(pos2);
            const below2 = bot._getBlock({ x: pos2.x, y: pos2.y - 1, z: pos2.z });
            if (!isReplaceable(block2) || !hasSupport(below2)) continue;
            return { chest1Pos: pos1, chest2Pos: pos2 };
        }

        return { chest1Pos: pos1, chest2Pos: null };
    }

    return { chest1Pos: null, chest2Pos: null };
}

export function storePhasePlaceChest(bot) {
    const ownerPos = bot.owner.location;
    const origin = {
        x: Math.floor(ownerPos.x),
        y: Math.floor(ownerPos.y),
        z: Math.floor(ownerPos.z)
    };

    if (!craftMissingChests(bot)) {
        bot._msg("§c[STORE] Sandik icin yeterli materyal yok.");
        bot._storePhase = "DONE";
        bot._cd = 10;
        return;
    }

    const { chest1Pos, chest2Pos } = findChestPositions(bot, origin);
    if (!chest1Pos) {
        bot._msg("§c[STORE] Sandik koyacak yer bulunamadi.");
        bot._storePhase = "DONE";
        bot._cd = 10;
        return;
    }

    try {
        bot.entity.dimension.setBlockPermutation(chest1Pos, BlockPermutation.resolve("minecraft:chest"));
        bot._removeItem("minecraft:chest", 1);

        let placedDouble = false;
        if (chest2Pos && bot._countItem("minecraft:chest") > 0) {
            bot.entity.dimension.setBlockPermutation(chest2Pos, BlockPermutation.resolve("minecraft:chest"));
            bot._removeItem("minecraft:chest", 1);
            placedDouble = true;
        }

        bot._sfx(chest1Pos, "use.wood");
        bot._msg(placedDouble ? "§e[STORE] Buyuk sandik koyuldu." : "§e[STORE] Sandik koyuldu.");
        bot._chestPos1 = chest1Pos;
        bot._chestPos2 = placedDouble ? chest2Pos : null;
        bot._storePhase = "DEPOSIT";
        bot._cd = 10;
    } catch {
        bot._msg("§c[STORE] Sandik koyulamadi.");
        bot._storePhase = "DONE";
        bot._cd = 10;
    }
}
