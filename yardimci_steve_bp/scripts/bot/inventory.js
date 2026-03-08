/**
 * inventory.js - Envanter ve ekipman yardimcilari
 */
import { EquipmentSlot, ItemStack } from "@minecraft/server";
import { TR } from "./constants.js";

function getInventoryContainer(bot) {
    return bot.entity.getComponent("minecraft:inventory")?.container;
}

function getEquippable(bot) {
    return bot.entity.getComponent("minecraft:equippable") ?? bot.entity.getComponent("equippable");
}

function getItemDurabilityDamage(item) {
    try {
        const durability = item?.getComponent?.("minecraft:durability");
        return durability?.damage ?? 0;
    } catch {
        return 0;
    }
}

function cloneSingleItem(item) {
    if (!item) return undefined;
    if (typeof item.clone === "function") {
        const clone = item.clone();
        clone.amount = 1;
        return clone;
    }

    return new ItemStack(item.typeId, 1);
}

function findBestToolEntry(bot, tierMap) {
    const inv = getInventoryContainer(bot);
    if (!inv) return null;

    let best = null;
    for (let i = 0; i < inv.size; i++) {
        const item = inv.getItem(i);
        if (!item) continue;

        const tier = tierMap[item.typeId] ?? 0;
        if (tier <= 0) continue;

        if (!best) {
            best = { slot: i, item, tier };
            continue;
        }

        const bestDamage = getItemDurabilityDamage(best.item);
        const itemDamage = getItemDurabilityDamage(item);
        if (tier > best.tier || (tier === best.tier && itemDamage < bestDamage)) {
            best = { slot: i, item, tier };
        }
    }

    return best;
}

function addStackToContainer(container, itemStack) {
    if (!container || !itemStack) return 0;

    let left = itemStack.amount;

    for (let i = 0; i < container.size && left > 0; i++) {
        const slot = container.getItem(i);
        if (slot && slot.typeId === itemStack.typeId && slot.amount < slot.maxAmount) {
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
                const stack = cloneSingleItem(itemStack) ?? new ItemStack(itemStack.typeId, 1);
                stack.amount = Math.min(left, itemStack.maxAmount ?? 64);
                container.setItem(i, stack);
                left -= stack.amount;
                placed = true;
                break;
            }
        }

        if (!placed) break;
    }

    return itemStack.amount - left;
}

/** Envantere esya ekle - basarili eklenen miktar doner */
export function addItem(bot, itemOrId, amount = 1) {
    try {
        const container = getInventoryContainer(bot);
        if (!container) return 0;

        if (typeof itemOrId !== "string") {
            return addStackToContainer(container, itemOrId);
        }

        const stack = new ItemStack(itemOrId, amount);
        return addStackToContainer(container, stack);
    } catch {
        return 0;
    }
}

/** Envanterden esya cikar */
export function removeItem(bot, itemId, amount) {
    try {
        const container = getInventoryContainer(bot);
        if (!container) return;

        let left = amount;
        for (let i = 0; i < container.size && left > 0; i++) {
            const slot = container.getItem(i);
            if (!slot || slot.typeId !== itemId) continue;

            if (slot.amount <= left) {
                container.setItem(i, undefined);
                left -= slot.amount;
            } else {
                slot.amount -= left;
                container.setItem(i, slot);
                left = 0;
            }
        }
    } catch { }
}

/** Esya sayisi */
export function countItem(bot, itemId) {
    let total = 0;
    try {
        const container = getInventoryContainer(bot);
        if (!container) return 0;

        for (let i = 0; i < container.size; i++) {
            const slot = container.getItem(i);
            if (slot && slot.typeId === itemId) total += slot.amount;
        }
    } catch { }

    return total;
}

/** En iyi alet tier seviyesi */
export function getToolTier(bot, tierMap) {
    return findBestToolEntry(bot, tierMap)?.tier ?? 0;
}

/** En iyi aletin ID'si */
export function getToolId(bot, tierMap) {
    return findBestToolEntry(bot, tierMap)?.item?.typeId ?? null;
}

export function getToolEntry(bot, tierMap) {
    return findBestToolEntry(bot, tierMap);
}

