/**
 * hunger.js — Açlık ve yemek sistemi
 * 
 * Steve hayatta kalma kurallarına tabi:
 * - Açlık barı 0-20 arası (20 = tok, 0 = aç)
 * - Yemek verildiğinde yer ve geğirir
 * - Açlık 0'a düşünce yavaş yavaş can kaybeder (açlık hasarı)
 * - Belirli aralıklarla açlık azalır
 */

/** Minecraft'taki yemek değerleri (hunger restore miktarı) */
export const FOOD_VALUES = {
    // Et ürünleri
    "minecraft:cooked_beef": 8,
    "minecraft:cooked_porkchop": 8,
    "minecraft:cooked_mutton": 6,
    "minecraft:cooked_chicken": 6,
    "minecraft:cooked_rabbit": 5,
    "minecraft:cooked_cod": 5,
    "minecraft:cooked_salmon": 6,
    "minecraft:beef": 3,
    "minecraft:porkchop": 3,
    "minecraft:mutton": 2,
    "minecraft:chicken": 2,
    "minecraft:rabbit": 3,
    "minecraft:cod": 2,
    "minecraft:salmon": 2,

    // Ekmek ve tahıl
    "minecraft:bread": 5,
    "minecraft:cookie": 2,
    "minecraft:cake": 2,
    "minecraft:pumpkin_pie": 8,

    // Meyveler
    "minecraft:apple": 4,
    "minecraft:golden_apple": 4,
    "minecraft:enchanted_golden_apple": 4,
    "minecraft:melon_slice": 2,
    "minecraft:sweet_berries": 2,
    "minecraft:glow_berries": 2,
    "minecraft:chorus_fruit": 4,

    // Sebzeler
    "minecraft:carrot": 3,
    "minecraft:golden_carrot": 6,
    "minecraft:potato": 1,
    "minecraft:baked_potato": 5,
    "minecraft:beetroot": 1,
    "minecraft:dried_kelp": 1,

    // Çorbalar/Stew
    "minecraft:mushroom_stew": 6,
    "minecraft:beetroot_soup": 6,
    "minecraft:rabbit_stew": 10,
    "minecraft:suspicious_stew": 6,

    // Diğer
    "minecraft:rotten_flesh": 4,
    "minecraft:spider_eye": 2,
    "minecraft:poisonous_potato": 2,
    "minecraft:tropical_fish": 1,
    "minecraft:pufferfish": 1
};

/** Yemek Türkçe isimleri */
export const FOOD_TR = {
    "minecraft:cooked_beef": "Pişmiş Biftek",
    "minecraft:cooked_porkchop": "Pişmiş Pirzola",
    "minecraft:cooked_mutton": "Pişmiş Koyun Eti",
    "minecraft:cooked_chicken": "Pişmiş Tavuk",
    "minecraft:cooked_rabbit": "Pişmiş Tavşan",
    "minecraft:cooked_cod": "Pişmiş Morina",
    "minecraft:cooked_salmon": "Pişmiş Somon",
    "minecraft:beef": "Çiğ Biftek",
    "minecraft:porkchop": "Çiğ Pirzola",
    "minecraft:mutton": "Çiğ Koyun Eti",
    "minecraft:chicken": "Çiğ Tavuk",
    "minecraft:rabbit": "Çiğ Tavşan",
    "minecraft:cod": "Çiğ Morina",
    "minecraft:salmon": "Çiğ Somon",
    "minecraft:bread": "Ekmek",
    "minecraft:cookie": "Kurabiye",
    "minecraft:cake": "Pasta",
    "minecraft:pumpkin_pie": "Balkabağı Turtası",
    "minecraft:apple": "Elma",
    "minecraft:golden_apple": "Altın Elma",
    "minecraft:enchanted_golden_apple": "Büyülü Altın Elma",
    "minecraft:melon_slice": "Karpuz Dilimi",
    "minecraft:sweet_berries": "Tatlı Çilek",
    "minecraft:glow_berries": "Parlayan Çilek",
    "minecraft:chorus_fruit": "Koro Meyvesi",
    "minecraft:carrot": "Havuç",
    "minecraft:golden_carrot": "Altın Havuç",
    "minecraft:potato": "Patates",
    "minecraft:baked_potato": "Pişmiş Patates",
    "minecraft:beetroot": "Pancar",
    "minecraft:dried_kelp": "Kurutulmuş Yosun",
    "minecraft:mushroom_stew": "Mantar Çorbası",
    "minecraft:beetroot_soup": "Pancar Çorbası",
    "minecraft:rabbit_stew": "Tavşan Yahnisi",
    "minecraft:suspicious_stew": "Şüpheli Yahni",
    "minecraft:rotten_flesh": "Çürük Et",
    "minecraft:spider_eye": "Örümcek Gözü",
    "minecraft:poisonous_potato": "Zehirli Patates",
    "minecraft:tropical_fish": "Tropikal Balık",
    "minecraft:pufferfish": "Balon Balığı"
};

