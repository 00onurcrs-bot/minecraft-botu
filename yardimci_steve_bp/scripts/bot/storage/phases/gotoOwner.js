export function storePhaseGotoOwner(bot) {
    const dist = bot._distOwner();
    if (dist > 3) {
        const p = bot.owner.location;
        bot._moveTo({ x: p.x, y: p.y, z: p.z });
        bot._cd = 2;
        return;
    }
    bot._msg("§e📦 Envanter dolu! Sandık koyuyorum...");
    bot._storePhase = "PLACE_CHEST";
    bot._cd = 5;
}
