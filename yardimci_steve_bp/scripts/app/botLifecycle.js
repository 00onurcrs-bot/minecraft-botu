import { world, system } from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";
import { BotFSM } from "../FSM.js";
import { bots } from "./botRuntime.js";
import { STEVE_ID, NAME } from "./config.js";

export function getFSM(player) {
    const fsm = bots.get(player.id);
    if (!fsm?.entity?.isValid()) {
        bots.delete(player.id);
        player.sendMessage("§cÖnce Steve'i çağır! Çubuk + Sağ Tık");
        return null;
    }
    return fsm;
}

export function setFSM(player, state) {
    const fsm = getFSM(player);
    if (fsm) fsm.setState(state, true);
}

export function spawnSteve(player) {
    const existing = bots.get(player.id);
    if (existing?.entity?.isValid()) {
        player.sendMessage("§cZaten bir Steve'in var!");
        return;
    }
    bots.delete(player.id);
    try {
        const loc = player.location;
        const rot = player.getRotation();
        const yaw = (rot.y * Math.PI) / 180;
        const entity = player.dimension.spawnEntity(STEVE_ID, {
            x: loc.x - Math.sin(yaw) * 2,
            y: loc.y,
            z: loc.z + Math.cos(yaw) * 2
        });
        entity.nameTag = NAME;
        bots.set(player.id, new BotFSM(entity, player));
        player.sendMessage("§a✔ Yardımcı Steve çağrıldı!\n§7Çubuğa tekrar sağ tıkla → komut ver");
    } catch (error) {
        player.sendMessage(`§cHata: ${error.message ?? error}`);
    }
}

export function removeSteve(player) {
    const fsm = bots.get(player.id);
    if (!fsm?.entity?.isValid()) {
        bots.delete(player.id);
        player.sendMessage("§cSteve yok.");
        return;
    }
    new MessageFormData()
        .title("§l§4⚠ Kaldır")
        .body("§cSteve ve envanteri silinecek. Emin misin?")
        .button1("§4Evet")
        .button2("§aHayır")
        .show(player)
        .then((result) => {
            if (result.canceled || result.selection === 1) {
                player.sendMessage("§7İptal.");
                return;
            }
            try {
                fsm.entity.triggerEvent("proje:despawn_event");
            } catch {
                try {
                    fsm.entity.kill();
                } catch { }
            }
            bots.delete(player.id);
            player.sendMessage("§c✖ Steve kaldırıldı.");
        })
        .catch(() => { });
}

export function registerBotLifecycleEvents() {
    system.runInterval(() => {
        for (const [id, fsm] of bots) {
            if (!fsm.entity?.isValid()) {
                bots.delete(id);
                continue;
            }
            if (!fsm.owner?.isValid()) {
                fsm.state = "IDLE";
                continue;
            }
            fsm.update();
        }
    }, 1);

    world.afterEvents.playerLeave.subscribe((event) => {
        const fsm = bots.get(event.playerId);
        if (fsm?.entity?.isValid()) fsm.state = "IDLE";
    });

    world.afterEvents.playerSpawn.subscribe((event) => {
        const player = event.player;
        if (!player) return;

        const fsm = bots.get(player.id);
        if (fsm?.entity?.isValid()) {
            fsm.owner = player;
            player.sendMessage("§aSteve seni bekliyor! Çubuk + Sağ Tık");
            return;
        }
        if (fsm) bots.delete(player.id);

        system.runTimeout(() => {
            try {
                const steves = player.dimension.getEntities({
                    type: STEVE_ID,
                    location: player.location,
                    maxDistance: 64
                });
                if (steves.length > 0 && !bots.has(player.id)) {
                    bots.set(player.id, new BotFSM(steves[0], player));
                    player.sendMessage("§aSteve yeniden bağlandı!");
                }
            } catch { }
        }, 40);
    });

    try {
        world.afterEvents.worldLoad.subscribe(() => {
            world.sendMessage("§b§l[Yardimci Steve]§r §fCubuga sag tikla ve Steve'i cagir!");
        });
    } catch {
        // worldLoad eski API'da yok - sorun degil
    }
}