/** Verilen item yemek mi? */
export function isFood(typeId) {
    return FOOD_VALUES.hasOwnProperty(typeId);
}

/** Yemeğin doldurduğu açlık miktarı */
export function getFoodValue(typeId) {
    return FOOD_VALUES[typeId] ?? 0;
}

/** Yemeğin Türkçe adı */
export function getFoodName(typeId) {
    return FOOD_TR[typeId] ?? typeId.replace("minecraft:", "").replace(/_/g, " ");
}

// --- Açlık sabitleri ---
/** Her kaç tick'te bir açlık 1 azalır (20 tick = 1 saniye, 600 = 30 saniye) */
export const HUNGER_DECAY_INTERVAL = 600;

/** Açlık 0 olduğunda her kaç tick'te bir hasar alır (80 tick = 4 saniye) */
export const STARVATION_DAMAGE_INTERVAL = 80;

/** Açlık hasarı miktarı (her seferinde) */
export const STARVATION_DAMAGE = 1;

/** Yemek yeme animasyonu süresi (tick) */
export const EAT_DURATION = 32;

/**
 * Bot'a açlık sistemi ekleyen ana fonksiyon
 * Her tick'te çağrılır (botLifecycle'daki runInterval'den)
 */
export function updateHunger(bot) {
    if (!bot.entity?.isValid()) return;
    if (!bot.owner?.isValid()) return;

    // İlk çağrıda hunger state'i oluştur
    if (bot._hunger === undefined) {
        bot._hunger = 20;           // Açlık barı (0-20)
        bot._hungerTimer = 0;       // Açlık azalma zamanlayıcı
        bot._starvationTimer = 0;   // Açlık hasarı zamanlayıcı
        bot._isEating = false;      // Yemek yiyor mu?
        bot._eatTimer = 0;          // Yemek yeme zamanlayıcı
        bot._eatingItem = null;     // Yediği yemek
        bot._lastHungerWarning = 0; // Son uyarı zamanı
    }

    // Yemek yeme animasyonu sırasında
    if (bot._isEating) {
        bot._eatTimer++;

        // Yemek yeme sesleri (çiğneme)
        if (bot._eatTimer % 4 === 0 && bot._eatTimer < EAT_DURATION) {
            try {
                const pos = bot.entity.location;
                bot.entity.dimension.runCommand(
                    `playsound random.eat @a ${pos.x} ${pos.y} ${pos.z} 0.6 ${0.8 + Math.random() * 0.4}`
                );
            } catch { }
        }

        // Yemek yeme bitti
        if (bot._eatTimer >= EAT_DURATION) {
            finishEating(bot);
        }
        return; // Yemek yerken başka bir şey yapma
    }

    // Açlık zamanlayıcısı
    bot._hungerTimer++;
    if (bot._hungerTimer >= HUNGER_DECAY_INTERVAL) {
        bot._hungerTimer = 0;
        if (bot._hunger > 0) {
            bot._hunger--;

            // Açlık uyarıları
            if (bot._hunger <= 6 && bot._hunger > 0) {
                const now = Date.now();
                if (now - bot._lastHungerWarning > 10000) {
                    bot._lastHungerWarning = now;
                    const bars = getHungerBars(bot._hunger);
                    bot._msg(`§e🍖 Steve acıkıyor! ${bars} §7(${bot._hunger}/20)`);
                }
            }
            if (bot._hunger === 0) {
                bot._msg("§c⚠ Steve çok aç! Yemek ver yoksa canı azalacak!");
            }
        }
    }

    // Açlık 0 ise yavaş yavaş can kaybı (açlık hasarı)
    if (bot._hunger <= 0) {
        bot._starvationTimer++;
        if (bot._starvationTimer >= STARVATION_DAMAGE_INTERVAL) {
            bot._starvationTimer = 0;
            try {
                const hp = bot.entity.getComponent("minecraft:health");
                if (hp && hp.currentValue > 1) {
                    // Can minimum 1'e düşer (açlıktan tamamen ölmez, ama çok zayıf kalır)
                    const newHp = Math.max(1, hp.currentValue - STARVATION_DAMAGE);
                    hp.setCurrentValue(newHp);
                    
                    const pos = bot.entity.location;
                    bot.entity.dimension.runCommand(
                        `playsound random.hurt @a ${pos.x} ${pos.y} ${pos.z} 0.5`
                    );
                    bot.entity.dimension.runCommand(
                        `particle minecraft:villager_angry ${pos.x} ${pos.y + 1.8} ${pos.z}`
                    );

                    const now = Date.now();
                    if (now - bot._lastHungerWarning > 8000) {
                        bot._lastHungerWarning = now;
                        bot._msg(`§c💀 Steve açlıktan zarar görüyor! §4❤ ${Math.floor(hp.currentValue)}/40`);
                    }
                }
            } catch { }
        }
    } else {
        bot._starvationTimer = 0;
    }

    // Açlık 18+ ise yavaş yavaş can yenilenmesi (Minecraft'taki gibi)
    if (bot._hunger >= 18) {
        try {
            const hp = bot.entity.getComponent("minecraft:health");
            if (hp && hp.currentValue < hp.effectiveMax) {
                // Her 80 tick'te 1 can yenile
                if (!bot._regenTimer) bot._regenTimer = 0;
                bot._regenTimer++;
                if (bot._regenTimer >= 80) {
                    bot._regenTimer = 0;
                    hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + 1));
                }
            }
        } catch { }
    } else {
        bot._regenTimer = 0;
    }

    // Otomatik yemek yeme: Açlık 10 veya altına düşerse envanterden yemek ara
    if (bot._hunger <= 10) {
        tryAutoEat(bot);
    }
}

