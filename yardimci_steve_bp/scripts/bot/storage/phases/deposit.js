import { ItemStack } from "@minecraft/server";
import { LOG_IDS, TR } from "../../constants.js";
import { KEEP_MATERIALS, KEEP_TOOLS, KEEP_CRAFTING } from "./constants.js";

function getChestContainers(bot) {
    const containers = [];
    for (const pos of [bot._chestPos1, bot._chestPos2]) {
        if (!pos) continue;
        const block = bot._getBlock(pos);
        if (!block) continue;

        const inventoryComponent = block.getComponent?.("inventory") ?? block.getComponent?.("minecraft:inventory");
        const container = inventoryComponent?.container;
        if (container) containers.push(container);
    }
    return containers;
}

function addToContainer(container, stack) {
    let left = stack.amount;

    for (let i = 0; i < container.size && left > 0; i++) {
        const slot = container.getItem(i);
        if (slot && slot.typeId === stack.typeId && slot.amount < slot.maxAmount) {
            const canAdd = Math.min(left, slot.maxAmount - slot.amount);
            slot.amount += canAdd;
            container.setItem(i, slot);
            left -= canAdd;
        }
    }

    while (left > 0) {
        let placed = false;
        for (let i = 0; i < container.size; i++) {
            if (!container.getItem(i)) {
                const newStack = new ItemStack(stack.typeId, Math.min(left, stack.maxAmount ?? 64));
                container.setItem(i, newStack);
                left -= newStack.amount;
                placed = true;
                break;
            }
        }
        if (!placed) break;
    }

    return stack.amount - left;
}

function depositIntoChests(chestContainers, stack) {
    let left = stack.amount;

    for (const container of chestContainers) {
        if (left <= 0) break;
        left -= addToContainer(container, new ItemStack(stack.typeId, left));
    }

    return stack.amount - left;
}

export function storePhaseDeposit(bot) {
    try {
        const inv = bot.entity.getComponent("minecraft:inventory")?.container;
        if (!inv) {
            bot._storePhase = "DONE";
            return;
        }

        const chestContainers = getChestContainers(bot);
        if (chestContainers.length === 0) {
            bot._msg("§c[STORE] Sandik bulunamadi!");
            bot._storePhase = "DONE";
            bot._cd = 5;
            return;
        }

        const keepSet = new Set([...KEEP_TOOLS, ...KEEP_CRAFTING]);
        let bestMaterial = null;
        for (const material of KEEP_MATERIALS) {
            if (bot._countItem(material) > 0) {
                bestMaterial = material;
                break;
            }
        }

        const itemsToStore = [];
        const keepAmounts = {};

        for (let i = 0; i < inv.size; i++) {
            const item = inv.getItem(i);
            if (!item) continue;

            const id = item.typeId;
            const amount = item.amount;

            if (keepSet.has(id)) continue;

            if (LOG_IDS.includes(id)) {
                keepAmounts[id] = keepAmounts[id] ?? 0;
                const keptLogs = Object.values(keepAmounts).reduce((sum, value) => sum + value, 0);
                const canKeep = Math.max(0, 64 - keptLogs);
                if (canKeep >= amount) {
                    keepAmounts[id] += amount;
                    continue;
                }

                if (canKeep > 0) keepAmounts[id] += canKeep;
                itemsToStore.push({ slot: i, typeId: id, amount: amount - canKeep });
                continue;
            }

            if (bestMaterial && id === bestMaterial) {
                const kept = keepAmounts[id] ?? 0;
                const canKeep = Math.max(0, 64 - kept);
                if (canKeep >= amount) {
                    keepAmounts[id] = kept + amount;
                    continue;
                }

                if (canKeep > 0) keepAmounts[id] = kept + canKeep;
                itemsToStore.push({ slot: i, typeId: id, amount: amount - canKeep });
                continue;
            }

            itemsToStore.push({ slot: i, typeId: id, amount });
        }

        let deposited = 0;

        for (const item of itemsToStore) {
            if (item.amount <= 0) continue;

            const slot = inv.getItem(item.slot);
            if (!slot) continue;

            const storedAmount = depositIntoChests(chestContainers, new ItemStack(item.typeId, item.amount));
            if (storedAmount <= 0) continue;

            deposited += storedAmount;
            if (storedAmount >= slot.amount) {
                inv.setItem(item.slot, undefined);
            } else {
                slot.amount -= storedAmount;
                inv.setItem(item.slot, slot);
            }
        }

        const matName = bestMaterial ? (TR[bestMaterial] ?? bestMaterial) : "yok";
        bot._msg(`§e[STORE] ${deposited} esya sandiga aktarildi!`);
        bot._msg(`§7Yaninda: Kazma + ${matName} (max 64) + Odun (max 64)`);
        bot._storePhase = "DONE";
        bot._cd = 10;
    } catch {
        bot._storePhase = "DONE";
        bot._cd = 10;
    }
}
