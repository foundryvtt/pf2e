import { ActorProxyPF2e } from "@actor";
import { PhysicalItemSource } from "@item/base/data/index.ts";
import { REINFORCING_RUNE_LOC_PATHS } from "@item/shield/values.ts";
import { Rarity } from "@module/data.ts";
import * as R from "remeda";
import { Bulk, STACK_DEFINITIONS, weightToBulk } from "./bulk.ts";
import { CoinsPF2e } from "./coins.ts";
import { BulkData } from "./data.ts";
import type { PhysicalItemPF2e } from "./document.ts";
import { getMaterialValuationData } from "./materials.ts";
import { RUNE_DATA, getRuneValuationData } from "./runes.ts";

function computePrice(item: PhysicalItemPF2e): CoinsPF2e {
    const basePrice = item.price.value;
    if (item.isOfType("treasure")) return basePrice;

    // Adjust the item price according to precious material and runes
    // Base prices are not included in these cases
    // https://2e.aonprd.com/Rules.aspx?ID=731
    // https://2e.aonprd.com/Equipment.aspx?ID=380
    const materialData = getMaterialValuationData(item);
    const materialPrice = materialData?.price ?? 0;
    const heldOrStowedBulk = new Bulk({ light: item.system.bulk.heldOrStowed });
    const bulk = Math.max(Math.ceil(heldOrStowedBulk.normal), 1);
    const materialValue = item.isSpecific ? 0 : materialPrice + (bulk * materialPrice) / 10;

    const runesData = getRuneValuationData(item);
    const runeValue = item.isSpecific ? 0 : runesData.reduce((sum, rune) => sum + rune.price, 0);

    const afterMaterialAndRunes = runeValue
        ? new CoinsPF2e({ gp: runeValue + materialValue })
        : basePrice.add({ gp: materialValue });
    const higher = afterMaterialAndRunes.copperValue > basePrice.copperValue ? afterMaterialAndRunes : basePrice;
    const afterShoddy = item.isShoddy ? higher.scale(0.5) : higher;

    /** Increase the price if it is larger than medium and not magical. */
    return item.isMagical ? afterShoddy : afterShoddy.adjustForSize(item.size);
}

function computeLevelRarityPrice(item: PhysicalItemPF2e): { level: number; rarity: Rarity; price: CoinsPF2e } {
    // Stop here if this weapon is not a magical or precious-material item, or if it is a specific magic weapon
    const materialData = getMaterialValuationData(item);
    const price = computePrice(item);
    if (!(item.isMagical || materialData) || item.isSpecific) {
        return { ...R.pick(item, ["level", "rarity"]), price };
    }

    const runesData = getRuneValuationData(item);
    const level = runesData
        .map((r) => r.level)
        .concat(materialData?.level ?? 0)
        .reduce((highest, level) => (level > highest ? level : highest), item.level);

    const rarityOrder = {
        common: 0,
        uncommon: 1,
        rare: 2,
        unique: 3,
    };
    const baseRarity = item.rarity;
    const rarity = runesData
        .map((runeData) => runeData.rarity)
        .concat(materialData?.rarity ?? "common")
        .reduce((highest, rarity) => (rarityOrder[rarity] > rarityOrder[highest] ? rarity : highest), baseRarity);

    return { level, rarity, price };
}

/**
 * Generate a modified item name based on precious materials and runes. Currently only armor and weapon documents
 * have significant implementations.
 */
