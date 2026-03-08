/**
 * constants.js — Tüm sabitler ve tanımlamalar
 */

export const FOLLOW_DIST = 2, TP_DIST = 50, SCAN_R = 8;
export const GUARD_RANGE = 12, GUARD_ATK = 2.5, GUARD_DMG = 6;

export const LOG_IDS = [
    "minecraft:oak_log", "minecraft:spruce_log", "minecraft:birch_log",
    "minecraft:jungle_log", "minecraft:acacia_log", "minecraft:dark_oak_log",
    "minecraft:mangrove_log", "minecraft:cherry_log", "minecraft:crimson_stem",
    "minecraft:warped_stem", "minecraft:pale_oak_log"
];

export const LEAF_IDS = [
    "minecraft:oak_leaves", "minecraft:spruce_leaves", "minecraft:birch_leaves",
    "minecraft:jungle_leaves", "minecraft:acacia_leaves", "minecraft:dark_oak_leaves",
    "minecraft:mangrove_leaves", "minecraft:cherry_leaves", "minecraft:azalea_leaves",
    "minecraft:azalea_leaves_flowered", "minecraft:pale_oak_leaves"
];

export const HAND_BLOCKS = [
    "minecraft:dirt", "minecraft:grass_block", "minecraft:sand",
    "minecraft:gravel", "minecraft:clay", "minecraft:short_grass",
    "minecraft:tall_grass", "minecraft:fern", "minecraft:large_fern",
    ...LOG_IDS
];

export const WOOD_PICK_BLOCKS = [
    "minecraft:stone", "minecraft:cobblestone", "minecraft:deepslate",
    "minecraft:cobbled_deepslate", "minecraft:blackstone", "minecraft:gilded_blackstone",
    "minecraft:coal_ore", "minecraft:deepslate_coal_ore",
    "minecraft:granite", "minecraft:diorite", "minecraft:andesite", "minecraft:tuff",
    "minecraft:basalt", "minecraft:smooth_basalt", "minecraft:netherrack"
];

export const STONE_PICK_BLOCKS = [
    "minecraft:iron_ore", "minecraft:deepslate_iron_ore",
    "minecraft:copper_ore", "minecraft:deepslate_copper_ore",
    "minecraft:lapis_ore", "minecraft:deepslate_lapis_ore",
    "minecraft:nether_quartz_ore",
    "minecraft:lit_redstone_ore", "minecraft:lit_deepslate_redstone_ore"
];

export const IRON_PICK_BLOCKS = [
    "minecraft:gold_ore", "minecraft:deepslate_gold_ore",
    "minecraft:diamond_ore", "minecraft:deepslate_diamond_ore",
    "minecraft:redstone_ore", "minecraft:deepslate_redstone_ore",
    "minecraft:lit_redstone_ore", "minecraft:lit_deepslate_redstone_ore",
    "minecraft:emerald_ore", "minecraft:deepslate_emerald_ore",
    "minecraft:nether_gold_ore", "minecraft:ancient_debris"
];

export const BLOCK_DROPS = {
    // Log blokları - kendileri olarak düşer
    "minecraft:oak_log": "minecraft:oak_log",
    "minecraft:spruce_log": "minecraft:spruce_log",
    "minecraft:birch_log": "minecraft:birch_log",
    "minecraft:jungle_log": "minecraft:jungle_log",
    "minecraft:acacia_log": "minecraft:acacia_log",
    "minecraft:dark_oak_log": "minecraft:dark_oak_log",
    "minecraft:mangrove_log": "minecraft:mangrove_log",
    "minecraft:cherry_log": "minecraft:cherry_log",
    "minecraft:crimson_stem": "minecraft:crimson_stem",
    "minecraft:warped_stem": "minecraft:warped_stem",
    "minecraft:pale_oak_log": "minecraft:pale_oak_log",
    // Doğal bloklar
    "minecraft:grass_block": "minecraft:dirt",
    "minecraft:stone": "minecraft:cobblestone",
    "minecraft:deepslate": "minecraft:cobbled_deepslate",
    "minecraft:cobblestone": "minecraft:cobblestone",
    "minecraft:cobbled_deepslate": "minecraft:cobbled_deepslate",
    "minecraft:granite": "minecraft:granite",
    "minecraft:diorite": "minecraft:diorite",
    "minecraft:andesite": "minecraft:andesite",
    "minecraft:tuff": "minecraft:tuff",
    "minecraft:calcite": "minecraft:calcite",
    "minecraft:sandstone": "minecraft:sandstone",
    "minecraft:netherrack": "minecraft:netherrack",
    "minecraft:coal_ore": "minecraft:coal", "minecraft:deepslate_coal_ore": "minecraft:coal",
    "minecraft:iron_ore": "minecraft:raw_iron", "minecraft:deepslate_iron_ore": "minecraft:raw_iron",
    "minecraft:gold_ore": "minecraft:raw_gold", "minecraft:deepslate_gold_ore": "minecraft:raw_gold",
    "minecraft:diamond_ore": "minecraft:diamond", "minecraft:deepslate_diamond_ore": "minecraft:diamond",
    "minecraft:copper_ore": "minecraft:raw_copper", "minecraft:deepslate_copper_ore": "minecraft:raw_copper",
    "minecraft:lapis_ore": "minecraft:lapis_lazuli", "minecraft:deepslate_lapis_ore": "minecraft:lapis_lazuli",
    "minecraft:redstone_ore": "minecraft:redstone", "minecraft:deepslate_redstone_ore": "minecraft:redstone",
    "minecraft:lit_redstone_ore": "minecraft:redstone", "minecraft:lit_deepslate_redstone_ore": "minecraft:redstone",
    "minecraft:emerald_ore": "minecraft:emerald", "minecraft:deepslate_emerald_ore": "minecraft:emerald",
    "minecraft:nether_quartz_ore": "minecraft:quartz",
    "minecraft:nether_gold_ore": "minecraft:gold_nugget",
    "minecraft:gravel": "minecraft:gravel",
    "minecraft:dirt": "minecraft:dirt",
    "minecraft:sand": "minecraft:sand",
    "minecraft:clay": "minecraft:clay_ball",
    "minecraft:short_grass": null, "minecraft:tall_grass": null,
    "minecraft:fern": null, "minecraft:large_fern": null
};