/**
 * Envanterden yemek bul ve otomatik ye
 */
function tryAutoEat(bot) {
    if (bot._isEating) return;

    try {
        const inv = bot.entity.getComponent("minecraft:inventory")?.container;
        if (!inv) return;

        let bestSlot = -1;
        let bestValue = 0;
        let bestTypeId = null;

        for (let i = 0; i < inv.size; i++) {
            const item = inv.getItem(i);
            if (!item) continue;
            if (isFood(item.typeId)) {
                const val = getFoodValue(item.typeId);
                // En iyi yemeği seç (açlığı en çok dolduranı)
                if (val > bestValue) {
                    bestValue = val;
                    bestSlot = i;
                    bestTypeId = item.typeId;
                }
            }
        }

        if (bestSlot >= 0) {
            startEating(bot, bestSlot, bestTypeId);
        }
    } catch { }
}

/**
 * Yemek yemeye başla
 */
function startEating(bot, slot, typeId) {
    bot._isEating = true;
    bot._eatTimer = 0;
    bot._eatingItem = { slot, typeId };

    const name = getFoodName(typeId);
    bot._msg(`§e🍖 Steve ${name} yiyor...`);

    // Yemek yemeye başlama sesi
    try {
        const pos = bot.entity.location;
        bot.entity.dimension.runCommand(
            `playsound random.eat @a ${pos.x} ${pos.y} ${pos.z} 0.5 0.8`
        );
    } catch { }
}

/**
 * Yemek yeme bitti - geğirme!
 */