function generateItemName(item: PhysicalItemPF2e): string {
    if (!item.isOfType("armor", "shield", "weapon")) {
        return item.name;
    }

    type Dictionaries = [
        Record<string, string | undefined>,
        Record<string, { name: string } | undefined> | null,
        Record<string, { name: string } | null> | null,
    ];

    // Acquire base-type and rune dictionaries, with "fundamental 2" being either resilient or striking
    const [baseItemDictionary, propertyDictionary, fundamentalTwoDictionary]: Dictionaries = item.isOfType("armor")
        ? [CONFIG.PF2E.baseArmorTypes, RUNE_DATA.armor.property, RUNE_DATA.armor.resilient]
        : item.isOfType("shield")
          ? [CONFIG.PF2E.baseShieldTypes, null, null]
          : [
                { ...CONFIG.PF2E.baseWeaponTypes, ...CONFIG.PF2E.baseShieldTypes },
                RUNE_DATA.weapon.property,
                RUNE_DATA.weapon.striking,
            ];

    const storedName = item._source.name;
    const baseType = item.baseType ?? "";
    if (
        !baseType ||
        !(baseType in baseItemDictionary) ||
        item.isSpecific ||
        storedName !== game.i18n.localize(baseItemDictionary[baseType] ?? "")
    ) {
        return item.name;
    }

    const { material } = item;
    const { runes } = item.system;
    const potency = "potency" in runes && runes.potency ? runes.potency : null;
    const fundamental2 = "resilient" in runes ? runes.resilient : "striking" in runes ? runes.striking : null;
    const reinforcing =
        "reinforcing" in runes ? game.i18n.localize(REINFORCING_RUNE_LOC_PATHS[runes.reinforcing] ?? "") || null : null;

    const params: Record<string, string | number | null> = {
        base: baseType
            ? material.type && ["hide-armor", "steel-shield", "wooden-shield"].includes(baseType)
                ? game.i18n.localize(`TYPES.Item.${item.type}`)
                : game.i18n.localize(baseItemDictionary[baseType] ?? "")
            : item.name,
        material: material.type && game.i18n.localize(CONFIG.PF2E.preciousMaterials[material.type]),
        potency,
        reinforcing,
        fundamental2:
            fundamental2 && fundamentalTwoDictionary
                ? game.i18n.localize(fundamentalTwoDictionary[fundamental2]?.name ?? "") || null
                : null,
    };
    if ("property" in runes && propertyDictionary) {
        for (const index of [0, 1, 2, 3] as const) {
            params[`property${index + 1}`] =
                game.i18n.localize(propertyDictionary[runes.property[index]]?.name ?? "") || null;
        }
    }

    // Construct a localization key from material and runes
    const formatString = (() => {
        const potency = params.potency ? "Potency" : null;
        const reinforcing = params.reinforcing ? "Reinforcing" : null;
        const fundamental2 = params.fundamental2 && "Fundamental2";
        const properties = params.property4
            ? "FourProperties"
            : params.property3
              ? "ThreeProperties"
              : params.property2
                ? "TwoProperties"
                : params.property1
                  ? "OneProperty"
                  : null;
        const material = params.material && "Material";
        const key = R.compact([potency, reinforcing, fundamental2, properties, material]).join("") || null;
        return key && game.i18n.localize(key);
    })();

    return formatString ? game.i18n.format(`PF2E.Item.Physical.GeneratedName.${formatString}`, params) : item.name;
}

/** Validate HP changes to a physical item and also adjust current HP when max HP changes */
function handleHPChange(item: PhysicalItemPF2e, changed: DeepPartial<PhysicalItemSource>): void {
    // Basic validity: integer greater than or equal to zero
    for (const property of ["value", "max"] as const) {
        if (changed.system?.hp && changed.system.hp[property] !== undefined) {
            changed.system.hp[property] = Math.max(Math.floor(Number(changed.system.hp[property])), 0) || 0;
        }
    }

    // Get a clone of the item, through an actor clone if owned
    const actorSource = item.actor?.toObject();
    const changedSource = item.clone(deepClone(changed), { keepId: true }).toObject();
    const itemIndex = actorSource?.items.findIndex((i) => i._id === item._id);
    if (itemIndex === -1) return;
    actorSource?.items.splice(itemIndex ?? 0, 1, changedSource);
    const actorClone = actorSource ? new ActorProxyPF2e(actorSource) : null;
    const itemClone = actorClone?.inventory.get(item.id, { strict: true }) ?? item.clone(changed, { keepId: true });

    // Adjust current HP proportionally if max HP changed
    const maxHPDifference = itemClone.system.hp.max - item.system.hp.max;
    if (maxHPDifference !== 0) {
        changed.system = mergeObject(changed.system ?? {}, {
            hp: { value: Math.max(item.system.hp.value + maxHPDifference, 0) },
        });
    }

    // Final overage check
    const newValue = changed.system?.hp?.value ?? itemClone.system.hp.value;
    if (newValue > itemClone.system.hp.max) {
        changed.system = mergeObject(changed.system ?? {}, { hp: { value: itemClone.system.hp.max } });
    }
}

/**  Convert of scattershot bulk data on a physical item into a single object */
function organizeBulkData(item: PhysicalItemPF2e): BulkData {
    const stackData = STACK_DEFINITIONS[item.system.stackGroup ?? ""] ?? null;
    const per = stackData?.size ?? 1;

    const heldOrStowed = stackData?.lightBulk ?? weightToBulk(item.system.weight.value)?.toLightBulk() ?? 0;
    const worn = item.system.equippedBulk.value
        ? weightToBulk(item.system.equippedBulk.value)?.toLightBulk() ?? 0
        : heldOrStowed;

    const value = item.isOfType("armor", "equipment", "backpack") && item.isEquipped ? worn : heldOrStowed;

    return { heldOrStowed, worn, value, per };
}

export { coinCompendiumIds } from "./coins.ts";
export { CoinsPF2e, computeLevelRarityPrice, generateItemName, handleHPChange, organizeBulkData };
