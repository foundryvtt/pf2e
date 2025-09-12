import { ActorPF2e, ActorProxyPF2e } from "@actor";
import { ActorSizePF2e } from "@actor/data/size.ts";
import type { ContainerPF2e, PhysicalItemPF2e } from "@item";
import { PhysicalItemSource } from "@item/base/data/index.ts";
import { ContainerBulkData } from "@item/container/data.ts";
import { REINFORCING_RUNE_LOC_PATHS } from "@item/shield/values.ts";
import { Rarity } from "@module/data.ts";
import { tupleHasValue } from "@util";
import * as R from "remeda";
import { Bulk, STACK_DEFINITIONS } from "./bulk.ts";
import { CoinsPF2e } from "./coins.ts";
import { BulkData, EquippedData } from "./data.ts";
import { getMaterialValuationData } from "./materials.ts";
import { RUNE_DATA, getRuneValuationData } from "./runes.ts";

function computePrice(item: PhysicalItemPF2e): CoinsPF2e {
    if (item.isOfType("treasure")) return item.price.value;

    // Adjust the item price according to precious material and runes
    // Base prices are not included in these cases
    // https://2e.aonprd.com/Rules.aspx?ID=731
    // https://2e.aonprd.com/Equipment.aspx?ID=380
    const materialData = getMaterialValuationData(item);
    const materialPrice = materialData?.price ?? 0;
    const heldOrStowedBulk = new Bulk(item.system.bulk.heldOrStowed);
    // Shield prices don't vary by bulk
    const bulk = item.isOfType("shield") ? 0 : Math.max(heldOrStowedBulk.normal, 1);
    const materialValue = item.isSpecific ? 0 : materialPrice + (bulk * materialPrice) / 10;

    const runesData = getRuneValuationData(item);
    const reinforcingRuneValue =
        !item.isOfType("shield") || item.isSpecific
            ? 0
            : (RUNE_DATA.shield.reinforcing[item.system.runes.reinforcing]?.price ?? 0);
    const runeValue = item.isSpecific ? 0 : runesData.reduce((sum, rune) => sum + rune.price, 0) - reinforcingRuneValue;

    const basePrice = materialValue > 0 || runeValue > 0 ? new CoinsPF2e() : item.price.value;
    const gradeValue = item.isSpecific ? 0 : getGradeData(item).price;
    const afterMaterialAndRunes = runeValue
        ? new CoinsPF2e({ gp: runeValue + materialValue })
        : basePrice.plus({ gp: gradeValue + materialValue });
    const higher = afterMaterialAndRunes.copperValue > basePrice.copperValue ? afterMaterialAndRunes : basePrice;
    const afterReinforcingRune = higher.plus(new CoinsPF2e({ gp: reinforcingRuneValue }));
    const afterShoddy = item.isShoddy ? afterReinforcingRune.scale(0.5) : afterReinforcingRune;

    /** Increase the price if it is larger than medium and not magical. */
    return item.system.price.sizeSensitive ? afterShoddy.adjustForSize(item.size) : afterShoddy;
}

