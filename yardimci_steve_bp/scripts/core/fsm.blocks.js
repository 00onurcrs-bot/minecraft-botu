import { BlockPermutation, ItemStack } from "@minecraft/server";
import {
    SCAN_R,
    HAND_BLOCKS,
    WOOD_PICK_BLOCKS,
    STONE_PICK_BLOCKS,
    IRON_PICK_BLOCKS,
    BLOCK_DROPS
} from "../bot/constants.js";

export function setMineDirection() {
    const rotation = this.owner.getRotation();
    const yaw = (rotation.y * Math.PI) / 180;
    const dx = -Math.sin(yaw);
    const dz = Math.cos(yaw);
    this._mineDir = Math.abs(dx) > Math.abs(dz)
        ? { x: Math.sign(dx) | 0 || 1, z: 0 }
        : { x: 0, z: Math.sign(dz) | 0 || 1 };
}

export function findBlock(blockIds) {
    const center = this.entity.location;
    const dim = this.entity.dimension;
    let best = null;
    let bestDistance = Infinity;

    for (let x = -SCAN_R; x <= SCAN_R; x++) {
        for (let y = -4; y <= SCAN_R; y++) {
            for (let z = -SCAN_R; z <= SCAN_R; z++) {
                try {
                    const block = dim.getBlock({
                        x: Math.floor(center.x) + x,
                        y: Math.floor(center.y) + y,
                        z: Math.floor(center.z) + z
                    });
                    if (!block || !blockIds.includes(block.typeId)) continue;

                    const distance = Math.abs(x) + Math.abs(y) + Math.abs(z);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        best = block;
                    }
                } catch { }
            }
        }
    }

    return best;
}

export function findBlockWide(blockIds, radius) {
    const center = this.entity.location;
    const dim = this.entity.dimension;
    let best = null;
    let bestDistance = Infinity;

    for (let x = -radius; x <= radius; x += 2) {
        for (let y = -4; y <= 12; y++) {
            for (let z = -radius; z <= radius; z += 2) {
                try {
                    const block = dim.getBlock({
                        x: Math.floor(center.x) + x,
                        y: Math.floor(center.y) + y,
                        z: Math.floor(center.z) + z
                    });
                    if (!block || !blockIds.includes(block.typeId)) continue;

                    const distance = Math.abs(x) + Math.abs(y) + Math.abs(z);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        best = block;
                    }
                } catch { }
            }
        }
    }

    return best;
}

export function getBlock(pos) {
    try {
        return this.entity.dimension.getBlock(pos);
    } catch {
        return null;
    }
}

/**
 * Blok kırma süresi hesaplayıcı (tick cinsinden)
 * Hayatta kalma modundaki gibi kazma süresi
 * 
 * pickTier: 0 = elle, 1 = tahta, 2 = taş, 3 = demir/altın, 4 = elmas
 * axeTier: balta seviyesi (odun kırmak için)
 */
