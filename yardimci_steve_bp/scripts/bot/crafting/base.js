import { BlockPermutation } from "@minecraft/server";
import { HAND_BLOCKS, LEAF_IDS, LOG_IDS, PICKAXE_TIERS } from "../constants.js";

function isAirLike(block) {
    return !block || block.typeId === "minecraft:air" || block.typeId === "minecraft:cave_air" || block.typeId === "minecraft:void_air";
}

/** Odunlardan tahta ve cubuk uret */
export function craftPlanksAndSticks(bot) {
    for (const logId of LOG_IDS) {
        if (bot._countItem(logId) > 0) {
            bot._removeItem(logId, 1);
            bot._addItem("minecraft:oak_planks", 4);
            bot._stats.itemsCrafted++;
            bot._msg("§d[CRAFT] 4x Tahta yapildi");
            break;
        }
    }

    if (bot._countItem("minecraft:oak_planks") >= 2) {
        bot._removeItem("minecraft:oak_planks", 2);
        bot._addItem("minecraft:stick", 4);
        bot._stats.itemsCrafted++;
        bot._msg("§d[CRAFT] 4x Cubuk yapildi");
    }
}

function isPlaceableSupport(block) {
    return block && !isAirLike(block);
}

function isReplaceableBlock(block) {
    return block && (
        isAirLike(block) ||
        block.typeId === "minecraft:short_grass" ||
        block.typeId === "minecraft:tall_grass" ||
        block.typeId === "minecraft:fern" ||
        block.typeId === "minecraft:large_fern" ||
        block.typeId.includes("flower") ||
        block.typeId.includes("sapling")
    );
}

function canClearCraftSpot(bot, block) {
    if (!block) return false;
    if (isReplaceableBlock(block)) return true;
    if (LEAF_IDS.includes(block.typeId)) return true;
    if (HAND_BLOCKS.includes(block.typeId)) return true;

    const pickTier = bot._getToolTier(PICKAXE_TIERS);
    return bot._canBreakWithTier(block.typeId, pickTier);
}

function clearCraftSpot(bot, pos, block) {
    if (isReplaceableBlock(block)) return true;
    if (!canClearCraftSpot(bot, block)) return false;
    if (!bot._breakBlock(block)) return false;
    return isAirLike(bot._getBlock(pos));
}

/** Calisma masasi koy - 4 tahta harcar */
export function placeCraftTable(bot) {
    try {
        if (bot._craftTablePos) {
            const existing = bot._getBlock(bot._craftTablePos);
            if (existing && existing.typeId === "minecraft:crafting_table") {
                const p = bot.entity.location;
                const dx = p.x - bot._craftTablePos.x;
                const dz = p.z - bot._craftTablePos.z;
                if (Math.sqrt(dx * dx + dz * dz) <= 20) return true;
            }
            bot._craftTablePos = null;
        }

        while (bot._countItem("minecraft:oak_planks") < 4 && bot._countLogs() > 0) {
            for (const logId of LOG_IDS) {
                if (bot._countItem(logId) > 0) {
                    bot._removeItem(logId, 1);
                    bot._addItem("minecraft:oak_planks", 4);
                    bot._stats.itemsCrafted++;
                    bot._msg("§d[CRAFT] 1 Odun -> 4 Tahta");
                    break;
                }
            }
        }

        if (bot._countItem("minecraft:oak_planks") < 4) {
            bot._msg("§cCalisma masasi icin 4 tahta lazim!");
            return false;
        }

        const pos = bot.entity.location;
        const cx = Math.floor(pos.x);
        const cy = Math.floor(pos.y);
        const cz = Math.floor(pos.z);
        const dirs = [
            { x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 },
            { x: 1, z: 1 }, { x: -1, z: -1 }, { x: 1, z: -1 }, { x: -1, z: 1 }
        ];

        for (const d of dirs) {
            const tablePos = { x: cx + d.x, y: cy, z: cz + d.z };
            const block = bot._getBlock(tablePos);
            const belowBlock = bot._getBlock({ x: tablePos.x, y: tablePos.y - 1, z: tablePos.z });
            if (!isPlaceableSupport(belowBlock)) continue;
            if (!clearCraftSpot(bot, tablePos, block)) continue;

            bot._removeItem("minecraft:oak_planks", 4);
            bot.entity.dimension.setBlockPermutation(tablePos, BlockPermutation.resolve("minecraft:crafting_table"));
            bot._craftTablePos = tablePos;
            bot._sfx(tablePos, "use.wood");
            bot._msg("§d[CRAFT] Calisma masasi yapildi! (4 tahta harcandi)");
            return true;
        }

        bot._msg("§cCalisma masasi koyacak yer yok!");
        return false;
    } catch {
        return false;
    }
}