export const HOSTILES = [
    "minecraft:zombie", "minecraft:skeleton", "minecraft:creeper", "minecraft:spider",
    "minecraft:cave_spider", "minecraft:witch", "minecraft:drowned", "minecraft:husk",
    "minecraft:stray", "minecraft:phantom", "minecraft:slime", "minecraft:pillager", "minecraft:vindicator"
];

export const PICKAXE_TIERS = {
    "minecraft:wooden_pickaxe": 1, "minecraft:stone_pickaxe": 2,
    "minecraft:iron_pickaxe": 3, "minecraft:golden_pickaxe": 3, "minecraft:diamond_pickaxe": 4
};
export const AXE_TIERS = {
    "minecraft:wooden_axe": 1, "minecraft:stone_axe": 2,
    "minecraft:iron_axe": 3, "minecraft:golden_axe": 3, "minecraft:diamond_axe": 4
};

export const TOOL_MAX_USES = {
    "minecraft:wooden_pickaxe": 60, "minecraft:wooden_axe": 60,
    "minecraft:stone_pickaxe": 132, "minecraft:stone_axe": 132,
    "minecraft:iron_pickaxe": 251, "minecraft:iron_axe": 251,
    "minecraft:golden_pickaxe": 33, "minecraft:golden_axe": 33,
    "minecraft:diamond_pickaxe": 1562, "minecraft:diamond_axe": 1562
};

export const ORE_IDS = [
    "minecraft:diamond_ore", "minecraft:deepslate_diamond_ore",
    "minecraft:emerald_ore", "minecraft:deepslate_emerald_ore",
    "minecraft:gold_ore", "minecraft:deepslate_gold_ore",
    "minecraft:iron_ore", "minecraft:deepslate_iron_ore",
    "minecraft:coal_ore", "minecraft:deepslate_coal_ore",
    "minecraft:lapis_ore", "minecraft:deepslate_lapis_ore",
    "minecraft:redstone_ore", "minecraft:deepslate_redstone_ore",
    "minecraft:lit_redstone_ore", "minecraft:lit_deepslate_redstone_ore",
    "minecraft:copper_ore", "minecraft:deepslate_copper_ore",
    "minecraft:nether_gold_ore", "minecraft:nether_quartz_ore",
    "minecraft:ancient_debris"
];

export const TR = {
    "minecraft:oak_log": "Meşe Odunu", "minecraft:spruce_log": "Ladin Odunu",
    "minecraft:birch_log": "Huş Odunu", "minecraft:cobblestone": "Kaldırım Taşı",
    "minecraft:coal": "Kömür", "minecraft:raw_iron": "Ham Demir",
    "minecraft:diamond": "Elmas", "minecraft:raw_gold": "Ham Altın",
    "minecraft:emerald": "Zümrüt", "minecraft:raw_copper": "Ham Bakır",
    "minecraft:lapis_lazuli": "Lapis", "minecraft:redstone": "Kızıltaş",
    "minecraft:dirt": "Toprak", "minecraft:sand": "Kum", "minecraft:gravel": "Çakıl",
    "minecraft:oak_planks": "Meşe Tahtası", "minecraft:stick": "Çubuk",
    "minecraft:wooden_pickaxe": "Tahta Kazma", "minecraft:stone_pickaxe": "Taş Kazma",
    "minecraft:iron_pickaxe": "Demir Kazma", "minecraft:golden_pickaxe": "Altın Kazma",
    "minecraft:diamond_pickaxe": "Elmas Kazma",
    "minecraft:wooden_axe": "Tahta Balta", "minecraft:stone_axe": "Taş Balta",
    "minecraft:iron_axe": "Demir Balta", "minecraft:golden_axe": "Altın Balta",
    "minecraft:diamond_axe": "Elmas Balta",
    "minecraft:crafting_table": "Çalışma Masası", "minecraft:furnace": "Ocak",
    "minecraft:iron_ingot": "Demir Külçesi", "minecraft:iron_nugget": "Demir Parçası"
};

export const MOB_TR = {
    "minecraft:zombie": "Zombi", "minecraft:skeleton": "İskelet",
    "minecraft:creeper": "Creeper", "minecraft:spider": "Örümcek",
    "minecraft:drowned": "Boğulmuş", "minecraft:phantom": "Fantom"
};
