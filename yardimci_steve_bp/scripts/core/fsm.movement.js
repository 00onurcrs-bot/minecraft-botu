import { FOLLOW_DIST, TP_DIST, LEAF_IDS, HAND_BLOCKS } from "../bot/constants.js";

export function doFollow() {
    if (this.entity.dimension.id !== this.owner.dimension.id) {
        this._tpOwner();
        return;
    }
    const d = this._distOwner();
    if (d > TP_DIST) this._tpOwner();
    else if (d > FOLLOW_DIST) {
        const p = this.owner.location;
        const r = this.owner.getRotation();
        const y = (r.y * Math.PI) / 180;
        const behindX = p.x + Math.sin(y) * 2;
        const behindZ = p.z - Math.cos(y) * 2;
        this._moveTo({ x: behindX, y: p.y, z: behindZ });
    } else {
        this._lookAtOwner();
    }
}

export function tpOwner() {
    try {
        const p = this.owner.location;
        const r = this.owner.getRotation();
        const y = (r.y * Math.PI) / 180;
        this.entity.teleport(
            { x: p.x + Math.sin(y) * 2, y: p.y, z: p.z - Math.cos(y) * 2 },
            { dimension: this.owner.dimension }
        );
    } catch { }
}

// Geçilebilir (passable) blok kontrolü
function isPassable(b) {
    if (!b) return true;
    const id = b.typeId;
    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") return true;
    if (id.includes("short_grass") || id.includes("tall_grass")) return true;
    if (id.includes("fern") || id.includes("flower") || id.includes("sapling")) return true;
    if (id === "minecraft:snow_layer" || id === "minecraft:dead_bush") return true;
    if (id.includes("vine") || id.includes("moss_carpet")) return true;
    if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:flowing_water" || id === "minecraft:flowing_lava") return true;
    return false;
}

// Katı zemin bloğu mu? (üstünde durulabilir)
function isSolidGround(b) {
    if (!b) return false;
    return !isPassable(b);
}