function computeLevelRarityPrice(item: PhysicalItemPF2e): { level: number; rarity: Rarity; price: CoinsPF2e } {
    // Stop here if this weapon is not a magical or precious-material item, or if it is a specific magic weapon
    const materialData = getMaterialValuationData(item);
    const price = computePrice(item);
    const gradeData = getGradeData(item);
    if (!(item.isMagical || materialData || gradeData.level) || item.isSpecific) {
        return { ...R.pick(item, ["level", "rarity"]), price };
    }

    const runesData = getRuneValuationData(item);
    const level = Math.max(...runesData.map((r) => r.level), materialData?.level ?? 0, gradeData.level, item.level);
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

/** Get price and level from starfinder grade. Returns 0 for non-SF2e weapons */
function getGradeData(item: PhysicalItemPF2e) {
    if (!item.isOfType("weapon", "armor", "shield") || item.system.grade === null) {
        return { level: 0, price: 0 };
    }

    const gradeData = item.isOfType("weapon")
        ? CONFIG.PF2E.weaponImprovements[item.system.grade]
        : item.isOfType("armor")
          ? CONFIG.PF2E.armorImprovements[item.system.grade]
          : CONFIG.PF2E.shieldImprovements[item.system.grade];
    const price = gradeData.credits / 10; // convert to gp
    return { level: gradeData?.level, price };
}

/**
 * Checks if a change in traits leads to the item converting to sf2e or pf2e.
 * If so, it prompts for confirmation, and allows the user to cancel.
 * @returns pf2e or sf2e based on the new traits, or `null` if no change is to be made.
 * @throws an error if the user does not make a selection
 */
async function checkPhysicalItemSystemChange(
    item: PhysicalItemPF2e,
    changed: DeepPartial<PhysicalItemSource>,
): Promise<"pf2e" | "sf2e" | null> {
    const newTraits: string[] | undefined = changed.system?.traits?.value;
    if (!item.isOfType("weapon", "armor", "shield") || !newTraits) return null;

    const sf2eTraits = ["tech", "analog"] as const;
    const beforeSF2eTraits = item._source.system.traits.value.filter((t) => tupleHasValue(sf2eTraits, t));
    const wasSF2e = !!beforeSF2eTraits.length;
    const becomingSF2e = newTraits.some((t) => tupleHasValue(sf2eTraits, t));
    const runes = item._source.system.runes;
    const hasPotency = "potency" in runes && runes.potency > 0;
    const hasRunes =
        hasPotency ||
        ("striking" in runes && runes.striking > 0) ||
        ("reinforcing" in runes && runes.reinforcing > 0) ||
        (hasPotency && "property" in runes && runes.property.length > 0);
    const hasGrade = item.system.grade && item.system.grade !== "commercial";
    if (wasSF2e === becomingSF2e || !(hasRunes || hasGrade)) return null;

    const key = `PF2E.Item.Physical.ChangeEquipmentSystem.${becomingSF2e ? "ToStarfinder" : "ToPathfinder"}`;
    const removedTrait = beforeSF2eTraits.find((t) => !newTraits.includes(t));
    const otherTrait = removedTrait === "tech" ? "analog" : "tech";
    const newTrait = newTraits.find((t) => tupleHasValue(sf2eTraits, t));
    const otherTraitLabel = otherTrait && game.i18n.localize(CONFIG.PF2E.equipmentTraits[otherTrait]);
    const result = await foundry.applications.api.DialogV2.wait({
        window: { title: "PF2E.Item.Physical.ChangeEquipmentSystem.Title" },
        position: { width: 400 },
        modal: true,
        content: game.i18n.format(key, {
            type: game.i18n.localize(`TYPES.Item.${item.type}`),
            newTrait: newTrait && game.i18n.localize(CONFIG.PF2E.equipmentTraits[newTrait]),
            removedTrait: removedTrait && game.i18n.localize(CONFIG.PF2E.equipmentTraits[removedTrait]),
            otherTrait: otherTraitLabel,
        }),
        buttons: [
            { action: "yes", label: "Yes", icon: "fa-solid fa-check", callback: () => true },
            !becomingSF2e && {
                action: "change",
                label: otherTraitLabel,
                icon: "fa-solid fa-robot",
            },
            { action: "no", label: "No", icon: "fa-solid fa-xmark", default: true, callback: () => false },
        ].filter(R.isTruthy),
    });

    if (!result) {
        item.render(); // tagify is optimistic, so we need to re-render
        throw Error;
    } else if (result === "change") {
        // If the change button is pressed, we are staying as sf2e but swapping the trait used
        // To the caller of this function, this is a no change
        newTraits.push(otherTrait);
        return null;
    }

    return becomingSF2e ? "sf2e" : "pf2e";
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

    const { runes, material, grade } = item.system;
    const baseLabel = baseType
        ? material.type && ["hide-armor", "steel-shield", "wooden-shield"].includes(baseType)
            ? game.i18n.localize(`TYPES.Item.${item.type}`)
            : game.i18n.localize(baseItemDictionary[baseType] ?? "")
        : item.name;
    const materialLabel = material.type && game.i18n.localize(CONFIG.PF2E.preciousMaterials[material.type]);

    if (grade && !AutomaticBonusProgression.isEnabled(item.actor)) {
        const params: Record<string, string | number | null> = {
            base: baseLabel,
            material: materialLabel,
            grade: game.i18n.localize(CONFIG.PF2E.grades[grade]),
        };

        const formatString = ["Grade", params.material && "Material"].filter(R.isTruthy).join("");
        return game.i18n.format(`PF2E.Item.Physical.GeneratedName.${formatString}`, params);
    } else {
        const potency = "potency" in runes ? runes.potency : null;
        const fundamental2 = "resilient" in runes ? runes.resilient : "striking" in runes ? runes.striking : null;
        const reinforcing =
            "reinforcing" in runes
                ? game.i18n.localize(REINFORCING_RUNE_LOC_PATHS[Number(runes.reinforcing)] ?? "") || null
                : null;
        const params: Record<string, string | number | null> = {
            base: baseLabel,
            material: materialLabel,
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
            const key = [potency, reinforcing, fundamental2, properties, material].filter(R.isTruthy).join("") || null;
            return key && game.i18n.localize(key);
        })();

        return formatString ? game.i18n.format(`PF2E.Item.Physical.GeneratedName.${formatString}`, params) : item.name;
    }
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
    const changedSource = item.clone(fu.deepClone(changed), { keepId: true }).toObject();
    const itemIndex = actorSource?.items.findIndex((i) => i._id === item._id);
    if (itemIndex === -1) return;
    actorSource?.items.splice(itemIndex ?? 0, 1, changedSource);
    const actorClone = actorSource ? new ActorProxyPF2e(actorSource) : null;
    const itemClone = actorClone?.inventory.get(item.id, { strict: true }) ?? item.clone(changed, { keepId: true });

    // Adjust current HP proportionally if max HP changed
    const maxHPDifference = itemClone.system.hp.max - item.system.hp.max;
    if (maxHPDifference !== 0) {
        changed.system = fu.mergeObject(changed.system ?? {}, {
            hp: { value: Math.max(item.system.hp.value + maxHPDifference, 0) },
        });
    }

    // Final overage check
    const newValue = changed.system?.hp?.value ?? itemClone.system.hp.value;
    if (newValue > itemClone.system.hp.max) {
        changed.system = fu.mergeObject(changed.system ?? {}, { hp: { value: itemClone.system.hp.max } });
    }
}