function finishEating(bot) {
    if (!bot._eatingItem) {
        bot._isEating = false;
        return;
    }

    const { slot, typeId } = bot._eatingItem;
    const foodValue = getFoodValue(typeId);
    const name = getFoodName(typeId);

    // Envanterden 1 adet yemeği çıkar
    try {
        const inv = bot.entity.getComponent("minecraft:inventory")?.container;
        if (inv) {
            const item = inv.getItem(slot);
            if (item && item.typeId === typeId) {
                if (item.amount > 1) {
                    item.amount -= 1;
                    inv.setItem(slot, item);
                } else {
                    inv.setItem(slot, undefined);
                }
            }
        }
    } catch { }

    // Açlığı doldur
    const oldHunger = bot._hunger;
    bot._hunger = Math.min(20, bot._hunger + foodValue);
    const gained = bot._hunger - oldHunger;

    // GEĞİRME sesi ve efekti!
    try {
        const pos = bot.entity.location;
        // Geğirme sesi (burp)
        bot.entity.dimension.runCommand(
            `playsound random.burp @a ${pos.x} ${pos.y} ${pos.z} 1.0 ${0.9 + Math.random() * 0.2}`
        );
        // Yemek parçacık efekti
        bot.entity.dimension.runCommand(
            `particle minecraft:heart_particle ${pos.x} ${pos.y + 2} ${pos.z}`
        );
    } catch { }

    const bars = getHungerBars(bot._hunger);
    bot._msg(`§a🍖 Steve ${name} yedi ve geğirdi! ${bars} §7(+${gained}, ${bot._hunger}/20)`);

    // State sıfırla
    bot._isEating = false;
    bot._eatTimer = 0;
    bot._eatingItem = null;
}

/**
 * Oyuncu tarafından yemek verildiğinde çağrılır
 * (steveInventory.js'den)
 */
export function feedSteve(bot, player, heldItem) {
    if (!isFood(heldItem.typeId)) return false;

    // Açlık zaten full ise
    if (bot._hunger >= 20) {
        player.sendMessage("§7Steve tok, yemeğe ihtiyacı yok şu an.");
        return true; // Yine de "yemek" olarak işaretlensin
    }

    // Yemek yiyorsa bekle
    if (bot._isEating) {
        player.sendMessage("§7Steve zaten yemek yiyor, biraz bekle.");
        return true;
    }

    const typeId = heldItem.typeId;
    const name = getFoodName(typeId);

    // Oyuncunun elinden 1 adet al
    try {
        const inv = player.getComponent("minecraft:inventory")?.container;
        if (inv) {
            const item = inv.getItem(player.selectedSlotIndex);
            if (item) {
                if (item.amount > 1) {
                    item.amount -= 1;
                    inv.setItem(player.selectedSlotIndex, item);
                } else {
                    inv.setItem(player.selectedSlotIndex, undefined);
                }
            }
        }
    } catch { }

    // Yemek yemeye başla (kısa süre)
    bot._isEating = true;
    bot._eatTimer = 0;
    bot._eatingItem = { slot: -1, typeId, fromPlayer: true };

    player.sendMessage(`§e🍖 Steve ${name} yiyor...`);

    // Yemeye başlama sesi
    try {
        const pos = bot.entity.location;
        bot.entity.dimension.runCommand(
            `playsound random.eat @a ${pos.x} ${pos.y} ${pos.z} 0.5 0.8`
        );
    } catch { }

    return true;
}

/**
 * Açlık barını görsel olarak göster
 */
function getHungerBars(hunger) {
    const full = Math.floor(hunger / 2);
    const half = hunger % 2;
    const empty = 10 - full - half;
    return "§c" + "🍖".repeat(full) + (half ? "§e🍖" : "") + "§8" + "🍖".repeat(empty);
}

/**
 * Açlık bilgisini döndür (menü için)
 */
export function getHungerInfo(bot) {
    if (bot._hunger === undefined) return "Açlık: Bilinmiyor";
    const bars = getHungerBars(bot._hunger);
    const status = bot._hunger >= 18 ? "§aTok"
        : bot._hunger >= 12 ? "§eNormal"
        : bot._hunger >= 6 ? "§6Acıkıyor"
        : bot._hunger > 0 ? "§cAç"
        : "§4Açlıktan ölüyor!";
    return `${bars}\n§7Açlık: ${bot._hunger}/20 ${status}`;
}