/** Calisma masasini kaldir */
export function removeCraftTable(bot) {
    try {
        if (bot._craftTablePos) {
            const block = bot._getBlock(bot._craftTablePos);
            if (block && block.typeId === "minecraft:crafting_table") {
                bot.entity.dimension.setBlockPermutation(bot._craftTablePos, BlockPermutation.resolve("minecraft:air"));
                bot._sfx(bot._craftTablePos, "dig.wood");
            }
            bot._craftTablePos = null;
        }
    } catch { }
}

/** Ham demir ve altini pisir - ocak koy */
export function smeltIron(bot, fuelId) {
    try {
        const rawIron = bot._countItem("minecraft:raw_iron");
        const rawGold = bot._countItem("minecraft:raw_gold");
        const totalRaw = rawIron + rawGold;
        if (totalRaw <= 0) return;

        if (bot._countItem("minecraft:cobblestone") < 8) {
            bot._msg("§cOcak icin 8 kaldirim tasi lazim!");
            return;
        }

        const pos = bot.entity.location;
        const dir = bot._mineDir ?? { x: 0, z: 1 };
        const furnacePos = {
            x: Math.floor(pos.x) - dir.x,
            y: Math.floor(pos.y),
            z: Math.floor(pos.z) - dir.z
        };

        const block = bot._getBlock(furnacePos);
        const belowBlock = bot._getBlock({ x: furnacePos.x, y: furnacePos.y - 1, z: furnacePos.z });

        if (isReplaceableBlock(block) && isPlaceableSupport(belowBlock)) {
            bot._removeItem("minecraft:cobblestone", 8);
            bot.entity.dimension.setBlockPermutation(furnacePos, BlockPermutation.resolve("minecraft:furnace"));
            bot._sfx(furnacePos, "use.stone");
            bot._msg("§d[CRAFT] Ocak yapildi! (8 kaldirim tasi)");
        } else if (!block || block.typeId !== "minecraft:furnace") {
            bot._msg("§cOcak koyacak yer bulunamadi!");
            return;
        }

        const fuelCount = bot._countItem(fuelId);
        const maxSmelt = Math.min(totalRaw, 10, fuelCount * 2);
        const ironToSmelt = Math.min(rawIron, maxSmelt);
        const goldToSmelt = Math.min(rawGold, maxSmelt - ironToSmelt);
        const totalSmelt = ironToSmelt + goldToSmelt;
        if (totalSmelt <= 0) return;

        bot._removeItem(fuelId, Math.ceil(totalSmelt / 2));

        if (ironToSmelt > 0) {
            bot._removeItem("minecraft:raw_iron", ironToSmelt);
            bot._addItem("minecraft:iron_ingot", ironToSmelt);
            bot._stats.itemsCrafted += ironToSmelt;
            bot._msg(`§6[SMELT] ${ironToSmelt} Ham Demir -> ${ironToSmelt} Demir Kulcesi pisirildi!`);
        }

        if (goldToSmelt > 0) {
            bot._removeItem("minecraft:raw_gold", goldToSmelt);
            bot._addItem("minecraft:gold_ingot", goldToSmelt);
            bot._stats.itemsCrafted += goldToSmelt;
            bot._msg(`§6[SMELT] ${goldToSmelt} Ham Altin -> ${goldToSmelt} Altin Kulcesi pisirildi!`);
        }
    } catch { }
}
