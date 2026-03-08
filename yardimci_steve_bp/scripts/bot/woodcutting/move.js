import { HAND_BLOCKS, LEAF_IDS, LOG_IDS, PICKAXE_TIERS } from "../constants.js";

const CARDINAL_DIRS = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 }
];

function getPosKey(pos) {
    return `${pos.x},${pos.y},${pos.z}`;
}

function isAirLike(block) {
    return !block || block.typeId === "minecraft:air" || block.typeId === "minecraft:cave_air" || block.typeId === "minecraft:void_air";
}

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

function isLockedTreeLog(block, treeLockKeys) {
    if (!block || !LOG_IDS.includes(block.typeId)) return false;
    if (!treeLockKeys) return true;
    return treeLockKeys.has(getPosKey(block.location));
}

function findTreeFoliageToClear(bot, treePos, treeTopY, treeLockKeys) {
    if (!treePos) return null;

    const topY = Math.max(treePos.y, treeTopY ?? treePos.y);
    const pos = bot.entity.location;
    let best = null;
    let bestDist = Infinity;

    for (let y = treePos.y; y <= topY; y++) {
        for (const dir of CARDINAL_DIRS) {
            for (let step = 1; step <= 2; step++) {
                const block = bot._getBlock({
                    x: treePos.x + dir.x * step,
                    y,
                    z: treePos.z + dir.z * step
                });

                if (!block || isAirLike(block)) continue;
                if (isLockedTreeLog(block, treeLockKeys)) continue;
                if (LOG_IDS.includes(block.typeId)) break;
                if (LEAF_IDS.includes(block.typeId) || isSoftPlant(block)) {
                    const dx = block.location.x + 0.5 - pos.x;
                    const dz = block.location.z + 0.5 - pos.z;
                    const horizontal = Math.sqrt(dx * dx + dz * dz);
                    const vertical = Math.abs(block.location.y - Math.floor(pos.y));
                    if (horizontal > 2.5 || vertical > 2) continue;

                    const dist = horizontal + vertical;
                    if (dist < bestDist) {
                        bestDist = dist;
                        best = block;
                    }
                }
                break;
            }
        }
    }

    return best;
}

export function smartMoveTo(bot, target, options = {}) {
    const treeFoliage = findTreeFoliageToClear(bot, options.treePos, options.treeTopY, options.treeLockKeys);
    if (treeFoliage) {
        bot._breakBlock(treeFoliage);
        bot._sfx(treeFoliage.location, "dig.grass");
        return;
    }

    const pos = bot.entity.location;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const m = Math.sqrt(dx * dx + dz * dz);
    if (m < 0.1) return;

    const checkDist = 1.0;
    const nx = pos.x + (dx / m) * checkDist;
    const nz = pos.z + (dz / m) * checkDist;
    const bx = Math.floor(nx);
    const by = Math.floor(pos.y);
    const bz = Math.floor(nz);

    const feetBlock = bot._getBlock({ x: bx, y: by, z: bz });
    const headBlock = bot._getBlock({ x: bx, y: by + 1, z: bz });

    if (feetBlock && (LEAF_IDS.includes(feetBlock.typeId) || isSoftPlant(feetBlock))) {
        bot._breakBlock(feetBlock);
        bot._sfx(feetBlock.location, "dig.grass");
        return;
    }
    if (headBlock && (LEAF_IDS.includes(headBlock.typeId) || isSoftPlant(headBlock))) {
        bot._breakBlock(headBlock);
        bot._sfx(headBlock.location, "dig.grass");
        return;
    }

    const isSolidBlocker = feetBlock && !isAirLike(feetBlock) && !LOG_IDS.includes(feetBlock.typeId);
    if (isSolidBlocker) {
        if (HAND_BLOCKS.includes(feetBlock.typeId)) {
            bot._breakBlock(feetBlock);
            bot._sfx(feetBlock.location, "dig.grass");
            return;
        }

        const stoneLike = isStoneLike(feetBlock);
        if (stoneLike) {
            const pickTier = bot._getToolTier(PICKAXE_TIERS);
            if (pickTier > 0 && bot._canBreakWithTier(feetBlock.typeId, pickTier)) {
                bot._syncHeldTool(PICKAXE_TIERS);
                if (bot._breakBlock(feetBlock)) {
                    bot._sfx(feetBlock.location, "dig.stone");
                    bot._damageTool(PICKAXE_TIERS);
                }
                return;
            }
        }

        const perpX = -dz / m;
        const perpZ = dx / m;
        const sideOffset = 1.5;
        const side1 = bot._getBlock({ x: Math.floor(pos.x + perpX * sideOffset), y: by, z: Math.floor(pos.z + perpZ * sideOffset) });
        const side2 = bot._getBlock({ x: Math.floor(pos.x - perpX * sideOffset), y: by, z: Math.floor(pos.z - perpZ * sideOffset) });
        const side1Head = bot._getBlock({ x: Math.floor(pos.x + perpX * sideOffset), y: by + 1, z: Math.floor(pos.z + perpZ * sideOffset) });
        const side2Head = bot._getBlock({ x: Math.floor(pos.x - perpX * sideOffset), y: by + 1, z: Math.floor(pos.z - perpZ * sideOffset) });
        const isSideFree = (a, b) => (isAirLike(a) || isSoftPlant(a) || LEAF_IDS.includes(a?.typeId)) && (isAirLike(b) || isSoftPlant(b) || LEAF_IDS.includes(b?.typeId));

        if (isSideFree(side1, side1Head)) {
            bot._moveTo({ x: pos.x + perpX * 2, y: pos.y, z: pos.z + perpZ * 2 });
            return;
        }
        if (isSideFree(side2, side2Head)) {
            bot._moveTo({ x: pos.x - perpX * 2, y: pos.y, z: pos.z - perpZ * 2 });
            return;
        }

        const above1 = bot._getBlock({ x: bx, y: by + 1, z: bz });
        const above2 = bot._getBlock({ x: bx, y: by + 2, z: bz });
        if ((!above1 || isAirLike(above1)) && (!above2 || isAirLike(above2))) {
            bot._moveTo({ x: target.x, y: pos.y + 1, z: target.z });
            return;
        }

        if (stoneLike) {
            bot._moveTo(target);
            return;
        }

        // stoneLike değilse ve başka bir engelse, kır
        bot._breakBlock(feetBlock);
        return;
    }

    if (headBlock && !isAirLike(headBlock) && (headBlock.typeId.includes("vine") || headBlock.typeId.includes("moss"))) {
        bot._breakBlock(headBlock);
        return;
    }

    bot._moveTo(target);
}
