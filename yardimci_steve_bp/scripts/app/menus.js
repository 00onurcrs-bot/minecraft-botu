import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { system } from "@minecraft/server";
import { bots } from "./botRuntime.js";
import { TR } from "./config.js";
import { setFSM, spawnSteve, removeSteve, getFSM } from "./botLifecycle.js";
import { openSteveChestUI } from "./steveInventory.js";

export function openMainMenu(player) {
    const fsm = bots.get(player.id);
    const hasSteve = fsm?.entity?.isValid();

    const form = new ActionFormData()
        .title("§l§6Yardimci Steve")
        .body(hasSteve
            ? `§aAktif §7- ${fsm.getStateName()}\n${fsm.getHungerInfo()}`
            : "§cSteve yok");

    if (!hasSteve) {
        form.button("Steve'i Cagir", "textures/items/egg");
    } else {
        form.button("Takip Et", "textures/items/compass_item");
        form.button("Odun Kir", "textures/items/iron_axe");
        form.button("Yaprak Kir", "textures/items/shears");
        form.button("Maden Kaz", "textures/items/iron_pickaxe");
        form.button("Koruma Modu", "textures/items/iron_sword");
        form.button("Esya Topla", "textures/items/chest_minecart");
        form.button("Dur / Bekle", "textures/items/barrier");
        form.button("§eEnvanter", "textures/items/chest_minecart");
        form.button("Bilgi Menusu", "textures/items/book_writable");
        form.button("Steve'i Kaldir", "textures/items/bucket_lava");
    }

    form.show(player).then((result) => {
        if (result.canceled || result.selection === undefined) return;

        if (!hasSteve) {
            if (result.selection === 0) spawnSteve(player);
            return;
        }

        switch (result.selection) {
            case 0: setFSM(player, "FOLLOWING"); break;
            case 1: setFSM(player, "CHOPPING_WOOD"); break;
            case 2: setFSM(player, "BREAKING_LEAVES"); break;
            case 3: setFSM(player, "MINING"); break;
            case 4: setFSM(player, "GUARDING"); break;
            case 5: setFSM(player, "COLLECTING"); break;
            case 6: setFSM(player, "IDLE"); break;
            case 7: system.run(() => openSteveChestUI(player, getFSM)); break;
            case 8: openInfoMenu(player); break;
            case 9: removeSteve(player); break;
        }
    }).catch(() => { });
}

export function openInfoMenu(player) {
    system.run(() => {
        new ActionFormData()
            .title("§l§dSteve Bilgi")
            .body("Ne gormek istiyorsun?")
            .button("Envanter Ozet")
            .button("Steve Envanterini Ac")
            .button("Istatistik")
            .button("Ana Menu")
            .show(player)
            .then((result) => {
                if (result.canceled) return;
                switch (result.selection) {
                    case 0: showInventoryInfo(player); break;
                    case 1: system.run(() => openSteveChestUI(player, getFSM)); break;
                    case 2: showStatsInfo(player); break;
                    case 3: system.run(() => openMainMenu(player)); break;
                }
            })
            .catch(() => { });
    });
}

function showInventoryInfo(player) {
    const fsm = getFSM(player);
    if (!fsm) return;

    const items = fsm.getInventoryContents();
    let body;

    if (items.length === 0) {
        body = "Envanter bos.";
    } else {
        body = "Envanter\n------------------\n";
        for (const item of items) {
            const name = TR[item.typeId] ?? item.typeId.replace("minecraft:", "").replace(/_/g, " ");
            body += `${item.slot + 1}. ${name} x${item.amount}\n`;
        }
        body += `------------------\n${items.length} tur esya`;
    }

    new MessageFormData()
        .title("Steve Envanter")
        .body(body)
        .button1("Tamam")
        .button2("Geri")
        .show(player)
        .then((result) => {
            if (result.selection === 1) system.run(() => openInfoMenu(player));
        })
        .catch(() => { });
}

function showStatsInfo(player) {
    const fsm = getFSM(player);
    if (!fsm) return;

    const stats = fsm.getStats();
    let hpText = "?";
    try {
        const hp = fsm.entity.getComponent("minecraft:health");
        if (hp) hpText = `${Math.floor(hp.currentValue)}/${Math.floor(hp.effectiveMax)}`;
    } catch { }
    const body =
        `Istatistikler\n------------------\n` +
        `Can: §c❤ ${hpText}\n` +
        `${fsm.getHungerInfo()}\n` +
        `§f------------------\n` +
        `Odun: ${stats.woodChopped}\n` +
        `Maden: ${stats.blocksMined}\n` +
        `Mob: ${stats.mobsKilled}\n` +
        `Esya: ${stats.itemsCollected}\n` +
        `Craft: ${stats.itemsCrafted}\n` +
        `------------------\nDurum: ${fsm.getStateName()}`;

    new MessageFormData()
        .title("Steve Istatistik")
        .body(body)
        .button1("Tamam")
        .button2("Geri")
        .show(player)
        .then((result) => {
            if (result.selection === 1) system.run(() => openInfoMenu(player));
        })
        .catch(() => { });
}
