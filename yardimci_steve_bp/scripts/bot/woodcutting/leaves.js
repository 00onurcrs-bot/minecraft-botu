import { LEAF_IDS, PICKAXE_TIERS } from "../constants.js";

const CARDINAL_DIRS = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 }
];

function isSoftPlant(block) {
    if (!block) return false;
    return block.typeId.includes("grass") ||
        block.typeId.includes("fern") ||
        block.typeId.includes("flower") ||
        block.typeId.includes("sapling") ||
        block.typeId === "minecraft:snow_layer" ||
        block.typeId === "minecraft:dead_bush";
}

function isStoneLike(block) {
    if (!block) return false;
    return block.typeId.includes("stone") ||
        block.typeId.includes("deepslate") ||
        block.typeId.includes("blackstone") ||
        block.typeId.includes("cobble") ||
        block.typeId.includes("ore");
}

function getCleanupCenter(bot) {
    return bot._leafCleanupCenter ?? {
        x: Math.floor(bot.entity.location.x),
        y: Math.floor(bot.entity.location.y),
        z: Math.floor(bot.entity.location.z)
    };
}

function findCleanupBlock(bot, center) {
    const pickTier = bot._getToolTier(PICKAXE_TIERS);
    let best = null;
    let bestDist = Infinity;

    for (let y = center.y - 1; y <= center.y + 1; y++) {
        for (const dir of CARDINAL_DIRS) {
            for (let step = 1; step <= 2; step++) {
                const block = bot._getBlock({
                    x: center.x + dir.x * step,
                    y,
                    z: center.z + dir.z * step
                });
                if (!block) continue;

                const canClear = LEAF_IDS.includes(block.typeId) ||
                    isSoftPlant(block) ||
                    (isStoneLike(block) && pickTier > 0 && bot._canBreakWithTier(block.typeId, pickTier));
                if (!canClear) continue;

                const dist = Math.abs(block.location.x - center.x) + Math.abs(block.location.y - center.y) + Math.abs(block.location.z - center.z);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = block;
                }
            }
        }
    }

    return best;
}

function findNearestDroppedLog(bot) {
    try {
        const pos = bot.entity.location;
        const items = bot.entity.dimension.getEntities({ location: pos, maxDistance: 8, type: "minecraft:item" });
        let nearest = null;
        let nearestDist = Infinity;

        for (const item of items) {
            const stack = item.getComponent("minecraft:item")?.itemStack;
            if (!stack || !stack.typeId.endsWith("_log") && !stack.typeId.endsWith("_stem")) continue;

            const dx = item.location.x - pos.x;
            const dz = item.location.z - pos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = item;
            }
        }

        return { entity: nearest, dist: nearestDist };
    } catch {
        return { entity: null, dist: Infinity };
    }
}

function clearTreeContext(bot) {
    bot._targetTree = null;
    bot._treeQueue = null;
    bot._treeBasePos = null;
    bot._treeLockKeys = null;
    bot._treeTopY = null;
    bot._leafCleanupCenter = null;
}

export function doBreakLeaves(bot) {
    if (bot._tickCd()) return;

    const center = getCleanupCenter(bot);
    const cleanupBlock = findCleanupBlock(bot, center);
    if (cleanupBlock) {
        const dist = bot._distToBlock(cleanupBlock);
        if (dist > 2.5) {
            bot._moveTo(bot._blockCenter(cleanupBlock));
            bot._cd = 2;
            return;
        }

        const stoneLike = isStoneLike(cleanupBlock);
        if (stoneLike) bot._syncHeldTool(PICKAXE_TIERS);

        if (bot._breakBlock(cleanupBlock)) {
            if (stoneLike) {
                bot._sfx(cleanupBlock.location, "dig.stone");
                bot._damageTool(PICKAXE_TIERS);
            } else {
                bot._sfx(cleanupBlock.location, "dig.grass");
            }
        }
        bot._cd = 3;
        return;
    }

    const dropped = findNearestDroppedLog(bot);
    if (dropped.entity) {
        if (dropped.dist > 1.5) {
            bot._moveTo({ x: dropped.entity.location.x, y: bot.entity.location.y, z: dropped.entity.location.z });
            bot._cd = 2;
            return;
        }

        bot._cd = 2;
        return;
    }

    clearTreeContext(bot);
    bot.setState("CHOPPING_WOOD");
    bot._cd = 2;
}
