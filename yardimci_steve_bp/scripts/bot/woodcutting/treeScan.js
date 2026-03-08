import { LOG_IDS, SCAN_R } from "../constants.js";

export const MAX_TREE_CHOP_HEIGHT = 16;

function getKey(pos) {
    return `${pos.x},${pos.y},${pos.z}`;
}

export function getTreeKey(pos) {
    return getKey(pos);
}

function parseKey(key) {
    const [x, y, z] = key.split(",").map(Number);
    return { x, y, z };
}

export function findTreeBase(bot, radius) {
    const c = bot.entity.location;
    const dim = bot.entity.dimension;
    let best = null;
    let bestD = Infinity;

    for (let x = -radius; x <= radius; x++) {
        for (let y = -4; y <= Math.max(14, radius > 8 ? 16 : SCAN_R); y++) {
            for (let z = -radius; z <= radius; z++) {
                try {
                    const bp = { x: Math.floor(c.x) + x, y: Math.floor(c.y) + y, z: Math.floor(c.z) + z };
                    const b = dim.getBlock(bp);
                    if (!b || !LOG_IDS.includes(b.typeId)) continue;

                    let base = b;
                    for (let dy2 = 1; dy2 <= 12; dy2++) {
                        try {
                            const below = dim.getBlock({ x: b.location.x, y: b.location.y - dy2, z: b.location.z });
                            if (below && LOG_IDS.includes(below.typeId)) base = below;
                            else break;
                        } catch { break; }
                    }

                    const rootDx = base.location.x - Math.floor(c.x);
                    const rootDy = Math.abs(base.location.y - Math.floor(c.y));
                    const rootDz = base.location.z - Math.floor(c.z);
                    const d = Math.abs(rootDx) + Math.abs(rootDz) + rootDy * 2;
                    const baseKey = getKey(base.location);
                    if (bot._ignoredTreeKeys?.has(baseKey)) continue;
                    if (d < bestD) {
                        bestD = d;
                        best = base;
                    }
                } catch { }
            }
        }
    }

    return best;
}

export function scanTreeTrunk(bot, baseBlock) {
    const dim = bot.entity.dimension;
    const root = { x: baseBlock.location.x, y: baseBlock.location.y, z: baseBlock.location.z };
    const visited = new Set([getKey(root)]);
    const frontier = [root];
    const found = [];
    let tooTall = false;
    let maxY = root.y;

    while (frontier.length > 0) {
        const current = frontier.shift();
        const block = bot._getBlock(current);
        if (!block || !LOG_IDS.includes(block.typeId)) continue;

        found.push(current);
        if (current.y > maxY) maxY = current.y;

        if (current.y - root.y >= MAX_TREE_CHOP_HEIGHT) {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    try {
                        const above = dim.getBlock({ x: current.x + dx, y: current.y + 1, z: current.z + dz });
                        if (above && LOG_IDS.includes(above.typeId)) tooTall = true;
                    } catch { }
                }
            }
            continue;
        }

        for (let dy = 0; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;

                    const next = { x: current.x + dx, y: current.y + dy, z: current.z + dz };
                    if (next.y < root.y || next.y > root.y + MAX_TREE_CHOP_HEIGHT) continue;

                    const key = getKey(next);
                    if (visited.has(key)) continue;
                    visited.add(key);

                    try {
                        const nextBlock = dim.getBlock(next);
                        if (nextBlock && LOG_IDS.includes(nextBlock.typeId)) {
                            frontier.push(next);
                        }
                    } catch { }
                }
            }
        }
    }

    found.sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        const aDist = Math.abs(a.x - root.x) + Math.abs(a.z - root.z);
        const bDist = Math.abs(b.x - root.x) + Math.abs(b.z - root.z);
        return aDist - bDist;
    });

    return {
        queue: found,
        tooTall,
        maxY,
        keys: new Set(found.map(getKey))
    };
}

export function getLockedTreeRemainingLogs(bot) {
    const keys = bot._treeLockKeys;
    if (!keys || keys.size === 0) return [];

    const remaining = [];
    for (const key of keys) {
        const pos = parseKey(key);
        const block = bot._getBlock(pos);
        if (block && LOG_IDS.includes(block.typeId)) remaining.push(block);
    }

    remaining.sort((a, b) => {
        if (a.location.y !== b.location.y) return a.location.y - b.location.y;
        const dxA = Math.abs(a.location.x - (bot._treeBasePos?.x ?? a.location.x));
        const dzA = Math.abs(a.location.z - (bot._treeBasePos?.z ?? a.location.z));
        const dxB = Math.abs(b.location.x - (bot._treeBasePos?.x ?? b.location.x));
        const dzB = Math.abs(b.location.z - (bot._treeBasePos?.z ?? b.location.z));
        return dxA + dzA - (dxB + dzB);
    });

    return remaining;
}
