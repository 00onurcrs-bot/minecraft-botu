import { ItemStack, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { TR } from "./config.js";

function addStackToPlayer(player, stack) {
    try {
        const inv = player.getComponent("minecraft:inventory")?.container;
        if (!inv) return 0;

        const typeId = stack.typeId;
        const totalAmount = stack.amount;
        let left = totalAmount;

        // Önce mevcut stack'lere ekle
        for (let i = 0; i < inv.size && left > 0; i++) {
            const slot = inv.getItem(i);
            if (slot && slot.typeId === typeId && slot.amount < 64) {
                const canAdd = Math.min(left, 64 - slot.amount);
                try {
                    inv.setItem(i, new ItemStack(typeId, slot.amount + canAdd));
                    left -= canAdd;
                } catch { }
            }
        }

        // Sonra boş slotlara koy
        while (left > 0) {
            let placed = false;
            for (let i = 0; i < inv.size; i++) {
                if (!inv.getItem(i)) {
                    const amount = Math.min(left, 64);
                    try {
                        inv.setItem(i, new ItemStack(typeId, amount));
                        left -= amount;
                        placed = true;
                    } catch { }
                    break;
                }
            }
            if (!placed) break;
        }

        // Direkt envanter manipülasyonu başarısız olduysa, give komutu kullan
        if (left > 0 && left < totalAmount) {
            // Kısmen eklendi, sorun yok
        } else if (left === totalAmount) {
            // Hiç eklenemedi — give komutu ile dene
            try {
                const cleanId = typeId.replace("minecraft:", "");
                player.runCommand(`give @s ${cleanId} ${totalAmount}`);
                left = 0;
            } catch { }
        }

        return totalAmount - left;
    } catch {
        return 0;
    }
}

export function giveToSteve(player, heldItem, getFSM) {
    const fsm = getFSM(player);
    if (!fsm) return;

    try {
        // Event çift tetiklenme koruması: elin gerçekten dolu mu kontrol et
        const inv = player.getComponent("minecraft:inventory")?.container;
        const currentHeld = inv?.getItem(player.selectedSlotIndex);
        if (!currentHeld || currentHeld.typeId !== heldItem.typeId) return;

        // Gerçek miktarı kullan (event anındaki değil, şu anki)
        const actualAmount = currentHeld.amount;

        // Yemekse ve Steve açsa, önce yedir
        if (fsm.isFood(currentHeld.typeId) && fsm.getHunger() < 20) {
            const fed = fsm.feedSteve(player, currentHeld);
            if (fed) return;
        }

        const added = fsm._addItem(currentHeld, actualAmount);
        if (added <= 0) {
            player.sendMessage("§cSteve'in envanteri dolu!");
            return;
        }

        if (added >= actualAmount) {
            inv.setItem(player.selectedSlotIndex, undefined);
        } else {
            const remaining = cloneStack(currentHeld, actualAmount - added);
            inv.setItem(player.selectedSlotIndex, remaining);
        }

        const name = TR[currentHeld.typeId] ?? currentHeld.typeId.replace("minecraft:", "").replace(/_/g, " ");
        player.sendMessage(`§a✓ ${name} x${added} Steve'e verildi!`);
    } catch (error) {
        player.sendMessage(`§cVerilemedi: ${error.message ?? error}`);
    }
}

export function openSteveChestUI(player, getFSM) {
    const fsm = getFSM(player);
    if (!fsm) return;

    const items = fsm.getInventoryContents();
    if (items.length === 0) {
        player.sendMessage("§7Steve'in envanteri bos.");
        return;
    }

    // UI açıkken passivePickup'ı duraklat (slot kayması engellensin)
    fsm._uiOpen = true;

    const form = new ActionFormData()
        .title("§l§6Steve'in Envanteri")
        .body("§8Almak istedigin esyayi sec:");

    for (const item of items) {
        const name = TR[item.typeId] ?? item.typeId.replace("minecraft:", "").replace(/_/g, " ");
        const durabilityLabel = typeof item.damage === "number" ? ` §8[dmg:${item.damage}]` : "";
        form.button(`§f${name} §7x${item.amount}${durabilityLabel}`);
    }
    form.button("§7Kapat");

    form.show(player).then((result) => {
        if (result.canceled || result.selection === undefined || result.selection >= items.length) {
            fsm._uiOpen = false;
            return;
        }

        const selected = items[result.selection];

        system.run(() => {
            try {
                // FSM'i yeniden al - entity hâlâ geçerli mi kontrol et
                const currentFsm = getFSM(player);
                if (!currentFsm) {
                    fsm._uiOpen = false;
                    return;
                }

                const steveInv = currentFsm.entity.getComponent("minecraft:inventory")?.container;
                if (!steveInv) {
                    player.sendMessage("§cSteve'in envanterine erişilemedi.");
                    currentFsm._uiOpen = false;
                    return;
                }

                // Önce beklenen slot'u kontrol et
                let foundSlot = -1;
                let foundStack = null;

                const slotItem = steveInv.getItem(selected.slot);
                if (slotItem && slotItem.typeId === selected.typeId) {
                    // Slot doğru, item hâlâ orada
                    foundSlot = selected.slot;
                    foundStack = slotItem;
                } else {
                    // Slot kaymış olabilir — tüm slotlarda ara
                    for (let i = 0; i < steveInv.size; i++) {
                        const item = steveInv.getItem(i);
                        if (item && item.typeId === selected.typeId) {
                            foundSlot = i;
                            foundStack = item;
                            break;
                        }
                    }
                }

                if (foundSlot < 0 || !foundStack) {
                    player.sendMessage("§cBu eşya artık Steve'in envanterinde yok.");
                    currentFsm._uiOpen = false;
                    return;
                }

                // Oyuncuya ekle
                const added = addStackToPlayer(player, foundStack);
                if (added <= 0) {
                    player.sendMessage("§cEnvanterin dolu, esya alinamadi.");
                    currentFsm._uiOpen = false;
                    return;
                }

                // Steve'den çıkar
                if (added >= foundStack.amount) {
                    steveInv.setItem(foundSlot, undefined);
                } else {
                    const newAmount = foundStack.amount - added;
                    steveInv.setItem(foundSlot, new ItemStack(foundStack.typeId, newAmount));
                }

                const name = TR[selected.typeId] ?? selected.typeId.replace("minecraft:", "").replace(/_/g, " ");
                player.sendMessage(`§e[ITEM] ${name} x${added} alindi!`);

                currentFsm._uiOpen = false;
                // Menüyü tekrar aç
                system.run(() => openSteveChestUI(player, getFSM));
            } catch (error) {
                player.sendMessage(`§cEnvanter hatası: ${error.message ?? error}`);
                fsm._uiOpen = false;
            }
        });
    }).catch(() => {
        fsm._uiOpen = false;
    });
}