export function getBreakTime(blockTypeId, toolTier = 0) {
    // Çimen, çiçek gibi anında kırılan bloklar
    const INSTANT_BLOCKS = [
        "minecraft:short_grass", "minecraft:tall_grass",
        "minecraft:fern", "minecraft:large_fern",
        "minecraft:dead_bush", "minecraft:vine",
        "minecraft:snow_layer"
    ];
    if (INSTANT_BLOCKS.includes(blockTypeId)) return 2;

    // Yapraklar
    if (blockTypeId.includes("leaves")) {
        if (toolTier >= 1) return 4;   // Makasla / aletlerle hızlı
        return 10; // Elle yavaş
    }

    // Toprak, kum, çakıl gibi yumuşak bloklar (elle kazılabilir)
    const SOFT_BLOCKS = [
        "minecraft:dirt", "minecraft:grass_block", "minecraft:sand",
        "minecraft:gravel", "minecraft:clay", "minecraft:soul_sand",
        "minecraft:soul_soil", "minecraft:farmland", "minecraft:mycelium",
        "minecraft:podzol", "minecraft:mud", "minecraft:snow"
    ];
    if (SOFT_BLOCKS.includes(blockTypeId)) {
        // Kürekle hızlı, elle normal
        return toolTier >= 1 ? 6 : 15;
    }

    // Odun/kütük blokları
    if (blockTypeId.includes("log") || blockTypeId.includes("stem") ||
        blockTypeId.includes("wood") || blockTypeId.includes("hyphae")) {
        // Balta ile hızlı
        if (toolTier >= 4) return 6;    // Elmas balta
        if (toolTier >= 3) return 8;    // Demir balta
        if (toolTier >= 2) return 10;   // Taş balta
        if (toolTier >= 1) return 14;   // Tahta balta
        return 30;                      // Elle çok yavaş
    }

    // Tahta bloklar (plank, workbench vb.)
    if (blockTypeId.includes("planks") || blockTypeId.includes("crafting_table") ||
        blockTypeId.includes("chest") || blockTypeId.includes("fence")) {
        if (toolTier >= 1) return 6;
        return 15;
    }

    // Taş bloklar
    const STONE_BLOCKS = [
        "minecraft:stone", "minecraft:cobblestone", "minecraft:deepslate",
        "minecraft:cobbled_deepslate", "minecraft:blackstone",
        "minecraft:granite", "minecraft:diorite", "minecraft:andesite",
        "minecraft:tuff", "minecraft:basalt", "minecraft:smooth_basalt",
        "minecraft:netherrack", "minecraft:sandstone", "minecraft:calcite"
    ];
    if (STONE_BLOCKS.includes(blockTypeId)) {
        if (toolTier >= 4) return 8;    // Elmas kazma
        if (toolTier >= 3) return 10;   // Demir kazma
        if (toolTier >= 2) return 14;   // Taş kazma
        if (toolTier >= 1) return 18;   // Tahta kazma
        return 50;                      // Elle çok çok yavaş
    }

    // Cevher blokları
    if (blockTypeId.includes("_ore") || blockTypeId === "minecraft:ancient_debris") {
        if (blockTypeId.includes("deepslate")) {
            // Deepslate cevherleri daha yavaş
            if (toolTier >= 4) return 14;
            if (toolTier >= 3) return 18;
            if (toolTier >= 2) return 24;
            if (toolTier >= 1) return 30;
            return 75;
        }
        if (toolTier >= 4) return 10;
        if (toolTier >= 3) return 14;
        if (toolTier >= 2) return 18;
        if (toolTier >= 1) return 24;
        return 60;
    }

    // Obsidyen
    if (blockTypeId === "minecraft:obsidian") {
        if (toolTier >= 4) return 100;  // Elmas kazma bile yavaş
        return 250;                     // Başka aletlerle çok yavaş
    }

    // Varsayılan: orta zorlukta blok
    if (toolTier >= 3) return 12;
    if (toolTier >= 1) return 20;
    return 40;
}

/**
 * Blok kırma sistemi - Hayatta kalma modundaki gibi bekleme süreli
 * İlk çağrıda kırma başlar, her tick'te ilerleme artar,
 * süre dolduğunda blok kırılır.
 */
