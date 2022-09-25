import { adjustDCByRarity, calculateDC, DCOptions } from "../dc";
import { PhysicalItemPF2e } from "./physical";
import { MagicTradition } from "./spell/types";
import { MAGIC_TRADITIONS } from "./spell/values";
import { setHasElement } from "@util";
import { Rarity } from "@module/data";

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

/** All cursed items are incredibly hard to identify */
function getDcRarity(item: PhysicalItemPF2e): Rarity {
    return item.traits.has("cursed") ? "unique" : item.rarity;
}

export interface IdentifyMagicDCs {
    arc: number;
    nat: number;
    rel: number;
    occ: number;
}

export interface IdentifyAlchemyDCs {
    cra: number;
}

export interface GenericIdentifyDCs {
    dc: number;
}

function identifyMagic(item: PhysicalItemPF2e, baseDc: number, notMatchingTraditionModifier: number) {
    const result = {
        occult: baseDc,
        primal: baseDc,
        divine: baseDc,
        arcane: baseDc,
    };
    const traditions = getMagicTraditions(item);
    for (const key of MAGIC_TRADITIONS) {
        // once an item has a magic tradition, all skills
        // that don't match the tradition are hard
        if (traditions.size > 0 && !traditions.has(key)) {
            result[key] = baseDc + notMatchingTraditionModifier;
        }
    }
    return { arc: result.arcane, nat: result.primal, rel: result.divine, occ: result.occult };
}

export function isMagical(item: PhysicalItemPF2e): boolean {
    const { traits } = item;
    return (["magical", ...Array.from(MAGIC_TRADITIONS)] as const).some((t) => traits.has(t));
}

interface IdentifyItemOptions extends DCOptions {
    notMatchingTraditionModifier: number;
}

export function identifyItem(
    item: PhysicalItemPF2e,
    { proficiencyWithoutLevel = false, notMatchingTraditionModifier }: IdentifyItemOptions
): GenericIdentifyDCs | IdentifyMagicDCs | IdentifyAlchemyDCs {
    const baseDC = calculateDC(item.level, { proficiencyWithoutLevel });
    const rarity = getDcRarity(item);
    const dc = adjustDCByRarity(baseDC, rarity);
    if (item.isMagical) {
        return identifyMagic(item, dc, notMatchingTraditionModifier);
    } else if (item.isAlchemical) {
        return { cra: dc };
    } else {
        return { dc: dc };
    }
}

export function getUnidentifiedPlaceholderImage(item: PhysicalItemPF2e): string {
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
            return item.category === "shield" ? "shields" : "armor";
        } else if (item.isOfType("consumable")) {
            switch (item.consumableType) {
                case "ammo":
                    return "ammunition";
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
                case "tool":
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
        } else if (item.isOfType("equipment")) {
            if (item.traits.has("precious")) {
                return "material-chunk";
            }
        }
        return "adventuring_gear";
    })();

    return `systems/pf2e/icons/unidentified_item_icons/${iconName}.webp`;
}
