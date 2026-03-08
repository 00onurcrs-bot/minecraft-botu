import { LOG_IDS, AXE_TIERS, PICKAXE_TIERS } from "../bot/constants.js";
import {
    addItem,
    removeItem,
    countItem,
    getToolTier,
    getToolId,
    getInventoryContents,
    passivePickup,
    syncHeldTool,
    clearHeldTool,
    damageTool
} from "../bot/inventory.js";
import { doChop, doBreakLeaves } from "../bot/woodcutting.js";
import { doMine } from "../bot/mining.js";
import { doGuard, doCollect } from "../bot/combat.js";
import { doStore } from "../bot/storage.js";
import { updateHunger, getHungerInfo, feedSteve, isFood } from "../bot/hunger.js";
import {
    doFollow,
    tpOwner,
    moveTo,
    lookAtOwner,
    distOwner,
    distTo,
    distToBlock
} from "./fsm.movement.js";
import {
    setMineDirection,
    findBlock,
    findBlockWide,
    getBlock,
    breakBlock,
    blockCenter,
    sfx,
    canBreakWithTier,
    tickCd,
    msg,
    dropItem
} from "./fsm.blocks.js";

export class BotFSM {
    constructor(entity, owner) {
        this.entity = entity;
        this.owner = owner;
        this.state = "IDLE";
        this._cd = 0;
        this._pickupCd = 0;
        this._mineDir = null;
        this._mineStep = 0;
        this._minePhase = "PREP";
        this._craftTablePos = null;
        this._axeUses = 0;
        this._pickUses = 0;
        this._resumeMinePos = null;
        this._heldToolSlot = null;
        this._heldToolId = null;
        this._oreChainTargets = [];
        this._oreAnchorPos = null;
        this._treeBasePos = null;
        this._treeLockKeys = null;
        this._treeTopY = null;
        this._ignoredTreeKeys = new Set();
        this._stats = {
            woodChopped: 0,
            blocksMined: 0,
            mobsKilled: 0,
            itemsCollected: 0,
            itemsCrafted: 0
        };

        // Açlık sistemi
        this._hunger = 20;
        this._hungerTimer = 0;
        this._starvationTimer = 0;
        this._isEating = false;
        this._eatTimer = 0;
        this._eatingItem = null;
        this._lastHungerWarning = 0;
        this._regenTimer = 0;
    }

    setState(s, force = false) {
        if (this.state === s && !force) return;

        this.state = s;
        this._cd = 0;
        this._mineDir = null;
        this._mineStep = 0;
        this._minePhase = "PREP";
        this._stuckCount = 0;
        this._lastMinePos = null;
        this._targetTree = null;
        this._treeQueue = null;
        this._chopStuckCount = 0;
        this._chopSideAttempt = 0;
        this._lastChopPos = null;
        this._resumeMinePos = null;
        this._oreChainTargets = [];
        this._oreAnchorPos = null;

        const preserveWoodContext = s === "CHOPPING_WOOD" || s === "BREAKING_LEAVES";
        if (!preserveWoodContext) {
            this._treeBasePos = null;
            this._treeLockKeys = null;
            this._treeTopY = null;
            this._ignoredTreeKeys = new Set();
            this._leafCleanupCenter = null;
        }

        if (s !== "MINING" && s !== "CHOPPING_WOOD" && s !== "BREAKING_LEAVES") {
            this._clearHeldTool();
        }

        const messages = {
            IDLE: "§7Steve bekleme moduna gecti.",
            FOLLOWING: "§aSteve seni takip ediyor!",
            CHOPPING_WOOD: "§6Steve odun kirmaya basladi!",
            BREAKING_LEAVES: "§2Steve yaprak kiriyor!",
            MINING: "§bSteve maden kazmaya hazirlaniyor!",
            GUARDING: "§cSteve koruma modunda!",
            COLLECTING: "§eSteve esya topluyor!",
            STORING: "§eSteve esyalari depolamaya gidiyor!"
        };
        this._msg(messages[s] ?? `§e${s}`);
    }

