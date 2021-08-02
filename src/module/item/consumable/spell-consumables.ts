import type { ActorPF2e } from "@actor/index";
import { ConsumableData, ConsumableSource, SpellSource, TrickMagicItemCastData } from "@item/data";
import { ConsumablePF2e } from "@item/index";
import { calculateDC, DCOptions } from "@module/dc";
import { ErrorPF2e, tupleHasValue } from "@module/utils";

export enum SpellConsumableTypes {
    Scroll,
    Wand,
}

const scrollCompendiumIds = {
    1: "RjuupS9xyXDLgyIr",
    2: "Y7UD64foDbDMV9sx",
    3: "ZmefGBXGJF3CFDbn",
    4: "QSQZJ5BC3DeHv153",
    5: "tjLvRWklAylFhBHQ",
    6: "4sGIy77COooxhQuC",
    7: "fomEZZ4MxVVK3uVu",
    8: "iPki3yuoucnj7bIt",
    9: "cFHomF3tty8Wi1e5",
    10: "o1XIHJ4MJyroAHfF",
};

const wandCompendiumIds = {
    1: "UJWiN0K3jqVjxvKk",
    2: "vJZ49cgi8szuQXAD",
    3: "wrDmWkGxmwzYtfiA",
    4: "Sn7v9SsbEDMUIwrO",
    5: "5BF7zMnrPYzyigCs",
    6: "kiXh4SUWKr166ZeM",
    7: "nmXPj9zuMRQBNT60",
    8: "Qs8RgNH6thRPv2jt",
    9: "Fgv722039TVM5JTc",
};

function getIdForSpellConsumable(type: SpellConsumableTypes, heightenedLevel: number): string {
    if (type == SpellConsumableTypes.Scroll) {
        return scrollCompendiumIds[heightenedLevel];
    } else {
        return wandCompendiumIds[heightenedLevel];
    }
}

function getNameForSpellConsumable(type: SpellConsumableTypes, spellName: string, heightenedLevel: number): string {
    if (type == SpellConsumableTypes.Scroll) {
        return game.i18n.format("PF2E.ScrollFromSpell", { name: spellName, level: heightenedLevel });
    } else {
        return game.i18n.format("PF2E.WandFromSpell", { name: spellName, level: heightenedLevel });
    }
}

export async function createConsumableFromSpell(
    type: SpellConsumableTypes,
    spellData: SpellSource,
    heightenedLevel?: number
): Promise<ConsumableSource> {
    heightenedLevel = heightenedLevel ?? spellData.data.level.value;
    const pack = game.packs.find((p) => p.collection === "pf2e.equipment-srd");
    const itemId = getIdForSpellConsumable(type, heightenedLevel);
    const consumable = await pack?.getDocument(itemId);
    if (!(consumable instanceof ConsumablePF2e)) {
        throw ErrorPF2e("Failed to retrieve consumable item");
    }

    const consumableData = consumable.toObject();
    consumableData.data.traits.value.push(...spellData.data.traditions.value);
    consumableData.name = getNameForSpellConsumable(type, spellData.name, heightenedLevel);
    const description = consumableData.data.description.value;
    consumableData.data.description.value = `@Compendium[pf2e.spells-srd.${spellData._id}]{${spellData.name}}\n<hr/>${description}`;
    consumableData.data.spell = {
        data: duplicate(spellData),
        heightenedLevel: heightenedLevel,
    };
    return consumableData;
}

export function canCastConsumable(actor: ActorPF2e, item: ConsumableData): boolean {
    const spellData = item.data.spell?.data?.data;
    return (
        !!spellData &&
        actor.itemTypes.spellcastingEntry
            .map((entry) => entry.data)
            .filter((entryData) => ["prepared", "spontaneous"].includes(entryData.data.prepared.value))
            .some((entryData) => tupleHasValue(spellData.traditions.value, entryData.data.tradition.value))
    );
}

export interface TrickMagicItemDifficultyData {
    arc?: number;
    rel?: number;
    occ?: number;
    nat?: number;
}

const TraditionSkills = {
    arcane: "arc",
    divine: "rel",
    occult: "occ",
    primal: "nat",
};

export function calculateTrickMagicItemCheckDC(
    itemData: ConsumableData,
    options: DCOptions = { proficiencyWithoutLevel: false }
): TrickMagicItemDifficultyData {
    const level = Number(itemData.data.level.value);
    const saveDC = calculateDC(level, options);

    type RealTraditionKey = keyof ConfigPF2e["PF2E"]["spellTraditions"];
    const skills: [string, number][] = itemData.data.traits.value
        .filter((trait): trait is RealTraditionKey => trait in CONFIG.PF2E.spellTraditions)
        .map((tradition) => [TraditionSkills[tradition], saveDC]);

    return Object.fromEntries(skills);
}

export function calculateTrickMagicItemCastData(actor: ActorPF2e, skill: string): TrickMagicItemCastData {
    const highestMentalStat = (["int", "wis", "cha"] as const)
        .map((ability) => {
            return { stat: ability, mod: actor.getAbilityMod(ability) };
        })
        .reduce((highest, next) => {
            if (next.mod > highest.mod) {
                return next;
            } else {
                return highest;
            }
        }).stat;
    const spellDC =
        actor.data.data.details.level.value +
        Math.max(0, actor.data.data.skills[skill].rank - 2) * 2 +
        actor.getAbilityMod(highestMentalStat);
    return {
        ability: highestMentalStat,
        data: { spelldc: { value: spellDC, dc: spellDC + 10 } },
        _id: "",
    };
}