/** Add and adjust properties on an item's bulk data object */
function prepareBulkData<TItem extends PhysicalItemPF2e>(
    item: TItem,
): TItem extends ContainerPF2e ? ContainerBulkData : BulkData;
function prepareBulkData(item: PhysicalItemPF2e): BulkData | ContainerBulkData {
    const stackData = STACK_DEFINITIONS[item.system.stackGroup ?? ""] ?? null;
    const per = stackData?.size ?? 1;

    const sourceBulk = item._source.system.bulk;
    const heldOrStowed = item.isOfType("armor")
        ? new Bulk(sourceBulk.value).increment().value
        : "heldOrStowed" in sourceBulk
          ? Number(sourceBulk.heldOrStowed) || 0
          : sourceBulk.value;
    const worn = item.system.bulk.value;
    const value = !item.actor || item.isEquipped ? worn : heldOrStowed;
    const data = { heldOrStowed, value, per };

    return item.isOfType("backpack")
        ? { ...data, capacity: item.system.bulk.capacity, ignored: item.system.bulk.ignored }
        : data;
}

/** Clone an item, sizing it appropriately for the actor. For larger PCs, set the price's sensitity to false.  */
function sizeItemForActor<TItem extends PhysicalItemPF2e>(item: TItem, actor: ActorPF2e): TItem {
    if (item.isOfType("treasure") || !actor.isOfType("creature")) return item.clone();
    const actorSize = new ActorSizePF2e({
        value: actor.system.traits.naturalSize ?? actor.size,
        smallIsMedium: true,
    });
    const itemSize = actorSize.value;
    const sizeSensitive =
        actor.isOfType("character") && actorSize.isLargerThan("med") && !item.isMagical ? false : undefined;
    return itemSize === "med" ? item.clone() : item.clone({ system: { size: itemSize, price: { sizeSensitive } } });
}

/** Returns the default equip status for this item, called in order to "reset" the equip status */
function getDefaultEquipStatus(item: PhysicalItemPF2e): EquippedData {
    const equipStatus: EquippedData = { carryType: "worn" };
    const isSlottedItem = item.system.usage.type === "worn" && !!item.system.usage.where;
    if (isSlottedItem && item.actor?.isOfType("character")) {
        equipStatus.inSlot = false;
    }
    return equipStatus;
}

export { coinCompendiumIds } from "./coins.ts";
export {
    CoinsPF2e,
    checkPhysicalItemSystemChange,
    computeLevelRarityPrice,
    generateItemName,
    getDefaultEquipStatus,
    handleHPChange,
    prepareBulkData,
    sizeItemForActor,
};