    update() {
        if (!this.entity?.isValid()) return;
        if (!this.owner?.isValid()) {
            this.state = "IDLE";
            this._clearHeldTool();
            return;
        }

        // Vanilla container açıkken TÜM envanter işlemlerini duraklat
        // (Oyuncu Steve'in envanterini sandık gibi açtığında)
        if (this._containerOpen) {
            try {
                const player = this._containerPlayer;
                if (!player?.isValid()) {
                    this._containerOpen = false;
                    this._containerPlayer = null;
                } else {
                    const sp = this.entity.location;
                    const pp = player.location;
                    const dist = Math.sqrt(
                        (sp.x - pp.x) ** 2 + (sp.y - pp.y) ** 2 + (sp.z - pp.z) ** 2
                    );
                    // Oyuncu uzaklaştıysa container kapanmıştır
                    if (dist > 6) {
                        this._containerOpen = false;
                        this._containerPlayer = null;
                    }
                }
            } catch {
                this._containerOpen = false;
                this._containerPlayer = null;
            }
            // Container açıkken hiçbir şey yapma — sadece bekle
            if (this._containerOpen) return;
        }

        // Açlık sistemini güncelle
        updateHunger(this);

        // Yemek yiyorsa başka bir şey yapma
        if (this._isEating) return;

        passivePickup(this);

        if (this.state === "MINING") {
            this._syncHeldTool(PICKAXE_TIERS);
            this._currentBreakToolTier = this._getToolTier(PICKAXE_TIERS);
        } else if (this.state === "CHOPPING_WOOD" || this.state === "BREAKING_LEAVES") {
            this._syncHeldTool(AXE_TIERS);
            this._currentBreakToolTier = this._getToolTier(AXE_TIERS);
        } else {
            this._clearHeldTool();
            this._currentBreakToolTier = 0;
        }

        switch (this.state) {
            case "IDLE": this._lookAtOwner(); break;
            case "FOLLOWING": this._doFollow(); break;
            case "CHOPPING_WOOD": doChop(this); break;
            case "BREAKING_LEAVES": doBreakLeaves(this); break;
            case "MINING": doMine(this); break;
            case "GUARDING": doGuard(this); break;
            case "COLLECTING": doCollect(this); break;
            case "STORING": doStore(this); break;
        }
    }

    _addItem(id, n) { return addItem(this, id, n); }
    _removeItem(id, n) { removeItem(this, id, n); }
    _countItem(id) { return countItem(this, id); }
    _getToolTier(map) { return getToolTier(this, map); }
    _getToolId(map) { return getToolId(this, map); }
    _syncHeldTool(map) { return syncHeldTool(this, map); }
    _clearHeldTool() { clearHeldTool(this); }
    _damageTool(map, amount = 1) { return damageTool(this, map, amount); }

    _countLogs() {
        let total = 0;
        for (const id of LOG_IDS) total += this._countItem(id);
        return total;
    }

    getInventoryContents() { return getInventoryContents(this); }
    getStats() { return { ...this._stats }; }
    getHungerInfo() { return getHungerInfo(this); }
    getHunger() { return this._hunger ?? 20; }
    isFood(typeId) { return isFood(typeId); }
    feedSteve(player, heldItem) { return feedSteve(this, player, heldItem); }

    getStateName() {
        return {
            IDLE: "Bekliyor",
            FOLLOWING: "Takip Ediyor",
            CHOPPING_WOOD: "Odun Kiriyor",
            BREAKING_LEAVES: "Yaprak Kiriyor",
            MINING: "Maden Kaziyor",
            GUARDING: "Koruma Modu",
            COLLECTING: "Esya Topluyor",
            STORING: "Depolama Yapiyor"
        }[this.state] ?? this.state;
    }

    _doFollow() { doFollow.call(this); }
    _tpOwner() { tpOwner.call(this); }
    _moveTo(target) { moveTo.call(this, target); }
    _lookAtOwner() { lookAtOwner.call(this); }
    _distOwner() { return distOwner.call(this); }
    _distTo(target) { return distTo.call(this, target); }
    _distToBlock(block) { return distToBlock.call(this, block); }

    _setMineDirection() { setMineDirection.call(this); }
    _findBlock(blockIds) { return findBlock.call(this, blockIds); }
    _findBlockWide(blockIds, radius) { return findBlockWide.call(this, blockIds, radius); }
    _getBlock(pos) { return getBlock.call(this, pos); }
    _breakBlock(block) { return breakBlock.call(this, block); }
    _blockCenter(block) { return blockCenter.call(this, block); }
    _sfx(pos, sound) { sfx.call(this, pos, sound); }
    _canBreakWithTier(blockTypeId, pickTier) { return canBreakWithTier.call(this, blockTypeId, pickTier); }
    _tickCd() { return tickCd.call(this); }
    _msg(text) { msg.call(this, text); }
    _dropItem(itemId, amount, pos) { dropItem.call(this, itemId, amount, pos); }
}