export function breakBlock(block) {
    try {
        const loc = block.location;
        const p = this.entity.location;
        const dx = loc.x + 0.5 - p.x;
        const dz = loc.z + 0.5 - p.z;
        this.entity.setRotation({ x: 0, y: (Math.atan2(-dx, dz) * 180) / Math.PI });

        // Kırma progress sistemi
        const blockKey = `${loc.x},${loc.y},${loc.z}`;

        // Yeni blok mu yoksa aynı blok mu kırıyoruz?
        if (this._breakingBlockKey !== blockKey) {
            // Yeni blok - kırma başlat
            this._breakingBlockKey = blockKey;
            this._breakingProgress = 0;

            // Alet seviyesine göre kırma süresini hesapla
            const toolTier = this._currentBreakToolTier ?? 0;
            this._breakingTime = getBreakTime(block.typeId, toolTier);
        }

        // Kırma ilerlemesi
        this._breakingProgress++;

        // Kırma animasyonu
        try {
            this.entity.playAnimation("animation.yardimci_steve.attack");
        } catch { }

        // Kırma efekti (particle) - her birkaç tick'te
        if (this._breakingProgress % 4 === 0) {
            try {
                this.entity.dimension.runCommand(
                    `particle minecraft:breaking_item_terrain ${loc.x + 0.5} ${loc.y + 0.5} ${loc.z + 0.5}`
                );
            } catch { }
        }

        // Kırma sesi - her birkaç tick'te
        if (this._breakingProgress % 6 === 0) {
            const sound = HAND_BLOCKS.includes(block.typeId) ? "dig.grass" : "hit.stone";
            try {
                this.entity.dimension.runCommand(
                    `playsound ${sound} @a ${loc.x + 0.5} ${loc.y + 0.5} ${loc.z + 0.5} 0.3`
                );
            } catch { }
        }

        // Henüz kırılma süresi dolmadı
        if (this._breakingProgress < this._breakingTime) {
            return false; // Henüz kırılmadı, devam et
        }

        // KIRILDI! Blok kırma işlemi
        this._breakingBlockKey = null;
        this._breakingProgress = 0;
        this._breakingTime = 0;

        const hasMappedDrop = Object.prototype.hasOwnProperty.call(BLOCK_DROPS, block.typeId);
        if (hasMappedDrop) {
            const dropId = BLOCK_DROPS[block.typeId];
            if (dropId) {
                try {
                    this.entity.dimension.spawnItem(new ItemStack(dropId, 1), {
                        x: loc.x + 0.5,
                        y: loc.y + 0.5,
                        z: loc.z + 0.5
                    });
                } catch { }
            }

            try {
                this.entity.dimension.runCommand(`particle minecraft:destroy_block_particle ${loc.x} ${loc.y} ${loc.z}`);
            } catch { }

            this.entity.dimension.setBlockPermutation(loc, BlockPermutation.resolve("minecraft:air"));
        } else {
            try {
                this.entity.dimension.runCommand(`setblock ${loc.x} ${loc.y} ${loc.z} air destroy`);
            } catch {
                const dropId = block.typeId;
                if (dropId) {
                    try {
                        this.entity.dimension.spawnItem(new ItemStack(dropId, 1), {
                            x: loc.x + 0.5,
                            y: loc.y + 0.5,
                            z: loc.z + 0.5
                        });
                    } catch { }
                }

                try {
                    this.entity.dimension.runCommand(`particle minecraft:destroy_block_particle ${loc.x} ${loc.y} ${loc.z}`);
                } catch { }

                this.entity.dimension.setBlockPermutation(loc, BlockPermutation.resolve("minecraft:air"));
            }
        }

        return true;
    } catch {
        return false;
    }
}

export function blockCenter(block) {
    return { x: block.location.x + 0.5, y: this.entity.location.y, z: block.location.z + 0.5 };
}

export function sfx(pos, sound) {
    try {
        this.entity.dimension.runCommand(`playsound ${sound} @a ${pos.x} ${pos.y} ${pos.z} 0.5`);
    } catch { }
}

export function canBreakWithTier(blockTypeId, pickTier) {
    if (HAND_BLOCKS.includes(blockTypeId)) return true;
    if (pickTier >= 1 && WOOD_PICK_BLOCKS.includes(blockTypeId)) return true;
    if (pickTier >= 2 && STONE_PICK_BLOCKS.includes(blockTypeId)) return true;
    if (pickTier >= 3 && IRON_PICK_BLOCKS.includes(blockTypeId)) return true;
    return false;
}

export function tickCd() {
    if (this._cd > 0) {
        this._cd--;
        return true;
    }
    return false;
}

export function msg(text) {
    try {
        this.owner.sendMessage(text);
    } catch { }
}

export function dropItem(itemId, amount, pos) {
    try {
        if (!itemId) return;
        const loc = { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 };
        this.entity.dimension.spawnItem(new ItemStack(itemId, amount), loc);
    } catch { }
}
