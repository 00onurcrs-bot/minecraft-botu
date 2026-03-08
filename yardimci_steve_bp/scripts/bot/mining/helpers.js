import {
    HAND_BLOCKS,
    PICKAXE_TIERS,
    BLOCK_DROPS,
    ORE_IDS,
    TR
} from "../constants.js";

const EXPOSED_BLOCK_IDS = [
    "minecraft:air",
    "minecraft:cave_air",
    "minecraft:void_air"
];

const ADJACENT_FACES = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 }
];

function isPassableForMovement(block) {
    if (!block) return true;

    const typeId = block.typeId;
    if (EXPOSED_BLOCK_IDS.includes(typeId)) return true;
    if (typeId.includes("grass")) return true;
    if (typeId.includes("fern")) return true;
    if (typeId.includes("flower")) return true;
    if (typeId.includes("sapling")) return true;
    if (typeId.includes("vine")) return true;
    if (typeId === "minecraft:snow_layer") return true;
    if (typeId === "minecraft:dead_bush") return true;

    return false;
}

function getClosestFaceToBot(bot, block) {
    const pos = bot.entity.location;
    const center = {
        x: block.location.x + 0.5,
        y: block.location.y + 0.5,
        z: block.location.z + 0.5
    };
    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    const dz = pos.z - center.z;

    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const az = Math.abs(dz);

    if (ax >= ay && ax >= az) return { x: dx >= 0 ? 1 : -1, y: 0, z: 0 };
    if (az >= ax && az >= ay) return { x: 0, y: 0, z: dz >= 0 ? 1 : -1 };
    return { x: 0, y: dy >= 0 ? 1 : -1, z: 0 };
}

function rememberOreFaces(bot, block) {
    const blockedFace = getClosestFaceToBot(bot, block);
    const loc = block.location;
    const targets = ADJACENT_FACES
        .filter((face) => face.x !== blockedFace.x || face.y !== blockedFace.y || face.z !== blockedFace.z)
        .map((face) => ({
            x: loc.x + face.x,
            y: loc.y + face.y,
            z: loc.z + face.z
        }));
    const existing = bot._oreChainTargets ?? [];
    bot._oreChainTargets = [...targets, ...existing];
}

function getQueuedOreCandidate(bot, pickTier) {
    const queued = bot._oreChainTargets ?? [];
    while (queued.length > 0) {
        const nextPos = queued.shift();
        const block = bot._getBlock(nextPos);
        if (!block) continue;
        if (!ORE_IDS.includes(block.typeId)) continue;
        if (!bot._canBreakWithTier(block.typeId, pickTier)) continue;
        if (!isExposedOre(bot, block)) continue;
        if (!canApproachOre(bot, block) && bot._distToBlock(block) > 2.25) continue;
        return block;
    }
    return null;
}

function rememberOreAnchor(bot) {
    if (bot._oreAnchorPos) return;
    bot._oreAnchorPos = {
        x: bot.entity.location.x,
        y: bot.entity.location.y,
        z: bot.entity.location.z
    };
}

function queueOreReturn(bot) {
    if (!bot._oreAnchorPos) return false;
    bot._resumeMinePos = { ...bot._oreAnchorPos };
    bot._oreAnchorPos = null;
    bot._oreChainTargets = [];
    bot._msg("§7[MINE] Damar bitti, ilk kazma noktasina donuluyor.");
    bot._cd = 1;
    return true;
}

function getMineCooldown(typeId, pickTier) {
    // Kırma süresi artık breakBlock progress sistemi tarafından yönetiliyor.
    // Bu cooldown sadece bloklar arası kısa mola (hareket, item toplama vs.)
    if (HAND_BLOCKS.includes(typeId)) return 2;
    if (typeId === "minecraft:obsidian") return 5;
    return 3;
}

function prepareHeldTool(bot, typeId) {
    if (HAND_BLOCKS.includes(typeId)) {
        bot._clearHeldTool();
        return false;
    }

    bot._syncHeldTool(PICKAXE_TIERS);
    return true;
}

export function breakAndCount(bot, block, pickTier) {
    const typeId = block.typeId;
    const loc = block.location;
    const needsPickaxe = prepareHeldTool(bot, typeId);

    if (!bot._breakBlock(block)) {
        // breakBlock false = kırma devam ediyor (progress-based)
        bot._cd = 1;
        return;
    }

    const drop = BLOCK_DROPS[typeId];
    bot._stats.blocksMined++;
    if (ORE_IDS.includes(typeId)) {
        rememberOreAnchor(bot);
        rememberOreFaces(bot, block);
    }

    const sound = HAND_BLOCKS.includes(typeId) ? "dig.grass" : "dig.stone";
    bot._sfx(loc, sound);

    if (needsPickaxe) {
        const toolResult = bot._damageTool(PICKAXE_TIERS);
        if (toolResult.broken) {
            bot._msg("§c[PICKAXE] Kazma kirildi! Yenisini yapiyorum...");
            bot._minePhase = "PREP";
            bot._cd = 20;
            return;
        }
    }

    if (bot._stats.blocksMined % 5 === 0) {
        const name = TR[drop ?? typeId] ?? (drop ?? typeId);
        bot._msg(`§b[MINE] ${name} kazildi §7(Toplam: ${bot._stats.blocksMined})`);
    }

    bot._stuckCount = 0;
    bot._cd = getMineCooldown(typeId, pickTier);
}

