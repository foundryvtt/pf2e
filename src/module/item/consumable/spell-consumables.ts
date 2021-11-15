import { ConsumableData, ConsumableSource, SpellSource } from "@item/data";
import { ConsumablePF2e } from "@item/index";
import { calculateDC, DCOptions } from "@module/dc";
import { ErrorPF2e } from "@util";

const scrollCompendiumIds: Record<number, string | undefined> = {
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

const wandCompendiumIds: Record<number, string | undefined> = {
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

function getIdForSpellConsumable(type: "scroll" | "wand", heightenedLevel: number): string | null {
    return type === "scroll"
        ? scrollCompendiumIds[heightenedLevel] ?? null
        : wandCompendiumIds[heightenedLevel] ?? null;
}

function getNameForSpellConsumable(type: "scroll" | "wand", spellName: string, heightenedLevel: number): string {
    if (type === "scroll") {
        return game.i18n.format("PF2E.ScrollFromSpell", { name: spellName, level: heightenedLevel });
    } else {
        return game.i18n.format("PF2E.WandFromSpell", { name: spellName, level: heightenedLevel });
    }
}

export async function createConsumableFromSpell(
    type: "scroll" | "wand",
    spellData: SpellSource,
    heightenedLevel?: number
): Promise<ConsumableSource> {
    heightenedLevel = heightenedLevel ?? spellData.data.level.value;
    const pack = game.packs.find((p) => p.collection === "pf2e.equipment-srd");
    const itemId = getIdForSpellConsumable(type, heightenedLevel);
    const consumable = await pack?.getDocument(itemId ?? "");
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

    type RealTraditionKey = keyof ConfigPF2e["PF2E"]["magicTraditions"];
    const skills: [string, number][] = itemData.data.traits.value
        .filter((trait): trait is RealTraditionKey => trait in CONFIG.PF2E.magicTraditions)
        .map((tradition) => [TraditionSkills[tradition], saveDC]);

    return Object.fromEntries(skills);
}
