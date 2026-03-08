export function storePhaseDone(bot) {
    const prevState = bot._preStoreState ?? "MINING";
    bot._storePhase = null;
    bot._chestPos1 = null;
    bot._chestPos2 = null;
    bot._msg(`§a[STORE] Depolama tamamlandi! ${prevState === "MINING" ? "Madene" : "Ise"} donuyorum...`);

    bot.state = prevState;
    if (prevState === "MINING") {
        if (bot._preStoreMinePhase) bot._minePhase = bot._preStoreMinePhase;
        if (bot._preStoreMineDir) bot._mineDir = bot._preStoreMineDir;
        if (bot._preStoreMinePos) bot._resumeMinePos = { ...bot._preStoreMinePos };
    }

    bot._preStoreState = null;
    bot._preStoreMinePhase = null;
    bot._preStoreMineDir = null;
    bot._preStoreMinePos = null;
    bot._cd = 10;
}