/** Envanter icerigi */
export function getInventoryContents(bot) {
    const items = [];
    try {
        const container = getInventoryContainer(bot);
        if (!container) return items;

        for (let i = 0; i < container.size; i++) {
            const slot = container.getItem(i);
            if (!slot) continue;

            let damage = undefined;
            try {
                const durability = slot.getComponent("minecraft:durability");
                if (durability) {
                    damage = durability.damage;
                }
            } catch { }

            items.push({ slot: i, typeId: slot.typeId, amount: slot.amount, damage });
        }
    } catch { }

    return items;
}

export function syncHeldTool(bot, tierMap) {
    try {
        const entry = findBestToolEntry(bot, tierMap);
        const equippable = getEquippable(bot);
        if (!equippable) return false;

        if (!entry) {
            equippable.setEquipment(EquipmentSlot.Mainhand);
            bot._heldToolSlot = null;
            bot._heldToolId = null;
            return false;
        }

        equippable.setEquipment(EquipmentSlot.Mainhand, cloneSingleItem(entry.item));
        bot._heldToolSlot = entry.slot;
        bot._heldToolId = entry.item.typeId;
        return true;
    } catch {
        return false;
    }
}

export function clearHeldTool(bot) {
    try {
        const equippable = getEquippable(bot);
        equippable?.setEquipment(EquipmentSlot.Mainhand);
    } catch { }

    bot._heldToolSlot = null;
    bot._heldToolId = null;
}

export function damageTool(bot, tierMap, amount = 1) {
    const container = getInventoryContainer(bot);
    if (!container) return { broken: false, itemId: null };

    let entry = null;
    if (typeof bot._heldToolSlot === "number") {
        const slotItem = container.getItem(bot._heldToolSlot);
        if (slotItem && (tierMap[slotItem.typeId] ?? 0) > 0) {
            entry = {
                slot: bot._heldToolSlot,
                item: slotItem,
                tier: tierMap[slotItem.typeId]
            };
        }
    }

    if (!entry) entry = findBestToolEntry(bot, tierMap);
    if (!entry) return { broken: false, itemId: null };

    const item = entry.item;
    const itemId = item.typeId;

    try {
        const durability = item.getComponent("minecraft:durability");
        if (durability) {
            durability.damage += amount;
            if (durability.damage >= durability.maxDurability) {
                container.setItem(entry.slot, undefined);
                syncHeldTool(bot, tierMap);
                return { broken: true, itemId };
            }
        }

        container.setItem(entry.slot, item);
    } catch {
        // If durability cannot be updated, keep the current tool rather than deleting it.
    }

    syncHeldTool(bot, tierMap);
    return { broken: false, itemId };
}

/** Pasif esya toplama */
export function passivePickup(bot) {
    // UI açıkken toplama yapma (slot kayması engellensin)
    if (bot._uiOpen) return;

    if (bot._pickupCd > 0) {
        bot._pickupCd--;
        return;
    }

    try {
        const pos = bot.entity.location;
        const dim = bot.entity.dimension;
        const nearby = dim.getEntities({ location: pos, maxDistance: 2.5, type: "minecraft:item" });
        for (const itemEnt of nearby) {
            if (!itemEnt.isValid()) continue;

            const ic = itemEnt.getComponent("minecraft:item");
            if (!ic?.itemStack) continue;

            const stack = ic.itemStack;
            const added = addItem(bot, stack);
            if (added <= 0) continue;

            bot._stats.itemsCollected++;
            const name = TR[stack.typeId] ?? stack.typeId.replace("minecraft:", "").replace(/_/g, " ");
            bot._msg(`§a[ITEM] ${name} §7x${added} §aalindi!`);

            // Her zaman item entity'yi kaldır — kısmi toplama durumunda
            // kalan miktarı yeni entity olarak bırak
            try {
                if (added >= stack.amount) {
                    itemEnt.kill();
                } else {
                    // Kalan miktarı düşür, eski entity'yi kaldır
                    itemEnt.kill();
                    // Kalanı yeni entity olarak spawn et
                    const remaining = stack.amount - added;
                    if (remaining > 0) {
                        dim.spawnItem(
                            new ItemStack(stack.typeId, remaining),
                            itemEnt.location
                        );
                    }
                }
            } catch { }
        }
    } catch { }

    bot._pickupCd = 10;
}