function isExposedOre(bot, block) {
    const origin = block.location;

    for (const face of ADJACENT_FACES) {
        const adjacent = bot._getBlock({
            x: origin.x + face.x,
            y: origin.y + face.y,
            z: origin.z + face.z
        });

        if (!adjacent || EXPOSED_BLOCK_IDS.includes(adjacent.typeId)) {
            return true;
        }
    }

    return false;
}

function isDirectlyReachable(bot, block) {
    const pos = bot.entity.location;
    const dx = block.location.x + 0.5 - pos.x;
    const dy = block.location.y - Math.floor(pos.y);
    const dz = block.location.z + 0.5 - pos.z;
    const horizontal = Math.sqrt(dx * dx + dz * dz);
    return horizontal <= 2.3 && Math.abs(dy) <= 2;
}

function canApproachOre(bot, block) {
    if (isDirectlyReachable(bot, block)) return true;

    const start = bot.entity.location;
    const target = {
        x: block.location.x + 0.5,
        y: block.location.y,
        z: block.location.z + 0.5
    };

    const dy = Math.abs(Math.floor(start.y) - block.location.y);
    if (dy > 2) return false;

    const dx = target.x - start.x;
    const dz = target.z - start.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    if (horizontalDist > 6.5) return false;

    const steps = Math.max(1, Math.ceil(horizontalDist / 0.5));
    const baseY = Math.floor(start.y);

    for (let step = 1; step < steps; step++) {
        const t = step / steps;
        const sampleX = Math.floor(start.x + dx * t);
        const sampleZ = Math.floor(start.z + dz * t);

        const feetBlock = bot._getBlock({ x: sampleX, y: baseY, z: sampleZ });
        const headBlock = bot._getBlock({ x: sampleX, y: baseY + 1, z: sampleZ });
        const floorBlock = bot._getBlock({ x: sampleX, y: baseY - 1, z: sampleZ });

        if (!isPassableForMovement(feetBlock) || !isPassableForMovement(headBlock)) {
            return false;
        }

        if (!floorBlock || EXPOSED_BLOCK_IDS.includes(floorBlock.typeId)) {
            return false;
        }
    }

    return true;
}

export function checkOrePriority(bot, pickTier) {
    try {
        const pos = bot.entity.location;
        const dim = bot.entity.dimension;
        let nearestOre = getQueuedOreCandidate(bot, pickTier);
        let nearestDist = nearestOre ? 0 : Infinity;

        if (!nearestOre) {
            for (let dx = -8; dx <= 8; dx++) {
                for (let dy = -4; dy <= 4; dy++) {
                    for (let dz = -8; dz <= 8; dz++) {
                        const bp = { x: Math.floor(pos.x) + dx, y: Math.floor(pos.y) + dy, z: Math.floor(pos.z) + dz };
                        try {
                            const block = dim.getBlock(bp);
                            if (
                                block &&
                                ORE_IDS.includes(block.typeId) &&
                                bot._canBreakWithTier(block.typeId, pickTier) &&
                                isExposedOre(bot, block) &&
                                canApproachOre(bot, block)
                            ) {
                                const distance = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
                                if (distance < nearestDist) {
                                    nearestDist = distance;
                                    nearestOre = block;
                                }
                            }
                        } catch { }
                    }
                }
            }
        }

        if (!nearestOre) return queueOreReturn(bot);

        rememberOreAnchor(bot);

        const dist = bot._distToBlock(nearestOre);
        if (dist > 1.8) {
            bot._moveTo(bot._blockCenter(nearestOre));
            bot._cd = 3;
            return true;
        }

        const typeId = nearestOre.typeId;
        const loc = nearestOre.location;
        prepareHeldTool(bot, typeId);
        if (!bot._breakBlock(nearestOre)) {
            // breakBlock false = kırma devam ediyor (progress-based)
            bot._cd = 1;
            return true;
        }

        const drop = BLOCK_DROPS[typeId];
        bot._stats.blocksMined++;
        rememberOreFaces(bot, nearestOre);

        const toolResult = bot._damageTool(PICKAXE_TIERS);
        if (toolResult.broken) {
            bot._msg("§c[PICKAXE] Kazma kirildi!");
            bot._minePhase = "PREP";
            bot._cd = 20;
            return true;
        }

        const name = TR[drop ?? typeId] ?? (drop ?? typeId);
        bot._msg(`§e[ORE] ${name} kazildi!`);
        bot._sfx(loc, "dig.stone");
        bot._cd = getMineCooldown(typeId, pickTier);
        return true;
    } catch { }

    return false;
}