export function moveTo(t) {
    try {
        const p = this.entity.location;
        const dim = this.entity.dimension;
        const dx = t.x - p.x;
        const dz = t.z - p.z;
        const m = Math.sqrt(dx * dx + dz * dz);
        if (m < 0.1) return;

        const s = Math.min(0.35, m);
        const nx = p.x + (dx / m) * s;
        const nz = p.z + (dz / m) * s;
        const bx = Math.floor(nx);
        const by = Math.floor(p.y);
        const bz = Math.floor(nz);

        // Entity genişliği için çevredeki blokları da kontrol et (hitbox ~0.6)
        const HALF_WIDTH = 0.3;
        const checkPositions = [
            { x: Math.floor(nx - HALF_WIDTH), z: Math.floor(nz - HALF_WIDTH) },
            { x: Math.floor(nx + HALF_WIDTH), z: Math.floor(nz + HALF_WIDTH) },
            { x: Math.floor(nx - HALF_WIDTH), z: Math.floor(nz + HALF_WIDTH) },
            { x: Math.floor(nx + HALF_WIDTH), z: Math.floor(nz - HALF_WIDTH) }
        ];

        // Hedef pozisyondaki ayak ve baş bloklarını kontrol et
        const feetBlock = this._getBlock({ x: bx, y: by, z: bz });
        const headBlock = this._getBlock({ x: bx, y: by + 1, z: bz });

        // Hitbox genişliği ile çarpışma kontrolü
        for (const cp of checkPositions) {
            const fb = this._getBlock({ x: cp.x, y: by, z: cp.z });
            const hb = this._getBlock({ x: cp.x, y: by + 1, z: cp.z });
            if (!isPassable(fb) || !isPassable(hb)) {
                // Bu yöne gidilemez - katı blok var
                // Yaprak veya kırılabilir bloksa kır
                if (!isPassable(fb)) {
                    if (LEAF_IDS.includes(fb.typeId) || HAND_BLOCKS.includes(fb.typeId)) {
                        this._breakBlock(fb);
                        return;
                    }
                }
                if (!isPassable(hb)) {
                    if (LEAF_IDS.includes(hb.typeId) || HAND_BLOCKS.includes(hb.typeId)) {
                        this._breakBlock(hb);
                        return;
                    }
                }

                // Kırılamıyorsa, 1 blok yukarı atlayabilir miyiz?
                const aboveFeet = this._getBlock({ x: bx, y: by + 1, z: bz });
                const above2 = this._getBlock({ x: bx, y: by + 2, z: bz });
                const landingGround = this._getBlock({ x: bx, y: by, z: bz });
                if (isPassable(aboveFeet) && isPassable(above2) && isSolidGround(landingGround)) {
                    this.entity.teleport({ x: nx, y: p.y + 1, z: nz }, { dimension: dim });
                    this.entity.setRotation({ x: 0, y: (Math.atan2(-dx, dz) * 180) / Math.PI });
                    return;
                }

                // Yana kaçma
                const perpX = -dz / m;
                const perpZ = dx / m;
                const sideOffset = 1.5;
                const stepSize = 0.35;

                const side1Feet = this._getBlock({ x: Math.floor(p.x + perpX * sideOffset), y: by, z: Math.floor(p.z + perpZ * sideOffset) });
                const side1Head = this._getBlock({ x: Math.floor(p.x + perpX * sideOffset), y: by + 1, z: Math.floor(p.z + perpZ * sideOffset) });
                const side2Feet = this._getBlock({ x: Math.floor(p.x - perpX * sideOffset), y: by, z: Math.floor(p.z - perpZ * sideOffset) });
                const side2Head = this._getBlock({ x: Math.floor(p.x - perpX * sideOffset), y: by + 1, z: Math.floor(p.z - perpZ * sideOffset) });

                if (isPassable(side1Feet) && isPassable(side1Head)) {
                    this.entity.teleport({ x: p.x + perpX * stepSize, y: p.y, z: p.z + perpZ * stepSize }, { dimension: dim });
                } else if (isPassable(side2Feet) && isPassable(side2Head)) {
                    this.entity.teleport({ x: p.x - perpX * stepSize, y: p.y, z: p.z - perpZ * stepSize }, { dimension: dim });
                }
                return;
            }
        }

        // Ana yoldaki ayak bloğu katı mı?
        if (!isPassable(feetBlock)) {
            if (LEAF_IDS.includes(feetBlock.typeId)) {
                this._breakBlock(feetBlock);
                return;
            }
            if (HAND_BLOCKS.includes(feetBlock.typeId)) {
                this._breakBlock(feetBlock);
                return;
            }

            // 1 blok üstüne atlama (merdiven adımı)
            const above1 = this._getBlock({ x: bx, y: by + 1, z: bz });
            const above2 = this._getBlock({ x: bx, y: by + 2, z: bz });
            if (isPassable(above1) && isPassable(above2)) {
                this.entity.teleport({ x: nx, y: p.y + 1, z: nz }, { dimension: dim });
                this.entity.setRotation({ x: 0, y: (Math.atan2(-dx, dz) * 180) / Math.PI });
                return;
            }
            return; // Hiçbir şey yapılamaz, dur
        }

        // Baş seviyesinde katı blok var mı?
        if (!isPassable(headBlock)) {
            if (LEAF_IDS.includes(headBlock.typeId) || HAND_BLOCKS.includes(headBlock.typeId)) {
                this._breakBlock(headBlock);
                return;
            }
            return; // Geçilemez
        }


        // Zemin kontrolü - ayağımızın altında katı blok var mı?
        // Boşluğa düşmesini engelle (sadece yatay harekette, y hedefi verilmemişse)
        const groundBlock = this._getBlock({ x: bx, y: by - 1, z: bz });
        const currentGround = this._getBlock({ x: Math.floor(p.x), y: by - 1, z: Math.floor(p.z) });
        if (t.y === undefined || t.y === null) {
            // Eğer hedefte zemin yoksa ama 1 blok aşağıda varsa, aşağı in
            if (!isSolidGround(groundBlock)) {
                const belowGround = this._getBlock({ x: bx, y: by - 2, z: bz });
                if (isSolidGround(belowGround)) {
                    // 1 blok aşağı adım at
                    this.entity.teleport({ x: nx, y: p.y - 1, z: nz }, { dimension: dim });
                    this.entity.setRotation({ x: 0, y: (Math.atan2(-dx, dz) * 180) / Math.PI });
                    return;
                }
                // Daha derinine düşme - hareket etme
                if (isSolidGround(currentGround)) {
                    return;
                }
            }
        }

        // Güvenli hareket
        this.entity.teleport({ x: nx, y: t.y ?? p.y, z: nz }, { dimension: dim });
        this.entity.setRotation({ x: 0, y: (Math.atan2(-dx, dz) * 180) / Math.PI });
    } catch { }
}

export function lookAtOwner() {
    try {
        const s = this.entity.location;
        const o = this.owner.location;
        this.entity.setRotation({ x: 0, y: (Math.atan2(-(o.x - s.x), o.z - s.z) * 180) / Math.PI });
    } catch { }
}

export function distOwner() {
    const s = this.entity.location;
    const o = this.owner.location;
    return Math.sqrt((o.x - s.x) ** 2 + (o.y - s.y) ** 2 + (o.z - s.z) ** 2);
}

export function distTo(t) {
    const s = this.entity.location;
    return Math.sqrt((t.x - s.x) ** 2 + (t.z - s.z) ** 2);
}

export function distToBlock(b) {
    return this._distTo({ x: b.location.x + 0.5, z: b.location.z + 0.5 });
}
