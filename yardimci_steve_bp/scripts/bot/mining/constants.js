import {
    WOOD_PICK_BLOCKS,
    STONE_PICK_BLOCKS,
    IRON_PICK_BLOCKS,
    ORE_IDS
} from "../constants.js";

export const STONE_BLOCKS = [
    "minecraft:stone", "minecraft:cobblestone", "minecraft:deepslate",
    "minecraft:cobbled_deepslate", "minecraft:granite", "minecraft:diorite",
    "minecraft:andesite", "minecraft:tuff", "minecraft:calcite",
    ...WOOD_PICK_BLOCKS, ...STONE_PICK_BLOCKS, ...IRON_PICK_BLOCKS
];

export const STRIP_MINE_Y = -53;

export function isStoneBlock(typeId) {
    return STONE_BLOCKS.includes(typeId) || ORE_IDS.includes(typeId);
}
