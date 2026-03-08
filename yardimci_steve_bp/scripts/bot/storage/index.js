import {
    storePhaseGotoOwner,
    storePhasePlaceChest,
    storePhaseDeposit,
    storePhaseDone
} from "./phases.js";

/** Envanter dolu mu kontrol et - bos slot 2'den azsa dolu say */
export function isInventoryFull(bot) {
    try {
        const container = bot.entity.getComponent("minecraft:inventory")?.container;
        if (!container) return false;

        let empty = 0;
        for (let i = 0; i < container.size; i++) {
            if (!container.getItem(i)) empty++;
        }
        return empty <= 2;
    } catch {
        return false;
    }
}

/** Depolama davranisi */
export function doStore(bot) {
    if (bot._tickCd()) return;

    const phase = bot._storePhase ?? "GOTO_OWNER";
    switch (phase) {
        case "GOTO_OWNER": storePhaseGotoOwner(bot); break;
        case "PLACE_CHEST": storePhasePlaceChest(bot); break;
        case "DEPOSIT": storePhaseDeposit(bot); break;
        case "DONE": storePhaseDone(bot); break;
    }
}

/** Envanter doluysa depolamayi baslat */
export function checkAndTriggerStore(bot) {
    if (!isInventoryFull(bot)) return false;
    if (bot.state === "STORING") return true;

    bot._preStoreState = bot.state;
    bot._preStoreMinePhase = bot._minePhase;
    bot._preStoreMineDir = bot._mineDir;
    bot._preStoreMinePos = {
        x: bot.entity.location.x,
        y: bot.entity.location.y,
        z: bot.entity.location.z
    };
    bot._storePhase = "GOTO_OWNER";

    bot.state = "STORING";
    bot._cd = 0;
    bot._msg("§e[STORE] Envanter doldu! Sandik koymaya gidiyorum...");
    return true;
}
