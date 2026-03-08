import { LOG_IDS, PICKAXE_TIERS, AXE_TIERS } from "../constants.js";
import { craftPlanksAndSticks, placeCraftTable, smeltIron } from "./base.js";

const PICKAXE_RECIPES = [
    { tier: 4, toolId: "minecraft:diamond_pickaxe", materialId: "minecraft:diamond", materialCount: 3 },
    { tier: 3, toolId: "minecraft:iron_pickaxe", materialId: "minecraft:iron_ingot", materialCount: 3 },
    { tier: 2, toolId: "minecraft:stone_pickaxe", materialIds: ["minecraft:cobblestone", "minecraft:cobbled_deepslate"], materialCount: 3 },
    { tier: 1, toolId: "minecraft:wooden_pickaxe", materialId: "minecraft:oak_planks", materialCount: 3 }
];

const AXE_RECIPES = [
    { tier: 4, toolId: "minecraft:diamond_axe", materialId: "minecraft:diamond", materialCount: 3 },
    { tier: 3, toolId: "minecraft:iron_axe", materialId: "minecraft:iron_ingot", materialCount: 3 },
    { tier: 2, toolId: "minecraft:stone_axe", materialIds: ["minecraft:cobblestone", "minecraft:cobbled_deepslate"], materialCount: 3 },
    { tier: 1, toolId: "minecraft:wooden_axe", materialId: "minecraft:oak_planks", materialCount: 3 }
];

function removeOneLowerTierTool(bot, tierMap, craftedTier) {
    const lowerTools = Object.entries(tierMap)
        .filter(([, tier]) => tier < craftedTier)
        .sort((a, b) => b[1] - a[1]);

    for (const [toolId] of lowerTools) {
        if (bot._countItem(toolId) > 0) {
            bot._removeItem(toolId, 1);
            return;
        }
    }
}

function ensurePlanks(bot, count) {
    while (bot._countItem("minecraft:oak_planks") < count) {
        if (bot._countLogs() <= 0) return false;

        let converted = false;
        for (const logId of LOG_IDS) {
            if (bot._countItem(logId) > 0) {
                bot._removeItem(logId, 1);
                bot._addItem("minecraft:oak_planks", 4);
                bot._stats.itemsCrafted++;
                converted = true;
                break;
            }
        }

        if (!converted) return false;
    }

    return true;
}

function ensureSticks(bot, count) {
    while (bot._countItem("minecraft:stick") < count) {
        if (!ensurePlanks(bot, 2)) return false;
        bot._removeItem("minecraft:oak_planks", 2);
        bot._addItem("minecraft:stick", 4);
        bot._stats.itemsCrafted++;
    }

    return true;
}

function getAvailableRecipeMaterial(bot, recipe) {
    if (recipe.materialId) {
        return bot._countItem(recipe.materialId) >= recipe.materialCount ? recipe.materialId : null;
    }

    for (const materialId of recipe.materialIds ?? []) {
        if (bot._countItem(materialId) >= recipe.materialCount) return materialId;
    }

    return null;
}

function maybeSmeltMetals(bot) {
    if (bot._countItem("minecraft:raw_iron") < 3 && bot._countItem("minecraft:raw_gold") <= 0) return;

    const fuel = bot._countItem("minecraft:coal") > 0
        ? "minecraft:coal"
        : LOG_IDS.find((logId) => bot._countItem(logId) > 0);
    if (!fuel) return;

    smeltIron(bot, fuel);
}

function craftToolFromRecipes(bot, recipes, tierMap, currentTier) {
    maybeSmeltMetals(bot);

    for (const recipe of recipes) {
        if (recipe.tier <= currentTier) continue;

        if (!ensureSticks(bot, 2)) continue;

        const materialId = getAvailableRecipeMaterial(bot, recipe);
        if (!materialId) {
            if (recipe.toolId === "minecraft:wooden_pickaxe" || recipe.toolId === "minecraft:wooden_axe") {
                if (!ensurePlanks(bot, recipe.materialCount + 2)) continue;
            } else {
                continue;
            }
        }

        const selectedMaterialId = materialId ?? recipe.materialId;
        if (!selectedMaterialId || bot._countItem(selectedMaterialId) < recipe.materialCount) continue;
        if (!placeCraftTable(bot)) return false;

        bot._removeItem(selectedMaterialId, recipe.materialCount);
        bot._removeItem("minecraft:stick", 2);
        removeOneLowerTierTool(bot, tierMap, recipe.tier);
        bot._addItem(recipe.toolId, 1);
        bot._stats.itemsCrafted++;
        return true;
    }

    return false;
}

/** En iyi kazmayi uretmeye calis */
export function tryCraftPickaxe(bot, currentTier = 0) {
    if (craftToolFromRecipes(bot, PICKAXE_RECIPES, PICKAXE_TIERS, currentTier)) {
        bot._msg("§d[CRAFT] Yeni kazma yapildi!");
        return true;
    }

    if (bot._countLogs() > 0 && (bot._countItem("minecraft:oak_planks") === 0 || bot._countItem("minecraft:stick") === 0)) {
        craftPlanksAndSticks(bot);
    }

    return false;
}

/** En iyi baltayi uretmeye calis */
export function autoCraftAxe(bot, currentTier = 0) {
    if (!craftToolFromRecipes(bot, AXE_RECIPES, AXE_TIERS, currentTier)) return false;
    bot._msg("§d[CRAFT] Yeni balta yapildi!");
    return true;
}

/** Daha iyi kazma varsa uret */
export function upgradePickaxe(bot, pickTier) {
    if (pickTier < 4) {
        tryCraftPickaxe(bot, pickTier);
    }
}
