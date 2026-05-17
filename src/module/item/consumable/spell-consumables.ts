import { ConsumablePF2e, ItemPF2e, type SpellPF2e } from "@item";
import { ConsumableSource } from "@item/base/data/index.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { traditionSkills } from "@item/spellcasting-entry/trick.ts";
import { DCOptions, calculateDC } from "@module/dc.ts";
import type { OneToTen } from "@module/data.ts";
import { ErrorPF2e, objectHasKey, setHasElement } from "@util";
import * as R from "remeda";

type SpellConsumableItemType = keyof ConfigPF2e["PF2E"]["spellcastingItems"];

function isSpellConsumableUUID(itemId: string): boolean {
    return Object.values(CONFIG.PF2E.spellcastingItems).some((c) => Object.values(c.compendiumUuids).includes(itemId));
}

/** Spell consumable categories available for this kind of spell in the current system. */
function spellConsumableCategoriesFor(spell: { isCantrip: boolean }): Partial<typeof CONFIG.PF2E.spellcastingItems> {
    return R.pickBy(CONFIG.PF2E.spellcastingItems, (c) => !!c?.cantripsOnly === spell.isCantrip);
}

async function createConsumableFromSpell(
    spell: SpellPF2e,
    {
        type,
        rank = spell.baseRank,
        mystified = false,
    }: {
        type: SpellConsumableItemType;
        rank?: OneToTen;
        mystified?: boolean;
    },
): Promise<ConsumableSource> {
    const data = objectHasKey(CONFIG.PF2E.spellcastingItems, type) ? CONFIG.PF2E.spellcastingItems[type] : null;
    const uuid = data?.compendiumUuids[rank] ?? null;
    const consumable = uuid ? await fromUuid<ItemPF2e>(uuid) : null;
    if (!consumable?.isOfType("consumable")) {
        throw ErrorPF2e("Failed to retrieve consumable item");
    }

    const consumableSource = { ...consumable.toObject(), _id: null }; // Clear _id

    const traits = consumableSource.system.traits;
    traits.value = R.unique([...traits.value, ...spell.system.traits.value]);
    traits.rarity = spell.rarity;
    if (traits.value.includes("magical") && traits.value.some((t) => setHasElement(MAGIC_TRADITIONS, t))) {
        traits.value.splice(traits.value.indexOf("magical"), 1);
    }
    traits.value.sort();

    consumableSource.name = data?.nameTemplate
        ? _loc(data.nameTemplate, { name: spell.name, level: rank })
        : `${type} of ${spell.name} (Rank ${rank})`;
    const description = consumableSource.system.description.value;

    consumableSource.system.description.value = (() => {
        const paragraphElement = document.createElement("p");
        paragraphElement.append(spell.sourceId ? `@UUID[${spell.sourceId}]{${spell.name}}` : spell.description);

        const containerElement = document.createElement("div");
        const hrElement = document.createElement("hr");
        containerElement.append(paragraphElement, hrElement);
        hrElement.insertAdjacentHTML("afterend", description);

        return containerElement.innerHTML;
    })();

    // Cantrip-only categories (e.g. cantrip deck) aren't single-spell consumables — skip embedding.
    if (!data?.cantripsOnly) {
        consumableSource.system.spell = fu.mergeObject(
            spell._source,
            { _id: fu.randomID(), system: { location: { value: null, heightenedLevel: rank } } },
            { inplace: false },
        );
    }

    if (mystified) {
        consumableSource.system.identification.status = "unidentified";
    }

    return consumableSource;
}

interface TrickMagicItemDifficultyData {
    arcana?: number;
    religion?: number;
    occultism?: number;
    nature?: number;
}

function calculateTrickMagicItemCheckDC(
    item: ConsumablePF2e,
    options: DCOptions = { pwol: false },
): TrickMagicItemDifficultyData {
    const level = Number(item.level);
    const saveDC = calculateDC(level, options);

    const traditions = item.system.spell?.system.traits.traditions ?? [];
    const skills: [string, number][] = [...item.system.traits.value, ...traditions]
        .filter((t): t is MagicTradition => setHasElement(MAGIC_TRADITIONS, t))
        .map((tradition) => [traditionSkills[tradition], saveDC]);

    return Object.fromEntries(skills);
}

export {
    calculateTrickMagicItemCheckDC,
    createConsumableFromSpell,
    isSpellConsumableUUID,
    spellConsumableCategoriesFor,
};
export type { SpellConsumableItemType, TrickMagicItemDifficultyData };
