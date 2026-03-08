/**
 * combat.js - Koruma ve savas sistemi
 */
import { EntityDamageCause, ItemStack } from "@minecraft/server";
import { HOSTILES, GUARD_RANGE, GUARD_ATK, GUARD_DMG, TP_DIST, FOLLOW_DIST, SCAN_R, TR, MOB_TR } from "./constants.js";

/** Koruma modu */
export function doGuard(bot) {
    if (bot._tickCd()) return;
    if (bot._distOwner() > TP_DIST) { bot._tpOwner(); return; }

    const dim = bot.entity.dimension;
    const pos = bot.entity.location;
    let closest = null, closestD = Infinity;

    try {
        for (const e of dim.getEntities({ location: pos, maxDistance: GUARD_RANGE })) {
            if (!e.isValid() || !HOSTILES.includes(e.typeId)) continue;
            const d = bot._distTo(e.location);
            if (d < closestD) { closestD = d; closest = e; }
        }
    } catch { }

    if (!closest) {
        if (bot._distOwner() > FOLLOW_DIST) bot._moveTo(bot.owner.location);
        else bot._lookAtOwner();
        bot._cd = 10;
        return;
    }

    if (closestD > GUARD_ATK) {
        bot._moveTo(closest.location);
        bot._cd = 3;
        return;
    }

    try {
        closest.applyDamage(GUARD_DMG, { cause: EntityDamageCause.entityAttack, damagingEntity: bot.entity });
        const mp = closest.location;
        dim.runCommand(`particle minecraft:critical_hit_emitter ${mp.x} ${mp.y + 1} ${mp.z}`);
        try {
            const hp = closest.getComponent("minecraft:health");
            if (!hp || hp.currentValue <= 0) {
                bot._stats.mobsKilled++;
                bot._msg(`§c[ATTACK] ${MOB_TR[closest.typeId] ?? closest.typeId} olduruldu! (${bot._stats.mobsKilled})`);
            }
        } catch { }
    } catch { }
    bot._cd = 15;
}

/** Esya toplama */
export function doCollect(bot) {
    if (bot._tickCd()) return;
    const dim = bot.entity.dimension;
    const pos = bot.entity.location;
    let closest = null, closestD = Infinity;

    try {
        for (const e of dim.getEntities({ location: pos, maxDistance: SCAN_R, type: "minecraft:item" })) {
            if (!e.isValid()) continue;
            const d = bot._distTo(e.location);
            if (d < closestD) { closestD = d; closest = e; }
        }
    } catch { }

    if (!closest) {
        if (bot._distOwner() > FOLLOW_DIST + 2) bot._moveTo(bot.owner.location);
        else bot._lookAtOwner();
        bot._cd = 15;
        return;
    }

    if (closestD > 1.5) {
        bot._moveTo(closest.location);
        bot._cd = 3;
        return;
    }

    try {
        const ic = closest.getComponent("minecraft:item");
        if (ic?.itemStack) {
            const stack = ic.itemStack;
            const added = bot._addItem(stack, stack.amount);
            if (added <= 0) {
                bot._cd = 10;
                return;
            }

            bot._stats.itemsCollected++;
            const name = TR[stack.typeId] ?? stack.typeId.replace("minecraft:", "").replace(/_/g, " ");
            bot._msg(`§e[ITEM] ${name} x${added} toplandi!`);

            if (added < stack.amount) {
                dim.spawnItem(
                    new ItemStack(stack.typeId, stack.amount - added),
                    { x: closest.location.x, y: closest.location.y, z: closest.location.z }
                );
            }
        }
        closest.kill();
    } catch { }

    bot._cd = 5;
}
