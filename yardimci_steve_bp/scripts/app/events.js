import { system, world } from "@minecraft/server";
import { CTRL, STEVE_ID } from "./config.js";
import { openMainMenu } from "./menus.js";
import { giveToSteve } from "./steveInventory.js";
import { getFSM } from "./botLifecycle.js";

export function registerControlEvents() {
    world.afterEvents.itemUse.subscribe((event) => {
        if (event.itemStack?.typeId !== CTRL) return;
        system.run(() => openMainMenu(event.source));
    });

    try {
        world.afterEvents.playerInteractWithEntity.subscribe((event) => {
            const player = event.player;
            const target = event.target;
            if (!target?.isValid() || target.typeId !== STEVE_ID) return;

            try {
                const inv = player.getComponent("minecraft:inventory")?.container;
                const held = inv?.getItem(player.selectedSlotIndex);
                if (held?.typeId === CTRL) return;

                if (held) {
                    // Elinde eşya varsa Steve'e ver
                    system.run(() => {
                        giveToSteve(player, held, getFSM);
                    });
                } else {
                    // Boş el — vanilla container açılıyor
                    // Steve'in tüm envanter işlemlerini duraklat
                    system.run(() => {
                        const fsm = getFSM(player);
                        if (fsm) {
                            fsm._containerOpen = true;
                            fsm._containerPlayer = player;
                        }
                    });
                }
            } catch { }
        });
    } catch { }
}
