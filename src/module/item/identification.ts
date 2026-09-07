import type { SkillSlug } from "@actor/types.ts";
import type { ImageFilePath } from "@common/constants.d.mts";
import type { Rarity } from "@module/data.ts";
import { setHasElement } from "@util";
import { adjustDC, calculateDC, DCAdjustment, DCOptions, rarityToDCAdjustment } from "../dc.ts";
import type { PhysicalItemPF2e } from "./physical/index.ts";
import type { MagicTradition } from "./spell/types.ts";
import { MAGIC_TRADITIONS } from "./spell/values.ts";

/**
 * Implementation of Identify Magic and Identify Alchemy Rules for items
 * https://2e.aonprd.com/Actions.aspx?ID=24
 * https://2e.aonprd.com/Actions.aspx?ID=44
 *
 * See https://www.youtube.com/watch?v=MJ7gUq9InBk for interpretations
 */

/**
 * Extract all traits from an item, that match a magic tradition
 * @param itemData
 */
function getMagicTraditions(item: PhysicalItemPF2e): Set<MagicTradition> {
    const traits: string[] = item.system.traits.value;
    return new Set(traits.filter((t): t is MagicTradition => setHasElement(MAGIC_TRADITIONS, t)));
}

type MagicSkill = Extract<SkillSlug, "arcana" | "nature" | "religion" | "occultism">;

const TRADITION_SKILLS: Record<MagicTradition, MagicSkill> = {
    arcane: "arcana",
    primal: "nature",
    divine: "religion",
    occult: "occultism",
};

/** All cursed items are incredibly hard to identify */
function getDcRarity(item: PhysicalItemPF2e): Rarity {
    return item.traits.has("cursed") ? "unique" : item.rarity;
}

type IdentifyMagicDCs = Record<MagicSkill, number>;
type IdentifyAlchemyDCs = { crafting: number };

/** Skills whose tradition doesn't match the item's: once an item has a tradition, identifying it with any other is hard */
function getOffTraditionSkills(item: PhysicalItemPF2e): MagicSkill[] {
    const traditions = getMagicTraditions(item);
    if (traditions.size === 0) return [];
    return Array.from(MAGIC_TRADITIONS)
        .filter((t) => !traditions.has(t))
        .map((t) => TRADITION_SKILLS[t]);
}

function getIdentifyMagicDCs(
    baseDC: number,
    offTradition: MagicSkill[],
    notMatchingModifier: number,
): IdentifyMagicDCs {
    const dcs = { arcana: baseDC, nature: baseDC, occultism: baseDC, religion: baseDC };
    for (const skill of offTradition) {
        dcs[skill] = baseDC + notMatchingModifier;
    }
    return dcs;
}

interface IdentifyItemOptions extends DCOptions {
    notMatchingTraditionModifier: number;
    adjustment?: DCAdjustment;
}

/** The difficulty adjustment an item's DCs starts at */
function getIdentificationAdjustment(item: PhysicalItemPF2e): DCAdjustment {
    return rarityToDCAdjustment(getDcRarity(item));
}

/** Identification DCs along with the parts they were assembled from, for display */
function getIdentificationData(
    item: PhysicalItemPF2e,
    { pwol = false, notMatchingTraditionModifier, adjustment }: IdentifyItemOptions,
): IdentificationData {
    const base = calculateDC(item.level, { pwol });
    adjustment ??= getIdentificationAdjustment(item);
    const dc = adjustDC(base, adjustment);
    const offTradition = item.isMagical ? getOffTraditionSkills(item) : [];

    return {
        base,
        adjustment,
        adjusted: dc,
        dcs: item.isMagical ? getIdentifyMagicDCs(dc, offTradition, notMatchingTraditionModifier) : { crafting: dc },
        offTradition,
    };
}

interface IdentificationData {
    /** The level-based DC, before adjustment */
    base: number;
    /** The adjustment applied to the base DC */
    adjustment: DCAdjustment;
    /** The base DC after adjustment, and before any not-matching-tradition modifier */
    adjusted: number;
    dcs: IdentifyMagicDCs | IdentifyAlchemyDCs;
    /** Skills whose DC includes the not-matching-tradition modifier */
    offTradition: MagicSkill[];
}

function getUnidentifiedPlaceholderImage(item: PhysicalItemPF2e): ImageFilePath {
    const iconName = ((): string => {
        if (item.isOfType("weapon")) {
            const { traits } = item;
            if (traits.has("bomb")) {
                return "alchemical_bomb";
            } else if (traits.has("staff")) {
                return "staves";
            } else if (traits.has("artifact")) {
                return "artifact";
            } else {
                return "weapon";
            }
        } else if (item.isOfType("armor")) {
            return "armor";
        } else if (item.isOfType("shield")) {
            return "shields";
        } else if (item.isOfType("consumable")) {
            switch (item.category) {
                case "oil":
                    return "oils";
                case "scroll":
                    return "infernal-contracts";
                case "talisman":
                    return "talisman";
                case "elixir":
                case "mutagen":
                    return "alchemical_elixir";
                case "poison":
                    return "alchemical_poison";
                case "toolkit":
                    return "alchemical_tool";
                case "wand":
                    return "wands";
                case "potion":
                    return "potions";
                case "snare":
                case "other":
                default:
                    if (item.traits.has("drug")) {
                        return "drugs";
                    } else {
                        return "other-consumables";
                    }
            }
        } else if (item.isOfType("ammo")) {
            return "ammunition";
        } else if (item.isOfType("equipment")) {
            if (item.traits.has("precious")) {
                return "material-chunk";
            }
        }
        return "adventuring_gear";
    })();

    return `systems/${SYSTEM_ID}/icons/unidentified_item_icons/${iconName}.webp`;
}

export { getIdentificationAdjustment, getIdentificationData, getUnidentifiedPlaceholderImage };
export type { IdentificationData, IdentifyAlchemyDCs, IdentifyMagicDCs, MagicSkill };
